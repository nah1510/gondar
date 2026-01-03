"use client";

import { Terminal, Lock, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-jet-black flex items-center justify-center p-4 selection:bg-neon-green selection:text-black relative">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(57,255,20,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none"></div>

      <div className="z-10 w-full max-w-md">
        <div className="rounded-xl border border-yellow-500/30 bg-terminal-bg shadow-[0_0_15px_rgba(234,179,8,0.1)] backdrop-blur-md overflow-hidden">
          
          <div className="flex items-center justify-between px-4 py-2 border-b border-yellow-500/30 bg-black/40">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-80"></div>
            </div>
            <div className="text-xs text-yellow-500/70 font-mono flex items-center">
              <Terminal size={12} className="mr-1" />
              access_control.sh
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-xs text-gray-400 hover:text-red-400 font-mono flex items-center"
            >
              <LogOut size={12} className="mr-1" />
              ĐĂNG XUẤT
            </button>
          </div>

          <div className="p-8 text-center space-y-6">
            <div className="flex justify-center text-yellow-500 mb-2">
              <Lock size={48} className="animate-pulse" />
            </div>
            
            <div>
              <h2 className="text-xl font-mono font-bold text-white mb-2">ĐANG CHỜ CẤP QUYỀN</h2>
              <p className="text-sm text-gray-400 font-mono leading-relaxed">
                Tài khoản của bạn đã được ghi nhận vào hệ thống với tư cách Guest. 
                Vui lòng chờ Admin duyệt quyền để có thể truy cập các tính năng nội bộ.
              </p>
            </div>
            
            <div className="pt-4 border-t border-yellow-500/20">
              <p className="text-xs text-yellow-500/80 font-mono animate-blink">
                _Đang chờ quản trị viên phê duyệt...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
