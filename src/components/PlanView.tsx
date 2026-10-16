import React, { useState } from 'react';
import { SmartPlan, UserProfile } from '../types';
import { storageService } from '../services/storageService';
import { 
  Zap, 
  Dumbbell, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Flame, 
  Droplet, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PlanViewProps {
  currentPlan: SmartPlan | null;
  userProfile: UserProfile;
  onPlanUpdate: (updated: SmartPlan) => void;
  onNavigate: (tab: 'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan') => void;
}

export const PlanView: React.FC<PlanViewProps> = ({
  currentPlan,
  userProfile,
  onPlanUpdate,
  onNavigate
}) => {
  if (!currentPlan) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <Zap className="w-10 h-10 text-slate-600 mx-auto" />
        <h2 className="text-base font-bold text-white">Chưa có Smart Plan nào được kích hoạt</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Hãy thực hiện một lần quét khuôn mặt bằng AI hoặc hoàn tất khởi tạo để tạo lộ trình cá nhân hóa.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('looksmax')}
          className="px-4 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs uppercase"
        >
          Quét khuôn mặt ngay
        </button>
      </div>
    );
  }

  // Toggle habit checkbox
  const handleToggleHabit = (id: string) => {
    const updatedHabits = currentPlan.dailyHabits.map(h => {
      if (h.id === id) {
        const next = !h.completed;
        if (next) {
          try {
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
          } catch {
            // Ignored
          }
        }
        return { ...h, completed: next };
      }
      return h;
    });

    const updatedPlan: SmartPlan = {
      ...currentPlan,
      dailyHabits: updatedHabits
    };

    storageService.saveSmartPlan(updatedPlan);
    onPlanUpdate(updatedPlan);
  };

  const completedHabitsCount = currentPlan.dailyHabits.filter(h => h.completed).length;

  return (
    <div className="space-y-6 pb-20">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-purple-950/40 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              <span>Smart Nutrition & Workout Roadmap</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{currentPlan.planName}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {currentPlan.planSource === 'looksmax_sync' 
                ? '⚡ Lộ trình được đồng bộ trực tiếp từ phân tích cấu trúc khuôn mặt Looksmax AI.' 
                : 'Lộ trình được tạo theo mục tiêu thể hình ban đầu.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('looksmax')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/25 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Đổi Plan bằng Quét Mặt Mới</span>
          </button>
        </div>
      </div>

      {/* Daily Nutrition Standards in this Plan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>Tiêu Chuẩn Ăn Uống Hàng Ngày Trong Plan</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Toàn bộ các chỉ số này được liên kết 1:1 với "Chi tiết các vi chất đang theo dõi" trên Tổng quan.
            </p>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Đã liên kết 100% với Dashboard
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Calo Thâm Hụt</span>
            <div className="text-base font-extrabold text-emerald-400">{currentPlan.calorieTarget} kcal</div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Đạm (Protein)</span>
            <div className="text-base font-extrabold text-cyan-400">{currentPlan.proteinTarget}g</div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Tinh bột (Carbs)</span>
            <div className="text-base font-extrabold text-amber-400">{currentPlan.carbTarget || 220}g</div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Chất béo (Fat)</span>
            <div className="text-base font-extrabold text-rose-400">{currentPlan.fatTarget || 55}g</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Muối Debloat Max</span>
            <div className="text-sm font-bold text-rose-400">&lt; {currentPlan.sodiumTarget}mg</div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Kali Xả Nước Má</span>
            <div className="text-sm font-bold text-purple-400">&gt; {currentPlan.potassiumTarget}mg</div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Canxi (Xương & Chiều cao)</span>
            <div className="text-sm font-bold text-white">{currentPlan.calciumTarget}mg</div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Vitamin D3</span>
            <div className="text-sm font-bold text-white">{currentPlan.vitaminD3Target} IU</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Kẽm (Testosterone & Da)</span>
            <div className="text-sm font-bold text-white">{currentPlan.zincTarget}mg</div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Magiê (Giấc ngủ & Cơ bắp)</span>
            <div className="text-sm font-bold text-white">{currentPlan.magnesiumTarget || 400}mg</div>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400">Mục Tiêu Nước</span>
            <div className="text-sm font-bold text-cyan-400">{currentPlan.waterTargetLiters} Lít</div>
          </div>
          <div 
            onClick={() => onNavigate('dashboard')}
            className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30 hover:border-emerald-400/60 cursor-pointer transition flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] text-emerald-400 font-bold block">TIẾN ĐỘ HÔM NAY</span>
              <span className="text-xs text-white font-semibold">Xem Dashboard</span>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Daily Looksmaxxing & Mewing Habits Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Thói Quen Looksmaxxing & Mewing Hôm Nay</span>
          </h2>
          <span className="text-xs font-bold text-emerald-400">
            {completedHabitsCount} / {currentPlan.dailyHabits.length} hoàn thành
          </span>
        </div>

        <div className="space-y-2">
          {currentPlan.dailyHabits.map((habit) => (
            <div
              key={habit.id}
              onClick={() => handleToggleHabit(habit.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                habit.completed
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {habit.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                )}
                <div>
                  <div className={`text-xs font-semibold ${habit.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                    {habit.title}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Tần suất: {habit.frequency}</div>
                </div>
              </div>

              <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-bold ${
                habit.category === 'mewing' ? 'bg-purple-950 text-purple-300' :
                habit.category === 'posture' ? 'bg-blue-950 text-blue-300' :
                habit.category === 'debloat' ? 'bg-cyan-950 text-cyan-300' : 'bg-amber-950 text-amber-300'
              }`}>
                {habit.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Workout Split */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-cyan-400" />
          <span>Lịch Tập Gym Tôn Dáng Thân Trên & Khuôn Mặt (V-Taper Split)</span>
        </h2>

        <div className="space-y-3">
          {currentPlan.workoutSplit.map((split, idx) => (
            <div key={idx} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400">{split.day}</span>
                <span className="text-[10px] text-slate-400">{split.target}</span>
              </div>
              <h3 className="text-sm font-bold text-white">{split.title}</h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {split.exercises.map((ex, exIdx) => (
                  <span key={exIdx} className="text-[11px] px-2.5 py-1 bg-slate-900 text-slate-300 rounded-lg border border-slate-800">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
