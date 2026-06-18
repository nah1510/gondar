import { google } from "googleapis";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { CategoryLabels } from "@/lib/constants";

function formatGoFloat(n: number): string {
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs >= 1e6 || abs < 1e-4) {
    const expStr = n.toExponential();
    const [base, exp] = expStr.split('e');
    const expSign = exp[0];
    let expNum = exp.substring(1);
    if (expNum.length === 1) expNum = "0" + expNum;
    return base + 'e' + expSign + expNum;
  }
  return n.toString();
}

export interface TimoTxn {
  txnTitle?: string;
  txnDesc?: string;
  txnAmount?: number;
  remainingAmount?: number;
  note?: string;
}

export function getHash(item: TimoTxn): string {
  const txnTitle = item.txnTitle || "";
  const txnDesc = item.txnDesc || "";
  const txnAmount = formatGoFloat(item.txnAmount || 0);
  const remainingAmount = formatGoFloat(item.remainingAmount || 0);

  const str = `${txnTitle}${txnDesc}${txnAmount}${remainingAmount}`;
  let jsonStr = JSON.stringify(str);
  jsonStr = jsonStr.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

export async function syncTimoTransactions(sendLog?: (level: string, message: string) => Promise<void>) {
  const log = async (level: string, msg: string) => {
    if (sendLog) await sendLog(level, msg);
    else console.log(`[Timo Sync] ${level.toUpperCase()}: ${msg}`);
  };

  await log("info", "🔄 Bắt đầu tiến trình đồng bộ dữ liệu...");
  await log("info", "📡 Đang kết nối tới ngân hàng Timo và Google Sheets...");

  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // 1. Tải hash hiện tại
  const hashResp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Hash!A:A",
  });
  
  const existingHashes = new Set<string>();
  if (hashResp.data.values) {
    hashResp.data.values.forEach(row => {
      if (row[0]) existingHashes.add(row[0]);
    });
  }
  
  await log("info", `Đã tải thành công ${existingHashes.size} mã Hash hiện có.`);

  // 2. Lấy dữ liệu Timo
  const timoResp = await fetch(process.env.TIMO_API_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    body: JSON.stringify({
      size: 20,
      xidIndex: 0,
      hashVerifyCode: process.env.TIMO_HASH_VERIFY_CODE,
      lang: "EN",
      securityCode: process.env.TIMO_SECURITY_CODE,
    })
  });

  if (!timoResp.ok) {
    throw new Error(`Lỗi gọi API Timo: ${timoResp.status}`);
  }

  const timoData = await timoResp.json();
  if (!timoData.success) {
    throw new Error(`API Timo trả về lỗi (Code: ${timoData.code})`);
  }

  await log("success", "✅ Đã lấy dữ liệu thành công. Bắt đầu đối chiếu giao dịch...");

  // 3. Phân tích Business Logic
  const histories = timoData.data.txnHistories || [];
  histories.reverse();

  const newTxns: { item: TimoTxn & { txnAmount: number; txnTitle: string }; date: string; hash: string; type: string; isIncome: boolean; desc: string }[] = [];
  let newTxnSummary = "";

  for (const history of histories) {
    let date = history.dispDate;
    if (date === "Today") {
      date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()); 
    } else if (date === "Yesterday") {
      const y = new Date(Date.now() - 86400000);
      date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(y);
    }

    const items = history.item || [];
    items.reverse();

    for (const item of items) {
      const hash = getHash(item);
      if (existingHashes.has(hash)) {
        continue;
      }

      const desc = item.note || item.txnDesc;
      const isIncome = (item.txnAmount || 0) > 0;
      const txnType = isIncome ? "Thu nhập" : "Chi tiêu";

      newTxns.push({ item: { ...item, txnAmount: item.txnAmount || 0, txnTitle: item.txnTitle || "" }, date, hash, type: txnType, isIncome, desc: desc || "" });
      existingHashes.add(hash); 
    }
  }

  const categoryMappings = await prisma.categoryMapping.findMany();
  const detectCategory = (desc: string) => {
    const dLow = desc.toLowerCase();
    for (const mapping of categoryMappings) {
      if (dLow.startsWith(mapping.keyword.toLowerCase())) {
        return CategoryLabels[mapping.category];
      }
    }
    return ""; // Mặc định để trống nếu không có trong DB
  };

  if (newTxns.length === 0) {
    await log("info", "💤 Không có giao dịch mới nào kể từ lần đồng bộ trước.");
    return { status: "no_new_txns" };
  }

  // 4. Chuẩn bị Batch Update
  const batchHashes: string[][] = [];
  const batchIncomes: (string | number)[][] = [];
  const batchSpendings: (string | number)[][] = [];

  for (const tx of newTxns) {
    await log("success", `✨ Phát hiện giao dịch mới: ${tx.item.txnTitle} (${Math.abs(tx.item.txnAmount)} VND)`);
    
    batchHashes.push([tx.hash]);

    if (tx.isIncome) {
      batchIncomes.push([
        tx.date,
        tx.item.txnAmount,
        tx.desc,
        "Lương"
      ]);
    } else {
      batchSpendings.push([
        tx.date,
        Math.abs(tx.item.txnAmount),
        tx.desc,
        "Timo",
        detectCategory(tx.desc)
      ]);
    }

    newTxnSummary += `• <b>Ngày:</b> ${tx.date}\n• <b>Loại:</b> ${tx.type}\n• <b>Số tiền:</b> <code>${tx.item.txnAmount.toFixed(2)}</code>\n• <b>Mô tả:</b> ${tx.item.txnTitle} - ${tx.desc}\n\n`;
  }

  // 5. Ghi Batch vào Google Sheets
  await log("info", "Bắt đầu Batch Update vào Google Sheets...");

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
    await log("success", `   ➜ Đã ghi thành công ${batchSpendings.length} dòng Chi Tiêu`);
  }

  if (batchIncomes.length > 0) {
    const incResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Giao dịch!H:H" });
    const nextIncRow = (incResp.data.values?.length || 0) + 1;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `Giao dịch!H${nextIncRow}:K${nextIncRow + batchIncomes.length - 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: batchIncomes }
    });
    await log("success", `   ➜ Đã ghi thành công ${batchIncomes.length} dòng Thu Nhập`);
  }

  // 6. Gửi Telegram
  await log("info", "📱 Đang gửi thông báo tổng hợp qua Telegram...");
  const telegramMsg = `<b>Timo Sheet Update</b>\n━━━━━━━━━━━━━━\n• <b>Cập nhật:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n\n<b>Chi tiết:</b>\n${newTxnSummary}`;
  
  const tgResp = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: telegramMsg,
      parse_mode: "HTML"
    })
  });

  if (!tgResp.ok) {
    await log("warning", "⚠️ Đã đồng bộ nhưng không thể gửi thông báo Telegram");
  }

  await log("success", `🎉 Hoàn tất! Đã đồng bộ thành công ${newTxns.length} giao dịch mới.`);
  return { status: "success", count: newTxns.length };
}
