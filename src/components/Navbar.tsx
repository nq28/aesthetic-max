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
        <div className="flex items-center gap-2 group cursor-default min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-300 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(52,211,153,0.4)] border border-white/40 shrink-0">
            <Sparkles className="w-4 h-4 fill-slate-950 stroke-none" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black tracking-wider flex items-center gap-1">
              <span className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">AESTHETIC</span>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-extrabold">MAX</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-tight -mt-0.5 flex items-center gap-1 truncate">
              <span>Next-Gen Body & Face AI</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isPhoneFrame && userProfile && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-btn text-[11px] font-semibold text-slate-200 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse"></span>
              <span>{userProfile.weight}kg</span>
              <span className="text-white/20">•</span>
              <span className="text-cyan-300">{userProfile.currentBodyFat}% BF</span>
            </div>
          )}

          {!isPhoneFrame && onTogglePhoneFrame && (
            <button
              type="button"
              onClick={onTogglePhoneFrame}
              className="px-3 py-2 rounded-2xl liquid-glass-btn text-slate-300 hover:text-white hidden md:flex items-center gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap shadow-sm hover:border-emerald-400/40 transition-all duration-200"
              title="Chuyển sang khung mô phỏng điện thoại Android"
            >
              <Smartphone className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="text-[11px] whitespace-nowrap">Khung Điện Thoại</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTheme}
            className="p-2 sm:p-2.5 rounded-2xl liquid-glass-btn text-purple-300 hover:text-purple-200 hover:shadow-[0_0_15px_rgba(192,132,252,0.3)] transition-all duration-200 shrink-0"
            title="Tùy biến giao diện & Đổi màu nền"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 sm:p-2.5 rounded-2xl liquid-glass-btn text-slate-300 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-200 shrink-0"
            title="Cài đặt"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
