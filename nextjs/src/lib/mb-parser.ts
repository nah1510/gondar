export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  isIncome: boolean;
  hash: string;
}

export async function parseMbStatement(
  pdfBuffer: Buffer,
  password?: string
): Promise<{ cardType: string; transactions: ParsedTransaction[] }> {
  try {
    const pdfLibName = "pdf-parse-debugging-disabled";

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require(pdfLibName);

    // Pass an object to pdf() so PDF.js can receive the password
    const pdfArg = password ? { data: pdfBuffer, password } : pdfBuffer;
    const data = await pdf(pdfArg);
    
    const text = data.text;
    
    // Attempt to detect card type
    let cardType = "MB Bank";
    if (text.toLowerCase().includes("mastercard")) cardType = "MB Mastercard";
    else if (text.toLowerCase().includes("jcb")) cardType = "MB JCB";
    else if (text.toLowerCase().includes("visa")) cardType = "MB VISA";

    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n');
    
    let currentTx: { date: string, desc: string } | null = null;
    
    // Regex for 3 amounts (MB JCB format, often smushed together without spaces)
    const amountsRegex3 = /([-+]?[\d,]+\.\d{2})\s*([\d,]+\.\d{2})\s*([-+]?[\d,]+\.\d{2})$/;
    // Regex for 1 amount (Standard format, requires space before amount to avoid false positives)
    const amountsRegex1 = /\s+([-+]?[\d,]+(?:\.\d+)?)$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Stop parsing if we hit the end notes to prevent false positives
      if (trimmed.includes("LƯU Ý") || trimmed.includes("NOTES:") || trimmed.includes("CÁC HÌNH THỨC THANH TOÁN")) {
          break;
      }

      // Check if line starts with a Date (DD/MM/YY or DD/MM/YYYY)
      // MB JCB often has two dates smushed: 22/05/2622/05/26
      const startMatch = trimmed.match(/^(\d{2}\/\d{2}\/(?:\d{2}|\d{4}))\s*(?:\d{2}\/\d{2}\/(?:\d{2}|\d{4}))?\s*(.*)$/);
      if (startMatch) {
        currentTx = {
            date: startMatch[1],
            desc: startMatch[2]
        };
      } else if (currentTx) {
        // If the line didn't start with a date, it's a continuation of the previous transaction
        currentTx.desc += " " + trimmed;
      }
      
      if (currentTx) {
          let amountStr: string | null = null;
          
          const match3 = currentTx.desc.match(amountsRegex3);
          if (match3) {
              amountStr = match3[3]; // The payment amount is the 3rd one
              currentTx.desc = currentTx.desc.replace(amountsRegex3, '').trim();
          } else {
              const match1 = currentTx.desc.match(amountsRegex1);
              if (match1) {
                  amountStr = match1[1];
                  currentTx.desc = currentTx.desc.replace(amountsRegex1, '').trim();
              }
          }
          
          if (amountStr) {
              // Determine Income/Expense
              let isIncome = false;
              if (amountStr.startsWith('+')) isIncome = true;
              else if (amountStr.startsWith('-')) isIncome = false;
              else {
                  // Fallback
                  const dLow = currentTx.desc.toLowerCase();
                  if (dLow.includes("thanh toan") || dLow.includes("thu no") || dLow.includes("payment")) {
                      isIncome = true;
                  }
              }
              
              const amountVal = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
              
              // Normalize date to DD/MM/YYYY
              const [d, m, rawY] = currentTx.date.split('/');
              const y = rawY.length === 2 ? '20' + rawY : rawY;
              const fullDate = `${d}/${m}/${y}`;
              
              // Generate Hash
              const hash = Buffer.from(`${fullDate}-${currentTx.desc}-${amountStr}`).toString('base64');
              
              transactions.push({
                  date: fullDate,
                  description: currentTx.desc.replace(/^Posting Date\s*/i, '').trim(),
                  amount: Math.abs(amountVal),
                  isIncome,
                  hash
              });
              
              // Transaction complete, reset state
              currentTx = null;
          }
      }
    }

    return { cardType, transactions };
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'PasswordException' || error.message.includes('Password'))) {
      throw new Error("Sai mật khẩu hoặc file PDF yêu cầu mật khẩu.");
    }
    throw new Error(`Lỗi đọc file PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}
