import React, { useState, useEffect } from 'react';
import { UserProfile, FoodItem, NutrientDefinition, SmartPlan, WorkoutBurnItem, StreakData, DailyMealPlan } from '../types';
import { storageService } from '../services/storageService';
import { 
  Flame, 
  Droplet, 
  Zap, 
  Sparkles, 
  Plus, 
  ShieldCheck, 
  Check, 
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Activity,
  TrendingDown,
  ChefHat,
  ArrowRight,
  PhoneCall
} from 'lucide-react';

interface DashboardViewProps {
  userProfile: UserProfile;
  todayFoodItems: FoodItem[];
  nutrients: NutrientDefinition[];
  currentPlan: SmartPlan | null;
  onNavigate: (tab: 'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan') => void;
  onWaterUpdate: (newAmount: number) => void;
  waterAmount: number;
  isPhoneFrame?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userProfile,
  todayFoodItems,
  nutrients,
  currentPlan,
  onNavigate,
  onWaterUpdate,
  waterAmount,
  isPhoneFrame
}) => {
  // Streak & Start Date
  const [streakData, setStreakData] = useState<StreakData>(() => storageService.getStreakData());
  const startDate = userProfile.startDate || new Date(userProfile.createdAt || Date.now()).toISOString().slice(0, 10);
  const startTimestamp = new Date(startDate).getTime();
  const daysElapsed = Math.max(1, Math.floor((Date.now() - startTimestamp) / (1000 * 60 * 60 * 24)) + 1);

  // Workout burned calories for today
  const [workoutBurnItems, setWorkoutBurnItems] = useState<WorkoutBurnItem[]>(() => storageService.getTodayWorkoutBurn());

  // Daily Meal Plan
  const [mealPlan, setMealPlan] = useState<DailyMealPlan | null>(() => storageService.getDailyMealPlan());

  // Refresh meal plan when active
  useEffect(() => {
    setMealPlan(storageService.getDailyMealPlan());
  }, [todayFoodItems]);

  // Calculate daily totals
  const totalCalories = todayFoodItems.reduce((acc, item) => acc + (item.calories || 0), 0);
  const targetCalories = currentPlan?.calorieTarget || userProfile.dailyCalorieTarget;
  const remainingCalories = Math.max(0, targetCalories - totalCalories);
  const caloriePercent = Math.min(100, Math.round((totalCalories / targetCalories) * 100));

  // Burned calories estimation based on ~weight (kg)
  const bmr = Math.round(10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + (userProfile.gender === 'female' ? -161 : 5));
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9
  };
  const mult = activityMultipliers[userProfile.activityLevel] || 1.375;
  const baseTdee = Math.round(bmr * mult);
  const workoutBurnTotal = workoutBurnItems.reduce((acc, item) => acc + (item.caloriesBurned || 0), 0);
  const totalBurnedToday = baseTdee + workoutBurnTotal;
  const deficitCalories = totalBurnedToday - totalCalories;
  const fatLossGramsToday = deficitCalories > 0 ? Math.round((deficitCalories / 7700) * 1000) : 0;
  const fatLossKgWeek = deficitCalories > 0 ? ((deficitCalories * 7) / 7700).toFixed(2) : '0.00';

  // Auto-save daily snapshot
  useEffect(() => {
    storageService.saveDailySnapshot({
      totalCalories,
      waterMl: waterAmount,
      caloriesBurnedEstimate: totalBurnedToday,
      weightKg: userProfile.weight,
      foodCount: todayFoodItems.length,
      habitsCompleted: currentPlan?.dailyHabits?.filter(h => h.completed).length || 0
    });
  }, [totalCalories, waterAmount, totalBurnedToday, userProfile.weight, todayFoodItems.length, currentPlan]);

  // Sum up nutrients
  const nutrientTotals: Record<string, number> = {};
  nutrients.forEach(n => {
    nutrientTotals[n.id] = todayFoodItems.reduce((acc, item) => {
      return acc + (item.nutrients?.[n.id] || 0);
    }, 0);
  });

  const proteinTotal = nutrientTotals['protein'] || 0;
  const carbsTotal = nutrientTotals['carbs'] || 0;
  const fatTotal = nutrientTotals['fat'] || 0;
  const sodiumTotal = nutrientTotals['sodium'] || 0;
  const potassiumTotal = nutrientTotals['potassium'] || 0;

  const targetWater = (currentPlan?.waterTargetLiters || 3.5) * 1000;
  const waterPercent = Math.min(100, Math.round((waterAmount / targetWater) * 100));

  // Dynamic target resolver guaranteeing 100% synchronization with currentPlan
  const getEffectiveTarget = (n: NutrientDefinition): number => {
    if (!currentPlan) return n.dailyTarget;
    switch (n.id) {
      case 'protein':
        return currentPlan.proteinTarget || n.dailyTarget;
      case 'carbs':
        return currentPlan.carbTarget || n.dailyTarget;
      case 'fat':
        return currentPlan.fatTarget || n.dailyTarget;
      case 'sodium':
        return currentPlan.sodiumTarget || n.dailyTarget;
      case 'potassium':
        return currentPlan.potassiumTarget || n.dailyTarget;
      default:
        return n.dailyTarget;
    }
  };

  // Add water helper
  const handleAddWater = (ml: number) => {
    const updated = waterAmount + ml;
    onWaterUpdate(updated);
    storageService.saveWaterIntake(updated);
  };

  // Quick Add Workout Burn
  const handleQuickAddWorkout = (type: 'run' | 'gym' | 'walk' | 'debloat') => {
    const w = userProfile.weight;
    let name = 'Tập Gym';
    let duration = 45;
    let cal = Math.round(0.08 * w * 45);

    if (type === 'run') {
      name = 'Chạy bộ thể lực';
      duration = 30;
      cal = Math.round(0.13 * w * 30);
    } else if (type === 'walk') {
      name = 'Đi bộ xả năng lượng';
      duration = 40;
      cal = Math.round(0.05 * w * 40);
    } else if (type === 'debloat') {
      name = 'Cardio xả nước mặt & Mewing';
      duration = 20;
      cal = Math.round(0.04 * w * 20);
    }

    const newItem = storageService.addWorkoutBurn({
      title: name,
      durationMinutes: duration,
      caloriesBurned: cal
    });
    setWorkoutBurnItems(prev => [newItem, ...prev]);
  };

  // Past 7 days streak indicator
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString('vi-VN', { weekday: 'short' });
    const isActive = streakData.history?.[dateStr] || (i === 6);
    return { dateStr, dayName, isActive };
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Top Welcome & Style Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-bold liquid-pill-active text-emerald-300">
              {userProfile.age}T {userProfile.isPuberty ? '• DẬY THÌ TĂNG TRƯỞNG' : '• TRƯỞNG THÀNH'}
            </span>
            <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-bold liquid-glass-purple text-purple-300">
              {userProfile.aestheticStyle === 'asian_pretty_boy' ? '🌸 PRETTY BOY' : '⚔️ PSL WARRIOR'}
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
            <span>Hôm nay của bạn</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse"></span>
          </h1>
        </div>

        {/* Quick Shortcut Buttons - 2 Columns on Mobile, Never Wrap Text */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => onNavigate('food')}
            className="py-2.5 px-3 sm:px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all duration-300 shadow-[0_0_20px_rgba(52,211,153,0.35)] active:scale-95 border border-white/30 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3px] shrink-0" />
            <span>Quét Bữa Ăn</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('looksmax')}
            className="py-2.5 px-3 sm:px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.35)] active:scale-95 border border-purple-400/30 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 fill-white stroke-none shrink-0" />
            <span>Quét Mặt 3D</span>
          </button>
        </div>
      </div>

      {/* 1. Daily Streak System & Start Date Milestone Banner */}
      <div className="liquid-glass-amber rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-5 shadow-xl relative overflow-hidden group">
        {/* Ambient Top Glow */}
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/50 to-transparent pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 relative z-10">
          
          <div className="flex items-center justify-between w-full md:w-auto gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-400 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(251,191,36,0.4)] border border-white/40 text-lg sm:text-xl group-hover:scale-105 transition-transform shrink-0">
                🔥
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                    Chuỗi {streakData.currentStreak} Ngày
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-100/80 truncate">
                  Ngày thứ {daysElapsed} • Bắt đầu {startDate}
                </p>
              </div>
            </div>

            <span className="text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 font-bold border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.2)] shrink-0 whitespace-nowrap">
              Kỷ lục: {streakData.longestStreak}n
            </span>
          </div>

          {/* 7-Day Mini Streak Dots */}
          <div className="flex items-center justify-between w-full md:w-auto gap-1 liquid-glass rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 border border-white/10 shadow-inner shrink-0">
            {last7Days.map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1 md:flex-initial">
                <span className="text-[9px] text-slate-400 font-semibold">{d.dayName}</span>
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-black transition-all duration-300 ${
                    d.isActive
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-105'
                      : 'bg-white/[0.06] text-slate-500 border border-white/[0.08]'
                  }`}
                  title={`${d.dateStr}: ${d.isActive ? 'Đã hoạt động' : 'Chưa ghi nhận'}`}
                >
                  {d.isActive ? '✓' : '•'}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* 2. Main Calories & Ring Widget (Flagship Liquid Glass Card - Compact Side-by-Side on Mobile) */}
      <div className="liquid-glass-card rounded-[24px] sm:rounded-[32px] p-4 sm:p-7 relative overflow-hidden group">
        {/* Specular Top Border Light Sheen */}
        <div className="absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"></div>

        <div className="flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Calorie Stats */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full liquid-glass-btn text-slate-200 text-[10px] sm:text-xs font-semibold whitespace-nowrap shadow-sm">
              <Flame className="w-3.5 h-3.5 text-emerald-400 shadow-[0_0_8px_#34d399] shrink-0" />
              <span>Năng Lượng Hôm Nay</span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5 sm:gap-2.5">
                <span className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_12px_rgba(255,255,255,0.2)]">
                  {totalCalories}
                </span>
                <span className="text-xs sm:text-base font-semibold text-slate-400">/ {targetCalories} kcal</span>
              </div>
              <p className="text-[11px] sm:text-sm text-slate-300/80 mt-0.5">
                Còn lại <strong className="text-emerald-300 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">{remainingCalories} kcal</strong>
              </p>
            </div>
          </div>

          {/* Radial Calorie Visualizer with Glass Specular Reflection - Compact 88px on Mobile */}
          <div className="relative w-24 h-24 sm:w-36 sm:h-36 flex items-center justify-center shrink-0">
            {/* Ambient Behind Glow */}
            <div className="absolute inset-2 sm:inset-4 rounded-full bg-emerald-500/15 blur-lg"></div>

            <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="50%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="41"
                className="text-white/[0.08]"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="41"
                stroke="url(#calorieGradient)"
                strokeWidth="10"
                strokeDasharray="257.6"
                strokeDashoffset={257.6 - (257.6 * caloriePercent) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out filter drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
              />
            </svg>

            <div className="absolute flex flex-col items-center z-20">
              <span className="text-lg sm:text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {caloriePercent}%
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
                ĐÃ NẠP
              </span>
            </div>
          </div>

        </div>

        {/* Macros Quick Bar - FULL WIDTH BELOW so it NEVER squishes! */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3.5 pt-4 mt-4 border-t border-white/[0.08] w-full">
          {/* Protein */}
          <div className="liquid-glass rounded-2xl p-2.5 sm:p-3 border border-cyan-500/25">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400/90 text-[10px] sm:text-xs font-bold tracking-wider uppercase">ĐẠM (P)</span>
              <span className="text-cyan-300 font-black text-sm sm:text-base">{proteinTotal}g</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5 sm:mt-2">
              <div 
                className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-500"
                style={{ width: `${Math.min(100, (proteinTotal / (currentPlan?.proteinTarget || Math.round(userProfile.weight * 2))) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Carbs */}
          <div className="liquid-glass rounded-2xl p-2.5 sm:p-3 border border-amber-500/25">
            <div className="flex items-center justify-between">
              <span className="text-amber-400/90 text-[10px] sm:text-xs font-bold tracking-wider uppercase">CARB (C)</span>
              <span className="text-amber-300 font-black text-sm sm:text-base">{carbsTotal}g</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5 sm:mt-2">
              <div 
                className="h-full rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] transition-all duration-500"
                style={{ width: `${Math.min(100, (carbsTotal / (currentPlan?.carbTarget || Math.round(userProfile.weight * 2.5))) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Fat */}
          <div className="liquid-glass rounded-2xl p-2.5 sm:p-3 border border-rose-500/25">
            <div className="flex items-center justify-between">
              <span className="text-rose-400/90 text-[10px] sm:text-xs font-bold tracking-wider uppercase">BÉO (F)</span>
              <span className="text-rose-300 font-black text-sm sm:text-base">{fatTotal}g</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5 sm:mt-2">
              <div 
                className="h-full rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185] transition-all duration-500"
                style={{ width: `${Math.min(100, (fatTotal / (currentPlan?.fatTarget || Math.round(userProfile.weight * 0.8))) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Estimated Burned Calories (~kg bodyweight) & Deficit / Fat Loss Projection */}
      <div className="liquid-glass-card rounded-[28px] p-5 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.3)] shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Ước Tính Calo Đốt Cháy Hôm Nay (~{userProfile.weight}kg)
              </h3>
              <p className="text-[11px] text-slate-400 truncate sm:whitespace-normal">Tính toán thể trạng BMR & các bài tập ghi nhận trong ngày</p>
            </div>
          </div>
          
          <span className="px-3 py-1 rounded-full liquid-glass-btn text-orange-300 border-orange-500/40 text-xs font-black shadow-[0_0_12px_rgba(249,115,22,0.25)] shrink-0 whitespace-nowrap self-start sm:self-auto">
            ~{totalBurnedToday} kcal tiêu thụ
          </span>
        </div>

        {/* Burn Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="liquid-glass p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-medium">Chuyển Hóa Cơ Bản (BMR)</span>
            <span className="text-white font-black text-sm mt-0.5 block">{bmr} kcal</span>
            <span className="text-[10px] text-slate-500 block">Duy trì sự sống</span>
          </div>
          <div className="liquid-glass p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-medium">Vận Động Sinh Hoạt</span>
            <span className="text-cyan-300 font-black text-sm mt-0.5 block">{baseTdee - bmr} kcal</span>
            <span className="text-[10px] text-slate-500 block">Theo hệ số TDEE</span>
          </div>
          <div className="liquid-glass p-3 rounded-2xl border border-white/10">
            <span className="text-slate-400 block text-[10px] font-medium">Bài Tập Hôm Nay</span>
            <span className="text-emerald-300 font-black text-sm mt-0.5 block">+{workoutBurnTotal} kcal</span>
            <span className="text-[10px] text-slate-500 block">{workoutBurnItems.length} buổi tập</span>
          </div>
          <div className={`p-3 rounded-2xl border ${
            deficitCalories > 0 
              ? 'liquid-pill-active border-emerald-500/40' 
              : 'liquid-glass border-amber-500/30'
          }`}>
            <span className="text-slate-300 block text-[10px] font-medium">Thâm Hụt (Deficit)</span>
            <span className={`font-black text-sm mt-0.5 block ${deficitCalories > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {deficitCalories > 0 ? `-${deficitCalories}` : `+${Math.abs(deficitCalories)}`} kcal
            </span>
            <span className="text-[10px] text-slate-300/80 block">
              {deficitCalories > 0 ? `~${fatLossGramsToday}g mỡ/ngày` : 'Dư calo nhẹ'}
            </span>
          </div>
        </div>

        {/* Fat Loss Projection Badge */}
        {deficitCalories > 0 ? (
          <div className="p-3.5 liquid-glass-emerald rounded-2xl flex items-center justify-between text-xs text-slate-100 shadow-lg">
            <div className="flex items-center gap-2.5">
              <TrendingDown className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Duy trì mức thâm hụt này: Dự kiến giảm <strong>~{fatLossKgWeek} kg mỡ thừa</strong> sau 7 ngày!
              </span>
            </div>
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest hidden sm:inline px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              SIẾT NÉT JAWLINE
            </span>
          </div>
        ) : (
          <div className="p-3 liquid-glass rounded-2xl text-xs text-slate-300 border border-amber-500/20">
            💡 Hiện tại calo nạp đang cao hơn mức đốt cháy. Hãy tăng vận động hoặc giảm khẩu phần bữa tối để tạo thâm hụt mỡ.
          </div>
        )}

        {/* Quick Workout Burn Logger Buttons */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-slate-300 block">
            + Ghi nhận buổi tập nhanh (Tính calo chuẩn theo ~{userProfile.weight}kg):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickAddWorkout('run')}
              className="p-2.5 liquid-glass-btn rounded-2xl font-medium text-slate-200 transition-all text-left group hover:border-orange-500/40"
            >
              <div className="flex items-center gap-1.5 font-bold text-orange-400 group-hover:scale-102 transition-transform">
                <span>🏃 Chạy bộ 30p</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">+{Math.round(0.13 * userProfile.weight * 30)} kcal</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAddWorkout('gym')}
              className="p-2.5 liquid-glass-btn rounded-2xl font-medium text-slate-200 transition-all text-left group hover:border-emerald-500/40"
            >
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 group-hover:scale-102 transition-transform">
                <span>🏋️ Tập Gym 45p</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">+{Math.round(0.08 * userProfile.weight * 45)} kcal</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAddWorkout('walk')}
              className="p-2.5 liquid-glass-btn rounded-2xl font-medium text-slate-200 transition-all text-left group hover:border-cyan-500/40"
            >
              <div className="flex items-center gap-1.5 font-bold text-cyan-400 group-hover:scale-102 transition-transform">
                <span>🚶 Đi bộ 40p</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">+{Math.round(0.05 * userProfile.weight * 40)} kcal</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAddWorkout('debloat')}
              className="p-2.5 liquid-glass-btn rounded-2xl font-medium text-slate-200 transition-all text-left group hover:border-purple-500/40"
            >
              <div className="flex items-center gap-1.5 font-bold text-purple-400 group-hover:scale-102 transition-transform">
                <span>🧘 Mewing / Cardio</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">+{Math.round(0.04 * userProfile.weight * 20)} kcal</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. AI Daily Meal Plan Shortcut Card */}
      <div className="liquid-glass-emerald rounded-[28px] p-5 shadow-2xl transition-all duration-300 space-y-3 relative overflow-hidden group">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-[0_0_20px_rgba(52,211,153,0.4)] border border-white/30">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Thực Đơn AI Hôm Nay (Debloat & Cắt Nét)
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {mealPlan ? `Đã lên 4 bữa (~${mealPlan.totalCalories} kcal) • Tỷ lệ xả nước K:Na ${mealPlan.debloatRatio}:1` : 'Chưa tạo thực đơn cho ngày hôm nay'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('food')}
            className="flex items-center gap-1.5 px-3.5 py-2 liquid-glass-btn text-emerald-300 hover:text-white border-emerald-400/40 rounded-2xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            <span>{mealPlan ? 'Xem & Đổi Thực Đơn' : '⚡ Tạo Thực Đơn AI Ngay'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {mealPlan && mealPlan.meals && mealPlan.meals.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {mealPlan.meals.map((meal) => (
              <div
                key={meal.id}
                onClick={() => onNavigate('food')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 text-xs active:scale-95 ${
                  meal.logged 
                    ? 'liquid-pill-active text-emerald-200' 
                    : 'liquid-glass hover:border-emerald-400/40 text-slate-200'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                  <span className="uppercase font-bold tracking-wider">
                    {meal.mealType === 'breakfast' ? 'Sáng' : meal.mealType === 'lunch' ? 'Trưa' : meal.mealType === 'dinner' ? 'Tối' : 'Phụ'}
                  </span>
                  {meal.logged ? (
                    <span className="text-emerald-400 flex items-center gap-0.5 font-bold"><Check className="w-3 h-3" /> Đã ăn</span>
                  ) : (
                    <span className="text-emerald-300 font-semibold">{meal.calories} kcal</span>
                  )}
                </div>
                <div className="font-bold text-white truncate text-xs">{meal.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Critical Electrolyte / Debloat Bar (Muối vs Kali) */}
      <div className="liquid-glass-card rounded-[28px] p-5 space-y-3.5 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Droplet className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]" />
            <span>Trạng Thái Debloat (Cân Bằng Natri / Kali)</span>
          </div>
          {sodiumTotal > 2000 ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-300 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Nguy cơ tích nước mặt cao
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Tối ưu lộ nét Jawline
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Sodium */}
          <div className="liquid-glass p-3.5 rounded-2xl border border-white/10">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium">Muối / Natri (Gây tích nước)</span>
              <span className="font-bold text-white">
                {sodiumTotal} / <span className="text-rose-400">{currentPlan?.sodiumTarget || 1600} mg</span>
              </span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  sodiumTotal > 2000 ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                }`}
                style={{ width: `${Math.min(100, (sodiumTotal / (currentPlan?.sodiumTarget || 1600)) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Potassium */}
          <div className="liquid-glass p-3.5 rounded-2xl border border-white/10">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-300 font-medium">Kali (Xả mặn, thon gọn mặt)</span>
              <span className="font-bold text-white">
                {potassiumTotal} / <span className="text-cyan-300">{currentPlan?.potassiumTarget || 3800} mg</span>
              </span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all duration-500"
                style={{ width: `${Math.min(100, (potassiumTotal / (currentPlan?.potassiumTarget || 3800)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Water Intake Tracking Card */}
      <div className="liquid-glass-cyan rounded-[28px] p-5 shadow-2xl space-y-3.5 relative overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_8px_#38bdf8]" />
            <h3 className="text-xs font-bold text-cyan-200 uppercase tracking-wider">Cấp Nước Thải Độc & Cắt Nét</h3>
          </div>
          <span className="text-xs font-black text-cyan-300">
            {(waterAmount / 1000).toFixed(1)} / {currentPlan?.waterTargetLiters || 3.5} L ({waterPercent}%)
          </span>
        </div>

        <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 shadow-[0_0_12px_#38bdf8] transition-all duration-500"
            style={{ width: `${waterPercent}%` }}
          ></div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleAddWater(250)}
            className="flex-1 py-2 liquid-glass-btn text-cyan-200 hover:text-white rounded-2xl text-xs font-bold transition active:scale-95"
          >
            +250ml
          </button>
          <button
            type="button"
            onClick={() => handleAddWater(500)}
            className="flex-1 py-2 liquid-glass-btn text-cyan-200 hover:text-white rounded-2xl text-xs font-bold transition active:scale-95"
          >
            +500ml
          </button>
          <button
            type="button"
            onClick={() => handleAddWater(1000)}
            className="flex-1 py-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-200 border border-cyan-400/50 rounded-2xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            +1.000ml (1L)
          </button>
        </div>
      </div>

      {/* 7. Nutrients Detail List */}
      <div className="liquid-glass-card rounded-[28px] p-5 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Chi tiết các vi chất đang theo dõi ({nutrients.length})
              </h3>
              {currentPlan && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full liquid-pill-active text-emerald-300 font-mono font-bold flex items-center gap-1">
                  ⚡ Đồng bộ với Plan
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Tự động cộng dồn từ các món ăn bạn đã log hôm nay</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('food')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold shrink-0 liquid-glass-btn px-3 py-1.5 rounded-xl transition"
          >
            Quản lý chất
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {nutrients.map(n => {
            const current = nutrientTotals[n.id] || 0;
            const target = getEffectiveTarget(n);
            const pct = Math.min(100, Math.round((current / (target || 1)) * 100));
            const isPlanTarget = currentPlan && ['protein', 'carbs', 'fat', 'sodium', 'potassium', 'calcium', 'vitamin_d3', 'zinc', 'magnesium'].includes(n.id);

            return (
              <div key={n.id} className="liquid-glass p-3 rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
                {isPlanTarget && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" title="Chất này đã liên kết với Smart Plan" />
                )}
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">{n.name}</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    <strong className="text-white font-bold">{current}</strong> / {target} {n.unit}
                  </span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: n.color || '#10b981',
                      boxShadow: `0 0 8px ${n.color || '#10b981'}`
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. Active Plan Snapshot Card */}
      {currentPlan && (
        <div 
          onClick={() => onNavigate('plan')}
          className="liquid-glass-purple rounded-[28px] p-5 cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-2xl relative overflow-hidden group"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-white/30 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 fill-white stroke-none" />
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">LỘ TRÌNH ĐANG KÍCH HOẠT</h3>
                <h2 className="text-base font-extrabold text-white mt-0.5">{currentPlan.planName}</h2>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold liquid-glass-btn px-3 py-1.5 rounded-xl">
              <span>Xem chi tiết</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* 9. AI Coach Max Quick Banner */}
      <div 
        onClick={() => onNavigate('coach')}
        className="liquid-glass-cyan rounded-[28px] p-5 cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] shadow-2xl group relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-300 to-emerald-400 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] border border-white/40 group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6 stroke-[2.2px]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-white group-hover:text-cyan-200 transition-colors">Chat & Gọi Thoại Coach Max</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full liquid-glass-btn text-cyan-300 font-mono font-bold">ONLINE</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <PhoneCall className="w-3 h-3" />
                  <span>LIVE CALL</span>
                </span>
              </div>
              <p className="text-xs text-slate-300/80 mt-1 line-clamp-1">
                Đàm thoại giọng nói trực tiếp hoặc nhắn tin hỏi thực đơn, debloat và looksmaxxing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-cyan-300 font-bold shrink-0 ml-2 liquid-glass-btn px-3 py-1.5 rounded-xl">
            <span className="hidden sm:inline">Hỏi ngay</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>

    </div>
  );
};
