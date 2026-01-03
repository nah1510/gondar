"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal, ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function MBSyncPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<{ level: string; message: string }[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [password, setPassword] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (session && !session.user?.is_super_admin) {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const startSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (syncing) return;
    
    if (!password) {
      setLogs([{ level: "error", message: "LỖI: Cần cung cấp mật khẩu mở file PDF sao kê!" }]);
      return;
    }

    setSyncing(true);
    setLogs([{ level: "info", message: "Đang khởi tạo kết nối..." }]);

    try {
      const response = await fetch("/api/mb-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        let errorMsg = `Lỗi HTTP: ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch(e){}
        setLogs(prev => [...prev, { level: "error", message: errorMsg }]);
        setSyncing(false);
        return;
      }

      if (!response.body) {
        setLogs(prev => [...prev, { level: "error", message: "Không nhận được phản hồi stream" }]);
        setSyncing(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr === '[DONE]') {
              setSyncing(false);
              return;
            }
            try {
              const logData = JSON.parse(dataStr);
              setLogs(prev => [...prev, logData]);
            } catch (e) {
              console.error("Error parsing stream data:", e);
            }
          }
        }
      }
    } catch (error: unknown) {
      setLogs(prev => [...prev, { level: "error", message: `Lỗi kết nối: ${error instanceof Error ? error.message : String(error)}` }]);
    }
    setSyncing(false);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-jet-black flex items-center justify-center p-4 selection:bg-neon-green selection:text-black relative">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(57,255,20,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none"></div>

      <div className="z-10 w-full max-w-3xl">
        <div className="rounded-xl border border-neon-green/30 bg-terminal-bg shadow-[0_0_15px_rgba(57,255,20,0.1)] backdrop-blur-md overflow-hidden flex flex-col h-[80vh]">
          
          <div className="flex items-center justify-between px-4 py-2 border-b border-neon-green/30 bg-black/40 shrink-0">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-80 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </div>
            <div className="text-xs text-neon-green/70 font-mono flex items-center">
              <Terminal size={12} className="mr-1" />
              mb_sync_module.exe
            </div>
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-xs text-gray-400 hover:text-white font-mono flex items-center transition-colors"
            >
              <ArrowLeft size={12} className="mr-1" />
              QUAY LẠI
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-sm space-y-2 bg-black/60 relative hacker-scrollbar">
            <div className="text-gray-400 mb-6 border-b border-white/10 pb-4">
              <p className="text-neon-cyan font-bold mb-1">=== MB BANK SYNC INTERFACE ===</p>
              <p>Môi trường quét Gmail tự động. Hệ thống sẽ tự tải file PDF sao kê và giải mã.</p>
              <p className="mt-2 text-yellow-500/80 text-xs">⚠️ Yêu cầu: Tài khoản đã cấp quyền truy cập Gmail.</p>
            </div>

            {logs.map((log, i) => (
              <div key={i} className="flex">
                <span className="text-gray-500 mr-3 shrink-0">[{new Date().toLocaleTimeString('vi-VN')}]</span>
                <span className={`whitespace-pre-wrap ${
                  log.level === 'error' ? 'text-red-400 font-bold' : 
                  log.level === 'success' ? 'text-neon-green font-bold' : 
                  log.level === 'warning' ? 'text-yellow-400' : 'text-gray-300'
                }`} dangerouslySetInnerHTML={{ __html: log.message }}>
                </span>
              </div>
            ))}
            
            {syncing && (
              <div className="flex items-center text-neon-cyan/70 mt-4 animate-pulse">
                <span className="mr-2">_Đang xử lý</span>
                <span className="flex space-x-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                </span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>

          <div className="p-4 border-t border-neon-green/30 bg-black/40 shrink-0">
            <form onSubmit={startSync} className="flex items-center space-x-3">
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mật khẩu file PDF..."
                disabled={syncing}
                className="flex-1 bg-black/50 border border-neon-green/30 rounded px-4 py-3 text-neon-green font-mono text-sm focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green disabled:opacity-50 placeholder-neon-green/30"
              />
              <button
                type="submit"
                disabled={syncing || !password}
                className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 shrink-0 rounded border font-mono font-bold transition-all ${
                  syncing || !password
                    ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-neon-green/10 text-neon-green border-neon-green hover:bg-neon-green hover:text-black hover:shadow-[0_0_15px_rgba(57,255,20,0.5)]'
                }`}
              >
                <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{syncing ? 'ĐANG XỬ LÝ...' : 'BẮT ĐẦU'}</span>
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
