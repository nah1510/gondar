"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Mail, Phone, Send, User, ChevronRight, Globe, CornerDownLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type LangType = 'vi' | 'en';

interface TerminalHistory {
  command: string;
  response?: string;
  errorIndex?: number;
  isError: boolean;
}

const commandMap: Record<string, string> = {
  "/login": "/login",
  "login": "/login",
  "sudo su": "/login",
  "/dashboard": "/dashboard",
  "dashboard": "/dashboard",
  "clear": "CLEAR_COMMAND"
};

import { funnyErrors } from "./terminalErrors";

const content = {
  vi: {
    systemStartup: "ĐANG KHỞI ĐỘNG HỆ THỐNG...",
    coreModules: "[OK] ĐÃ TẢI CÁC MODULE LÕI",
    secureConnection: "[OK] ĐÃ THIẾT LẬP KẾT NỐI BẢO MẬT",
    description: "Chuyên xây dựng các hệ thống tự động, bảo mật và ứng dụng web hiện đại.",
    email: "Email",
    phone: "Điện thoại",
    telegram: "Telegram (Công việc)",
    secured: "KẾT NỐI BẢO MẬT • PHIÊN MÃ HOÁ",
    autoRun: "Tự động chạy sau",
    pressEnter: "Nhấn Enter hoặc Chạm để chạy ngay",
  },
  en: {
    systemStartup: "SYSTEM STARTUP SEQUENCE INITIATED...",
    coreModules: "[OK] LOADED CORE MODULES",
    secureConnection: "[OK] ESTABLISHED SECURE CONNECTION",
    description: "Specializing in building automated systems, security, and modern web applications.",
    email: "Email",
    phone: "Phone",
    telegram: "Telegram (Work)",
    secured: "CONNECTION SECURED • ENCRYPTED SESSION",
    autoRun: "Auto-run in",
    pressEnter: "Press Enter or Tap to execute",
  }
};

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [typingStep, setTypingStep] = useState(0);
  const [lang, setLang] = useState<LangType>('en');
  const [countdown, setCountdown] = useState(10);
  
  const [history, setHistory] = useState<TerminalHistory[]>([]);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    setMounted(true);
    // Simulate terminal typing sequence
    const timers = [
      setTimeout(() => setTypingStep(1), 800),
      setTimeout(() => setTypingStep(2), 1600),
      setTimeout(() => setTypingStep(3), 2400),
      setTimeout(() => setTypingStep(4), 3600), // whoami.sh typing finishes
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Handle auto typing for the second command
  useEffect(() => {
    if (typingStep === 5) {
      const timer = setTimeout(() => setTypingStep(6), 1200); // cat contact_info.txt typing finishes
      return () => clearTimeout(timer);
    }
  }, [typingStep]);

  // Global Keydown listener for Enter (for skipping animations)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (typingStep === 4) {
          setTypingStep(5);
        } else if (typingStep === 6) {
          setTypingStep(7);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [typingStep]);

  // Countdown logic for steps 4 and 6
  useEffect(() => {
    if (typingStep === 4 || typingStep === 6) {
      // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
      setCountdown(10);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTypingStep(step => step + 1); // execute automatically
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [typingStep]);

  // Focus input automatically when typingStep reaches 7
  useEffect(() => {
    if (typingStep === 7 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [typingStep]);

  const toggleLang = () => {
    setLang(prev => prev === 'vi' ? 'en' : 'vi');
  };

  const handleTerminalClick = () => {
    if (typingStep === 4) {
      setTypingStep(5);
    } else if (typingStep === 6) {
      setTypingStep(7);
    } else if (typingStep >= 7 && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCommand = (cmd: string) => {
    const cleanCmd = cmd.trim().toLowerCase();
    if (!cleanCmd) return;
    
    if (commandMap[cleanCmd]) {
      if (commandMap[cleanCmd] === "CLEAR_COMMAND") {
        setHistory([]);
        setInputValue("");
        return;
      }
      router.push(commandMap[cleanCmd]);
    } else {
      const errors = funnyErrors[lang];
      const randomIndex = Math.floor(Math.random() * errors.length);
      setHistory(prev => [...prev, { command: cmd, errorIndex: randomIndex, isError: true }]);
      setInputValue("");
      
      // Auto scroll to bottom
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  };

  if (!mounted) return null;

  const t = content[lang];

  return (
    <div className="min-h-screen bg-jet-black flex items-center justify-center p-4 selection:bg-neon-green selection:text-black relative">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(57,255,20,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,255,20,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none"></div>

      {/* Language Toggle Button */}
      {typingStep >= 3 && (
        <button 
          onClick={toggleLang}
          className="absolute top-6 right-6 z-20 flex items-center space-x-2 bg-terminal-bg border border-terminal-border px-3 py-1.5 rounded-md hover:bg-neon-green/10 transition-colors group animate-in fade-in duration-700 cursor-pointer"
        >
          <Globe size={16} className="text-neon-cyan group-hover:text-neon-green transition-colors" />
          <span className="text-xs font-mono font-bold text-gray-300 group-hover:text-white transition-colors">
            {lang === 'vi' ? 'EN' : 'VI'}
          </span>
        </button>
      )}

      <main className="z-10 w-full max-w-2xl">
        {/* Terminal Window */}
        <div 
          className="rounded-xl border border-terminal-border bg-terminal-bg shadow-[0_0_15px_rgba(57,255,20,0.1)] backdrop-blur-md overflow-hidden relative"
          onClick={handleTerminalClick}
        >
          
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-black/40">
            <div className="flex space-x-2">
              <div 
                onClick={(e) => { e.stopPropagation(); router.push('/login'); }} 
                className="w-3 h-3 rounded-full bg-red-500 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                title="System override"
              ></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-80 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            </div>
            <div className="text-xs text-neon-green/70 font-mono flex items-center">
              <Terminal size={12} className="mr-1" />
              gondar@dev:~
            </div>
            <div className="w-12"></div> {/* Spacer for centering */}
          </div>

          {/* Terminal Body */}
          <div className="p-6 font-mono text-sm md:text-base space-y-6 text-gray-300 overflow-y-auto max-h-[80vh] scrollbar-hide">
            
            {/* Boot Sequence */}
            <div className="space-y-1">
              <p className="text-neon-cyan/80">{t.systemStartup}</p>
              {typingStep >= 1 && <p className="text-neon-cyan/80">{t.coreModules}</p>}
              {typingStep >= 2 && <p className="text-neon-cyan/80">{t.secureConnection}</p>}
            </div>

            {/* Profile Intro */}
            {typingStep >= 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="flex items-center text-neon-green mb-4 flex-wrap">
                  <span className="mr-2 font-bold select-none">gondar@dev:~$</span>
                  <span 
                    className={`inline-block overflow-hidden whitespace-nowrap border-r-2 border-neon-green pr-1 ${typingStep === 3 ? 'animate-blink' : 'border-transparent'}`}
                    style={{ width: '12ch', animation: typingStep === 3 ? 'typing 1.2s steps(11, end) forwards' : 'none' }}
                  >
                    ./whoami.sh
                  </span>
                  {typingStep === 4 && (
                    <span className="text-gray-500 text-xs ml-2 italic animate-pulse">
                      [{t.autoRun} {countdown}s... {t.pressEnter}]
                    </span>
                  )}
                </div>

                {typingStep >= 5 && (
                  <div className="mt-4 pl-2 border-l-2 border-neon-green/30 space-y-4 mb-8 animate-in fade-in duration-500">
                    <div className="flex items-center space-x-3 group">
                      <User className="text-neon-cyan group-hover:text-neon-green transition-colors" size={18} />
                      <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">Phạm Bảo Hân</h1>
                        <p className="text-neon-green/80 text-xs uppercase tracking-[0.2em] mt-1">aka gondar</p>
                      </div>
                    </div>

                    <p className="text-gray-400 max-w-md leading-relaxed">
                      <span className="text-white font-semibold">Software Engineer.</span> {t.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Contact Section */}
            {typingStep >= 5 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 pt-4">
                <div className="flex items-center text-neon-green mb-4 flex-wrap">
                  <span className="mr-2 font-bold select-none">gondar@dev:~$</span>
                  <span 
                    className={`text-white inline-block overflow-hidden whitespace-nowrap border-r-2 border-neon-green pr-1 ${typingStep === 5 ? 'animate-blink' : 'border-transparent'}`}
                    style={{ width: '21ch', animation: typingStep === 5 ? 'typing 1.2s steps(20, end) forwards' : 'none' }}
                  >
                    cat contact_info.txt
                  </span>
                  {typingStep === 6 && (
                    <span className="text-gray-500 text-xs ml-2 italic animate-pulse">
                      [{t.autoRun} {countdown}s... {t.pressEnter}]
                    </span>
                  )}
                </div>

                {typingStep >= 7 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2 animate-in fade-in duration-500">
                    <a href="mailto:gondar1510@gmail.com" className="flex items-center p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-neon-green/10 hover:border-neon-green/30 transition-all group">
                      <Mail className="text-neon-cyan mr-3 group-hover:text-neon-green transition-colors" size={20} />
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">{t.email}</div>
                        <div className="text-sm text-gray-200 group-hover:text-white transition-colors">gondar1510@gmail.com</div>
                      </div>
                    </a>

                    <a href="tel:+84888741510" className="flex items-center p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-neon-green/10 hover:border-neon-green/30 transition-all group">
                      <Phone className="text-neon-cyan mr-3 group-hover:text-neon-green transition-colors" size={20} />
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">{t.phone}</div>
                        <div className="text-sm text-gray-200 group-hover:text-white transition-colors">+84 888 741 510</div>
                      </div>
                    </a>

                    <a href="https://t.me/nah1510" target="_blank" rel="noopener noreferrer" className="flex items-center p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-neon-green/10 hover:border-neon-green/30 transition-all group md:col-span-2">
                      <Send className="text-neon-cyan mr-3 group-hover:text-neon-green transition-colors" size={20} />
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">{t.telegram}</div>
                        <div className="text-sm text-neon-green/90 group-hover:text-neon-green transition-colors">@nah1510</div>
                      </div>
                      <ChevronRight size={16} className="ml-auto text-gray-600 group-hover:text-neon-green transition-colors" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Terminal Input */}
            {typingStep >= 7 && (
              <div className="animate-in fade-in duration-1000 pt-8 flex flex-col space-y-4 pb-2">
                
                {/* Command History */}
                {history.map((h, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center text-neon-green flex-wrap">
                      <span className="mr-2 font-bold select-none">gondar@dev:~$</span>
                      <span className="text-white">{h.command}</span>
                    </div>
                    <div className={`${h.isError ? 'text-red-400' : 'text-gray-300'}`}>
                      {h.isError && h.errorIndex !== undefined ? funnyErrors[lang][h.errorIndex] : h.response}
                    </div>
                  </div>
                ))}

                {/* Active Input Line */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCommand(inputValue);
                  }}
                  className="flex items-center text-neon-green"
                >
                  <span className="mr-2 font-bold select-none">gondar@dev:~$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="bg-transparent border-none outline-none text-white flex-1 font-mono focus:ring-0 p-0 m-0"
                  />
                  <button
                    type="submit"
                    className="ml-2 text-neon-green/70 hover:text-neon-green transition-colors focus:outline-none flex items-center bg-white/5 rounded px-2 py-1 md:hidden"
                  >
                    <CornerDownLeft size={14} className="mr-1" />
                    <span className="text-[10px] font-bold">ENTER</span>
                  </button>
                </form>
              </div>
            )}
            
          </div>
        </div>

        {/* Footer info */}
        {typingStep >= 7 && (
          <div className="text-center mt-6 text-xs text-gray-600 font-mono animate-in fade-in duration-1000">
            {t.secured}
          </div>
        )}
      </main>
    </div>
  );
}
