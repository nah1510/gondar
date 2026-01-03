@echo off
title TIMO SYNC - Local Server
color 0A

cd /d "d:\Projects\timo-transaction-sync"

echo ===================================================
echo   DANG KHOI DONG MAY CHU THU NGHIEM (NEXT.JS)
echo ===================================================
echo.
echo Dang khoi tao server tai cong 3000, vui long cho...

:: Xóa log cũ nếu có
if exist server.log del server.log

:: Khởi chạy make next ngầm và ghi đè vào file log
start /B cmd /c "make next > server.log 2>&1"

:: Vòng lặp ping liên tục bằng curl
:waitloop
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 >nul
    goto waitloop
)

echo.
echo [OK] Server da san sang!
echo Tu dong mo trinh duyet...
start "" "http://localhost:3000"

echo.
echo ===================================================
echo   XEM TRUC TIEP LOG HE THONG (Nhan Ctrl+C de tat)
echo ===================================================
echo.

:: Xem log trực tiếp (tương tự tail -f trên Linux)
powershell -Command "Get-Content server.log -Wait"
