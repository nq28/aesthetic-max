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
    <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
            <Sparkles className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <div className="text-sm font-black text-white tracking-wide flex items-center gap-1">
              <span>AESTHETIC</span>
              <span className="text-emerald-400">MAX</span>
            </div>
            <div className="text-[10px] text-slate-400 -mt-0.5">CaloTrack & Looksmax AI</div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {userProfile && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{userProfile.weight}kg • {userProfile.currentBodyFat}% BF</span>
            </div>
          )}

          {onTogglePhoneFrame && (
            <button
              type="button"
              onClick={onTogglePhoneFrame}
              className={`p-2 rounded-xl border transition hidden md:flex items-center gap-1 text-xs font-semibold ${
                isPhoneFrame
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Bật/Tắt Giả lập màn hình điện thoại Android"
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[11px]">{isPhoneFrame ? 'Khung Android' : 'Khung Android'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTheme}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-400 hover:text-purple-300 transition"
            title="Tùy biến giao diện & Đổi màu nền"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Cài đặt"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
