"use client";

import { signOut, useSession } from "next-auth/react";
import { Terminal, ShieldCheck, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-jet-black flex items-center justify-center p-4 selection:bg-neon-green selection:text-black relative">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(57,255,20,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none"></div>

      <div className="z-10 w-full max-w-2xl">
        <div className="rounded-xl border border-neon-green/30 bg-terminal-bg shadow-[0_0_15px_rgba(57,255,20,0.1)] backdrop-blur-md overflow-hidden">
          
          <div className="flex items-center justify-between px-4 py-2 border-b border-neon-green/30 bg-black/40">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-80 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </div>
            <div className="text-xs text-neon-green/70 font-mono flex items-center">
              <Terminal size={12} className="mr-1" />
              dashboard.sh
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-xs text-gray-400 hover:text-red-400 font-mono flex items-center"
            >
              <LogOut size={12} className="mr-1" />
              ĐĂNG XUẤT
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-center space-x-4 border-b border-neon-green/20 pb-4">
              <ShieldCheck size={32} className="text-neon-green" />
              <div>
                <h2 className="text-xl font-mono font-bold text-white">BẢNG ĐIỀU KHIỂN HỆ THỐNG</h2>
                <p className="text-sm text-neon-green/80 font-mono">
                  Xin chào, {session?.user?.name || session?.user?.email}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Timo Sync Card */}
              <div 
                onClick={() => router.push('/dashboard/timo-sync')}
                className="p-4 border border-white/10 rounded bg-white/5 hover:border-neon-green/50 transition-colors cursor-pointer group"
              >
                <h3 className="text-white font-mono font-bold mb-2 group-hover:text-neon-green transition-colors">Module Đồng bộ Timo</h3>
                <p className="text-sm text-gray-400 font-sans">Đồng bộ dữ liệu giao dịch ngân hàng Timo tự động.</p>
              </div>

              {/* MB Sync Card */}
              {session?.user?.is_super_admin && (
                <div 
                  onClick={() => router.push('/dashboard/mb-sync')}
                  className="p-4 border border-white/10 rounded bg-white/5 hover:border-neon-green/50 transition-colors cursor-pointer group"
                >
                  <h3 className="text-white font-mono font-bold mb-2 group-hover:text-neon-green transition-colors">Module Sao kê MB Bank</h3>
                  <p className="text-sm text-gray-400 font-sans">Tự động tải sao kê từ Gmail, giải mã PDF và đồng bộ Google Sheet.</p>
                </div>
              )}
              
              {/* Family Tree Card */}
              <div className="p-4 border border-white/10 rounded bg-white/5 hover:border-neon-green/50 transition-colors cursor-pointer group">
                <h3 className="text-white font-mono font-bold mb-2 group-hover:text-neon-green transition-colors">Danh bạ Gia đình</h3>
                <p className="text-sm text-gray-400 font-sans">Quản lý và xem danh bạ thông tin gia đình.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-neon-green/20">
              <p className="text-xs text-gray-500 font-mono">
                Trạng thái hệ thống: ONLINE | Vai trò: {
                  session?.user?.is_super_admin 
                    ? <span className="text-red-500 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">SUPER_ADMIN</span>
                    : (session?.user?.roles?.join(", ") || "GUEST")
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
