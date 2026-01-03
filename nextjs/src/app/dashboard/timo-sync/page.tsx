"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal, Play, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TimoSyncPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<{ level: string; message: string }[]>([]);
  const [syncing, setSyncing] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const startSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setLogs([]);

    const eventSource = new EventSource('/api/timo-sync');
    
    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        setSyncing(false);
        return;
      }
      
      try {
        const data = JSON.parse(event.data);
        setLogs(prev => [...prev, data]);
      } catch (e) {
        console.error("Parse error", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error", error);
      eventSource.close();
      setSyncing(false);
      setLogs(prev => [...prev, { level: 'error', message: 'Mất kết nối với máy chủ đồng bộ hoặc xảy ra lỗi (SSE Error).' }]);
    };
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
          
          <div className="flex items-center justify-between px-4 py-2 border-b border-neon-green/30 bg-black/40">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-80 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </div>
            <div className="text-xs text-neon-green/70 font-mono flex items-center">
              <Terminal size={12} className="mr-1" />
              timo_sync_module.exe
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
              <p className="text-neon-cyan font-bold mb-1">=== TIMO SYNC INTERFACE ===</p>
              <p>Môi trường phân tích giao dịch tự động. Sẵn sàng kết nối tới máy chủ Timo và API Google Sheets.</p>
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

          <div className="p-4 border-t border-neon-green/30 bg-black/40">
            <button
              onClick={startSync}
              disabled={syncing}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded border font-mono font-bold transition-all ${
                syncing 
                  ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-neon-green/10 text-neon-green border-neon-green hover:bg-neon-green hover:text-black hover:shadow-[0_0_15px_rgba(57,255,20,0.5)]'
              }`}
            >
              <Play size={18} fill={syncing ? "none" : "currentColor"} />
              <span>{syncing ? 'ĐANG ĐỒNG BỘ...' : 'BẮT ĐẦU ĐỒNG BỘ'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
