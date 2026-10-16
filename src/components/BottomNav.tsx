import React from 'react';
import { Home, Utensils, Sparkles, Target, Bot } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan';
  onTabChange: (tab: 'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Tổng Quan', icon: Home },
    { id: 'food', label: 'Quét Món', icon: Utensils },
    { id: 'looksmax', label: 'Looksmax', icon: Sparkles },
    { id: 'coach', label: 'Coach AI', icon: Bot },
    { id: 'plan', label: 'Lộ Trình', icon: Target },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#07090e]/95 backdrop-blur-lg border-t border-slate-800/80 px-1 py-1.5 sm:py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition relative ${
                  isActive ? 'bg-emerald-500/20' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.id === 'coach' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
