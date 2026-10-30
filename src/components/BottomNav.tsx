import React from 'react';
import { Home, Utensils, Sparkles, Target, Bot } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan';
  onTabChange: (tab: 'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan') => void;
  isPhoneFrame?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, isPhoneFrame }) => {
  const tabs = [
    { id: 'dashboard', label: 'Tổng Quan', icon: Home },
    { id: 'food', label: 'Quét Món', icon: Utensils },
    { id: 'looksmax', label: 'Looksmax', icon: Sparkles },
    { id: 'coach', label: 'Coach AI', icon: Bot },
    { id: 'plan', label: 'Lộ Trình', icon: Target },
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <nav className={`${
      isPhoneFrame 
        ? 'absolute bottom-3 inset-x-3' 
        : 'fixed bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 w-auto min-w-[340px] max-w-md'
    } z-40 transition-all duration-300`}>
      <div className="liquid-glass-dock rounded-[28px] p-1.5 grid grid-cols-5 relative select-none">
        
        {/* Sliding Liquid Capsule Physics Indicator */}
        <div 
          className="absolute top-1.5 bottom-1.5 rounded-[22px] liquid-pill-active transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-0 shadow-lg shadow-emerald-500/25"
          style={{
            width: 'calc((100% - 12px) / 5)',
            left: '6px',
            transform: `translateX(${activeIndex * 100}%)`
          }}
        >
          {/* Specular top highlight */}
          <div className="absolute inset-x-2 top-0.5 h-[1px] bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent"></div>
        </div>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id as any)}
              className={`relative z-10 flex flex-col items-center justify-center py-2 px-1 rounded-[22px] transition-all duration-200 active:scale-95 group ${
                isActive
                  ? 'text-emerald-300 font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-transform duration-300 ${
                  isActive 
                    ? 'stroke-[2.5px] scale-110 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]' 
                    : 'stroke-[1.8px] group-hover:scale-105'
                }`} />

                {/* Coach AI Pulse Dot */}
                {tab.id === 'coach' && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 tracking-tight transition-all duration-200 ${
                isActive ? 'text-emerald-200 font-bold' : 'text-slate-400 font-medium'
              }`}>
                {tab.label}
              </span>

              {/* Glowing Indicator Dot under Active Tab */}
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] mt-0.5 animate-pulse"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
