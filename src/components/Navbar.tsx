import React from 'react';
import { Sparkles, Settings, Palette, Smartphone } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  userProfile: UserProfile | null;
  onOpenSettings: () => void;
  onOpenTheme: () => void;
  onTogglePhoneFrame?: () => void;
  isPhoneFrame?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  userProfile, 
  onOpenSettings, 
  onOpenTheme,
  onTogglePhoneFrame,
  isPhoneFrame 
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#05070b]/60 border-b border-white/[0.08] px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-all duration-300">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5 group cursor-default">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-300 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(52,211,153,0.4)] border border-white/40 transition-transform duration-300 group-hover:scale-105 active:scale-95">
            <Sparkles className="w-4 h-4 fill-slate-950 stroke-none" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wider flex items-center gap-1">
              <span className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">AESTHETIC</span>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-extrabold">MAX</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-tight -mt-0.5 flex items-center gap-1">
              <span>Next-Gen Body & Face AI</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {userProfile && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-btn text-[11px] font-semibold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse"></span>
              <span>{userProfile.weight}kg</span>
              <span className="text-white/20">•</span>
              <span className="text-cyan-300">{userProfile.currentBodyFat}% BF</span>
            </div>
          )}

          {onTogglePhoneFrame && (
            <button
              type="button"
              onClick={onTogglePhoneFrame}
              className={`p-2 rounded-2xl border transition-all duration-200 hidden md:flex items-center gap-1.5 text-xs font-semibold ${
                isPhoneFrame
                  ? 'liquid-pill-active text-emerald-300'
                  : 'liquid-glass-btn text-slate-300 hover:text-white'
              }`}
              title="Bật/Tắt Giả lập màn hình điện thoại Android"
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[11px]">{isPhoneFrame ? 'Khung Điện Thoại' : 'Khung Điện Thoại'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTheme}
            className="p-2.5 rounded-2xl liquid-glass-btn text-purple-300 hover:text-purple-200 hover:shadow-[0_0_15px_rgba(192,132,252,0.3)] transition-all duration-200"
            title="Tùy biến giao diện & Đổi màu nền"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 rounded-2xl liquid-glass-btn text-slate-300 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-200"
            title="Cài đặt"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
