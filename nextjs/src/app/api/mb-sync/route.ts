import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CategoryLabels, parseCategoryShortcode } from "@/lib/constants";
import { google } from "googleapis";
import prisma from "@/lib/prisma";
import { parseMbStatement, ParsedTransaction } from "@/lib/mb-parser";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;
  if (!user.is_super_admin) {
    return NextResponse.json({ error: "Forbidden: Only super admin can run this sync" }, { status: 403 });
  }

  const { password, month } = await req.json();

  if (!password) {
    return NextResponse.json({ error: "Yêu cầu cung cấp mật khẩu file sao kê" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendLog = async (level: string, message: string) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ level, message })}\n\n`));
  };

  const closeStream = async () => {
    await writer.write(encoder.encode(`data: [DONE]\n\n`));
    await writer.close();
  };

  (async () => {
    try {
      await sendLog("info", "🔄 Bắt đầu tiến trình đồng bộ MB Bank...");

      // 1. Get OAuth token from DB
      const account = await prisma.account.findFirst({
        where: { userId: user.id, provider: "google" }
      });

      if (!account || !account.access_token) {
        throw new Error("Không tìm thấy kết nối Google. Vui lòng đăng nhập lại và cấp quyền truy cập Gmail.");
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      const sheets = google.sheets({ version: "v4", auth: oauth2Client });

      await sendLog("info", "📡 Đang kết nối Gmail để tìm email sao kê...");

      // Increase maxResults to fetch more emails
      const query = `from:saokethe@mbbank.com.vn has:attachment`;
      const res = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 10 // Get up to 10 recent emails
      });

      if (!res.data.messages || res.data.messages.length === 0) {
        throw new Error("Không tìm thấy email sao kê MB Bank nào trong hộp thư.");
      }

      // 4. Lấy hash hiện tại từ Google Sheets TRƯỚC để biết email nào đã sync
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const hashResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Hash!A:A",
      });
      
      const existingHashes = new Set<string>();
      if (hashResp.data.values) {
        hashResp.data.values.forEach(row => {
          if (row[0]) {
            const val = row[0] as string;
            const hashPart = val.split(" | ")[0].trim();
            existingHashes.add(hashPart);
          }
        });
      }

      // Lấy danh sách quy tắc phân loại từ DB
      const categoryMappings = await prisma.categoryMapping.findMany();

      const pdfsToProcess: { buffer: Buffer, msgId: string, emailDateStr: string, filename: string }[] = [];

      for (const msg of res.data.messages) {
        if (existingHashes.has(`MSG_${msg.id}`)) {
          continue;
        }

        const fullMsg = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
        });

        // Find PDF attachment
        const parts = fullMsg.data.payload?.parts || [];
        const attachmentPart = parts.find(p => p.filename?.toLowerCase().endsWith(".pdf"));

        if (attachmentPart && attachmentPart.body?.attachmentId) {
          const attachRes = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: msg.id!,
            id: attachmentPart.body.attachmentId,
          });

          if (attachRes.data.data) {
            const pdfBuffer = Buffer.from(attachRes.data.data, 'base64');
            const dateHeader = fullMsg.data.payload?.headers?.find(h => h.name === 'Date');
            const emailDateStr = dateHeader ? dateHeader.value! : "Unknown Date";
            pdfsToProcess.push({
                buffer: pdfBuffer,
                msgId: msg.id!,
                emailDateStr,
                filename: attachmentPart.filename || "statement.pdf"
            });
            await sendLog("info", `Đã tải file sao kê: ${attachmentPart.filename} (từ email ngày ${emailDateStr})`);
          }
        }
      }

      if (pdfsToProcess.length === 0) {
        await sendLog("info", "💤 Không có email sao kê MB Bank nào MỚI. Tất cả đều đã được đồng bộ.");
        await closeStream();
        return;
      }

      const batchHashes: string[][] = [];
      const batchSpendings: (string | number)[][] = [];
      const batchIncomes: (string | number)[][] = [];
      const skippedIncomes: ParsedTransaction[] = [];
      let newTxnCount = 0;

      for (const pdfItem of pdfsToProcess) {
          await sendLog("info", `Bắt đầu giải mã file: ${pdfItem.filename}...`);
          const { cardType, transactions } = await parseMbStatement(pdfItem.buffer, password);
          await sendLog("success", `✅ Đã giải mã thành công file thẻ ${cardType}. Tìm thấy ${transactions.length} dòng giao dịch.`);

          batchHashes.push([`MSG_${pdfItem.msgId} | ${pdfItem.emailDateStr}`]);

          // Hàm phân loại tự động dựa trên DB
          const detectCategory = (desc: string) => {
            const dLow = desc.toLowerCase();
            for (const mapping of categoryMappings) {
              if (dLow.includes(mapping.keyword.toLowerCase())) {
                return CategoryLabels[mapping.category];
              }
            }
            return ""; // Mặc định để trống nếu không có trong DB
          };

          for (const tx of transactions) {
            if (existingHashes.has(tx.hash)) continue;
            
            existingHashes.add(tx.hash);
            batchHashes.push([tx.hash]);
            newTxnCount++;

            const parsed = parseCategoryShortcode(tx.description);
            const cleanDesc = parsed.cleanDesc;
            const forcedCategory = parsed.category ? CategoryLabels[parsed.category] : null;

            // Optional: update tx.description so telegram notification is clean too
            tx.description = cleanDesc;

            if (tx.isIncome) {
              // Bỏ qua các khoản + tiền (thanh toán dư nợ thẻ) vì đây không phải là Thu nhập
              skippedIncomes.push(tx);
            } else {
              batchSpendings.push([
                tx.date,
                Math.abs(tx.amount),
                cleanDesc,
                cardType, // MB Mastercard, MB JCB, or MB VISA
                forcedCategory || detectCategory(cleanDesc)
              ]);
            }
          }
      }

      if (newTxnCount === 0) {
        // We still need to record the MSG_ hashes so we don't process these emails again
        if (batchHashes.length > 0) {
            await sheets.spreadsheets.values.append({
              spreadsheetId,
              range: "Hash!A:A",
              valueInputOption: "USER_ENTERED",
              requestBody: { values: batchHashes }
            });
        }
        await sendLog("info", "💤 Tất cả giao dịch đã được đồng bộ trước đó. Không có dữ liệu mới.");
        await closeStream();
        return;
      }

      await sendLog("info", `Chuẩn bị ghi ${newTxnCount} giao dịch mới vào Google Sheets...`);

      if (batchHashes.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "Hash!A:A",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: batchHashes }
        });
      }

      if (batchSpendings.length > 0) {
        const spendResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Giao dịch!B:B" });
        const nextSpendRow = (spendResp.data.values?.length || 0) + 1;
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `Giao dịch!B${nextSpendRow}:F${nextSpendRow + batchSpendings.length - 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: batchSpendings }
        });
        await sendLog("success", `   ➜ Đã ghi thành công ${batchSpendings.length} dòng Chi Tiêu`);
      }

      if (skippedIncomes.length > 0) {
        await sendLog("warning", `⚠️ Đã bỏ qua ${skippedIncomes.length} dòng giao dịch cộng tiền (+).`);
        await sendLog("info", `📌 LƯU Ý: Các giao dịch này có khả năng là giao dịch hoàn tiền (Refund), vui lòng kiểm tra lại sao kê. Danh sách:`);
        for (const skipped of skippedIncomes) {
          await sendLog("info", `- ${skipped.date}: ${skipped.description} (+${skipped.amount.toLocaleString()})`);
        }
      }

      // Gửi Telegram
      await sendLog("info", "📱 Đang gửi thông báo tổng hợp qua Telegram...");
      let telegramMsg = `<b>MB Bank Statement Update</b>\n━━━━━━━━━━━━━━\n• <b>Cập nhật:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n\n`;
      telegramMsg += `<b>Đã ghi nhận:</b> ${batchSpendings.length} giao dịch chi tiêu.\n`;
      if (skippedIncomes.length > 0) {
        telegramMsg += `<b>Đã bỏ qua:</b> ${skippedIncomes.length} giao dịch cộng tiền (vui lòng kiểm tra xem có phải Hoàn tiền không):\n`;
        for (const skipped of skippedIncomes) {
          telegramMsg += `  - ${skipped.date}: ${skipped.description} (+${skipped.amount.toLocaleString()})\n`;
        }
      }
      
      try {
        const tgResp = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: telegramMsg,
            parse_mode: 'HTML'
          })
        });
        if (!tgResp.ok) {
          await sendLog("warning", "⚠️ Đã đồng bộ nhưng không thể gửi thông báo Telegram");
        } else {
          await sendLog("success", "✅ Đã gửi thông báo Telegram thành công");
        }
      } catch (e) {
        await sendLog("warning", "⚠️ Lỗi khi gửi thông báo Telegram");
      }

      await sendLog("success", `🎉 Hoàn tất! Đã đồng bộ thành công ${newTxnCount} giao dịch mới.`);
      
    } catch (e: unknown) {
      console.error(e);
      await sendLog("error", `❌ Lỗi hệ thống: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      await closeStream();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
