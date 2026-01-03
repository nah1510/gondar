"use client";

import { signIn } from "next-auth/react";
import { Terminal, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-jet-black flex items-center justify-center p-4 selection:bg-neon-green selection:text-black relative">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(57,255,20,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none"></div>

      <div className="z-10 w-full max-w-md">
        <div className="rounded-xl border border-terminal-border bg-terminal-bg shadow-[0_0_15px_rgba(57,255,20,0.1)] backdrop-blur-md overflow-hidden">
          
          <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-black/40">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-80"></div>
            </div>
            <div className="text-xs text-neon-green/70 font-mono flex items-center">
              <Terminal size={12} className="mr-1" />
              auth_gateway.exe
            </div>
            <div className="w-12"></div>
          </div>

          <div className="p-8 text-center space-y-6">
            <div className="flex justify-center text-neon-cyan mb-2">
              <ShieldAlert size={48} className="animate-pulse" />
            </div>
            
            <div>
              <h2 className="text-xl font-mono font-bold text-white mb-2">KHU VỰC HẠN CHẾ</h2>
              <p className="text-sm text-gray-400 font-mono">Yêu cầu xác thực để truy cập các module hệ thống.</p>
            </div>

            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center space-x-3 bg-white/10 hover:bg-neon-green hover:text-black text-white py-3 px-4 rounded border border-white/20 hover:border-neon-green transition-all font-mono font-bold group"
            >
              <svg className="w-5 h-5 group-hover:fill-black fill-current" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" className="group-hover:fill-black"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" className="group-hover:fill-black"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" className="group-hover:fill-black"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" className="group-hover:fill-black"/>
              </svg>
              <span>ĐĂNG NHẬP BẰNG GOOGLE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
