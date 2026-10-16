import React, { useState, useEffect } from 'react';
import { UserProfile, FoodItem, NutrientDefinition, SmartPlan, WorkoutBurnItem, StreakData } from '../types';
import { storageService } from '../services/storageService';
import { 
  Flame, 
  Droplet, 
  Zap, 
  Sparkles, 
  TrendingUp, 
  Plus, 
  ShieldCheck, 
  Check, 
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Calendar,
  Dumbbell,
  Award,
  Activity,
  TrendingDown
} from 'lucide-react';

interface DashboardViewProps {
  userProfile: UserProfile;
  todayFoodItems: FoodItem[];
  nutrients: NutrientDefinition[];
  currentPlan: SmartPlan | null;
  onNavigate: (tab: 'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan') => void;
  onWaterUpdate: (newAmount: number) => void;
  waterAmount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userProfile,
  todayFoodItems,
  nutrients,
  currentPlan,
  onNavigate,
  onWaterUpdate,
  waterAmount
}) => {
  // Streak & Start Date
  const [streakData, setStreakData] = useState<StreakData>(() => storageService.getStreakData());
  const startDate = userProfile.startDate || new Date(userProfile.createdAt || Date.now()).toISOString().slice(0, 10);
  const startTimestamp = new Date(startDate).getTime();
  const daysElapsed = Math.max(1, Math.floor((Date.now() - startTimestamp) / (1000 * 60 * 60 * 24)) + 1);

  // Workout burned calories for today
  const [workoutBurnItems, setWorkoutBurnItems] = useState<WorkoutBurnItem[]>(() => storageService.getTodayWorkoutBurn());

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
      case 'calcium':
        return currentPlan.calciumTarget || n.dailyTarget;
      case 'vitamin_d3':
        return currentPlan.vitaminD3Target || n.dailyTarget;
      case 'zinc':
        return currentPlan.zincTarget || n.dailyTarget;
      case 'magnesium':
        return currentPlan.magnesiumTarget || n.dailyTarget;
      default:
        return n.dailyTarget;
    }
  };

  const handleAddWater = (ml: number) => {
    const updated = storageService.addWater(ml);
    onWaterUpdate(updated);
  };

  // Quick Workout Burn Logger based on ~kg
  const handleQuickAddWorkout = (type: 'run' | 'gym' | 'walk' | 'debloat') => {
    let title = '';
    let duration = 30;
    let calories = 0;

    const w = userProfile.weight;
    switch (type) {
      case 'run':
        title = 'Chạy bộ Cardio đốt mỡ';
        duration = 30;
        calories = Math.round(0.13 * w * duration); // ~273 kcal for 70kg
        break;
      case 'gym':
        title = 'Tập Gym / Tạ Hypertrophy';
        duration = 45;
        calories = Math.round(0.08 * w * duration); // ~252 kcal for 70kg
        break;
      case 'walk':
        title = 'Đi bộ xả stress (5.000 bước)';
        duration = 40;
        calories = Math.round(0.05 * w * duration); // ~140 kcal for 70kg
        break;
      case 'debloat':
        title = 'Mewing & Bài tập xả nước mặt';
        duration = 20;
        calories = Math.round(0.04 * w * duration); // ~56 kcal for 70kg
        break;
    }

    const newItem = storageService.addWorkoutBurn({
      title,
      durationMinutes: duration,
      caloriesBurned: calories
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
    <div className="space-y-6 pb-20">
      
      {/* Top Welcome & Style Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {userProfile.age} TUỔI {userProfile.isPuberty ? '• DẬY THÌ TĂNG TRƯỞNG' : '• TRƯỞNG THÀNH'}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              {userProfile.aestheticStyle === 'asian_pretty_boy' ? '🌸 PRETTY BOY' : '⚔️ PSL WARRIOR'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Hôm nay của bạn</h1>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onNavigate('food')}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Log Bữa Ăn</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('looksmax')}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-purple-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Quét Mặt</span>
          </button>
        </div>
      </div>

      {/* 1. Daily Streak System & Start Date Milestone Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-orange-950/40 border border-amber-500/30 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 text-xl">
              🔥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  Chuỗi {streakData.currentStreak} Ngày Liên Tiếp
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Kỷ lục: {streakData.longestStreak} ngày
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Hành trình bắt đầu: <strong>{startDate}</strong> • <strong>Ngày thứ {daysElapsed}</strong> lột xác
              </p>
            </div>
          </div>

          {/* 7-Day Mini Streak Dots */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            {last7Days.map((d, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-[9px] text-slate-400">{d.dayName}</span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5 font-bold transition ${
                    d.isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/40'
                      : 'bg-slate-800 text-slate-500'
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

      {/* 2. Main Calories & Ring Widget */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-[#111928] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Calorie Stats */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs font-semibold">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>Năng Lượng Mục Tiêu Mỗi Ngày</span>
            </div>

            <div>
              <div className="flex items-baseline justify-center sm:justify-start gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">{totalCalories}</span>
                <span className="text-sm font-semibold text-slate-400">/ {targetCalories} kcal</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Còn lại <strong className="text-emerald-400">{remainingCalories} kcal</strong> để đạt mục tiêu siết mỡ cơ thể.
              </p>
            </div>

            {/* Macros Quick Bar */}
            <div className="flex gap-4 pt-1 justify-center sm:justify-start text-xs font-medium">
              <div>
                <span className="text-slate-500 text-[10px] block">PROTEIN</span>
                <span className="text-cyan-400 font-bold">{proteinTotal}g</span>
                <span className="text-[10px] text-slate-500"> / {currentPlan?.proteinTarget || Math.round(userProfile.weight * 2)}g</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">CARBS</span>
                <span className="text-amber-400 font-bold">{carbsTotal}g</span>
                <span className="text-[10px] text-slate-500"> / {currentPlan?.carbTarget || Math.round(userProfile.weight * 2.5)}g</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">FAT</span>
                <span className="text-rose-400 font-bold">{fatTotal}g</span>
                <span className="text-[10px] text-slate-500"> / {currentPlan?.fatTarget || Math.round(userProfile.weight * 0.8)}g</span>
              </div>
            </div>
          </div>

          {/* Radial Calorie Visualizer */}
          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="text-slate-800"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className="text-emerald-500 transition-all duration-700 ease-out"
                strokeWidth="10"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * caloriePercent) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white">{caloriePercent}%</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Đã Nạp</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Estimated Burned Calories (~kg bodyweight) & Deficit / Fat Loss Projection */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Ước Tính Calo Đốt Cháy Hôm Nay (~{userProfile.weight}kg)
              </h3>
              <p className="text-[11px] text-slate-400">Dựa theo thể trạng thực tế & bài tập bổ sung</p>
            </div>
          </div>
          
          <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-black">
            ~{totalBurnedToday} kcal tiêu thụ
          </span>
        </div>

        {/* Burn Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Chuyển Hóa Cơ Bản (BMR)</span>
            <span className="text-white font-extrabold text-sm">{bmr} kcal</span>
            <span className="text-[10px] text-slate-500 block">Duy trì sự sống</span>
          </div>
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Vận Động Sinh Hoạt</span>
            <span className="text-cyan-400 font-extrabold text-sm">{baseTdee - bmr} kcal</span>
            <span className="text-[10px] text-slate-500 block">Theo hệ số TDEE</span>
          </div>
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Bài Tập Hôm Nay</span>
            <span className="text-emerald-400 font-extrabold text-sm">+{workoutBurnTotal} kcal</span>
            <span className="text-[10px] text-slate-500 block">{workoutBurnItems.length} buổi tập</span>
          </div>
          <div className={`p-2.5 rounded-xl border ${
            deficitCalories > 0 ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-slate-950/80 border-slate-800'
          }`}>
            <span className="text-slate-400 block text-[10px]">Thâm Hụt (Deficit)</span>
            <span className={`font-extrabold text-sm ${deficitCalories > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {deficitCalories > 0 ? `-${deficitCalories}` : `+${Math.abs(deficitCalories)}`} kcal
            </span>
            <span className="text-[10px] text-slate-400 block">
              {deficitCalories > 0 ? `~${fatLossGramsToday}g mỡ/ngày` : 'Dư calo nhẹ'}
            </span>
          </div>
        </div>

        {/* Fat Loss Projection Badge */}
        {deficitCalories > 0 ? (
          <div className="p-3 bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Duy trì mức thâm hụt này: Dự kiến giảm <strong>~{fatLossKgWeek} kg mỡ thừa</strong> sau 7 ngày!
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest hidden sm:inline">
              SIẾT NÉT JAWLINE
            </span>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
            💡 Hiện tại calo nạp đang cao hơn mức đốt cháy. Hãy tăng vận động hoặc giảm khẩu phần bữa tối để tạo thâm hụt mỡ.
          </div>
        )}

        {/* Quick Workout Burn Logger Buttons */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 block">
            + Ghi nhận buổi tập nhanh (Tính calo theo ~{userProfile.weight}kg):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickAddWorkout('run')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/50 rounded-xl font-medium text-slate-200 transition text-left"
            >
              <div className="flex items-center gap-1 font-bold text-orange-400">
                <span>🏃 Chạy bộ 30p</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">+{Math.round(0.13 * userProfile.weight * 30)} kcal</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAddWorkout('gym')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl font-medium text-slate-200 transition text-left"
            >
              <div className="flex items-center gap-1 font-bold text-emerald-400">
                <span>🏋️ Tập Gym 45p</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">+{Math.round(0.08 * userProfile.weight * 45)} kcal</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAddWorkout('walk')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-xl font-medium text-slate-200 transition text-left"
            >
              <div className="flex items-center gap-1 font-bold text-cyan-400">
                <span>🚶 Đi bộ 40p</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">+{Math.round(0.05 * userProfile.weight * 40)} kcal</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickAddWorkout('debloat')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 rounded-xl font-medium text-slate-200 transition text-left"
            >
              <div className="flex items-center gap-1 font-bold text-purple-400">
                <span>🧘 Mewing / Cardio</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">+{Math.round(0.04 * userProfile.weight * 20)} kcal</span>
            </button>
          </div>
        </div>

      </div>

      {/* 4. Critical Electrolyte / Debloat Bar (Muối vs Kali) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Droplet className="w-4 h-4" />
            <span>Trạng Thái Debloat (Cân Bằng Natri / Kali)</span>
          </div>
          {sodiumTotal > 2000 ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-500/30">
              <AlertTriangle className="w-3 h-3" />
              Nguy cơ tích nước mặt cao
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              Tối ưu lộ nét Jawline
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Sodium */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Muối / Natri (Gây tích nước)</span>
              <span className="font-bold text-white">
                {sodiumTotal} / <span className="text-rose-400">{currentPlan?.sodiumTarget || 1600} mg</span>
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  sodiumTotal > 2000 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, (sodiumTotal / (currentPlan?.sodiumTarget || 1600)) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Potassium */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Kali (Xả mặn, thon gọn mặt)</span>
              <span className="font-bold text-white">
                {potassiumTotal} / <span className="text-cyan-400">{currentPlan?.potassiumTarget || 3800} mg</span>
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (potassiumTotal / (currentPlan?.potassiumTarget || 3800)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Water Intake Tracking Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Cấp Nước Thải Độc & Cắt Nét</h3>
          </div>
          <span className="text-xs font-bold text-cyan-400">
            {(waterAmount / 1000).toFixed(1)} / {currentPlan?.waterTargetLiters || 3.5} L ({waterPercent}%)
          </span>
        </div>

        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${waterPercent}%` }}
          ></div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleAddWater(250)}
            className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
          >
            +250ml
          </button>
          <button
            type="button"
            onClick={() => handleAddWater(500)}
            className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
          >
            +500ml
          </button>
          <button
            type="button"
            onClick={() => handleAddWater(1000)}
            className="flex-1 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold transition"
          >
            +1.000ml (1L)
          </button>
        </div>
      </div>

      {/* 6. Nutrients Detail List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Chi tiết các vi chất đang theo dõi ({nutrients.length})
              </h3>
              {currentPlan && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                  ⚡ Đồng bộ với Plan
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Tự động cộng dồn từ các món ăn bạn đã log hôm nay</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('food')}
            className="text-xs text-emerald-400 hover:underline font-bold shrink-0"
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
              <div key={n.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 relative overflow-hidden">
                {isPlanTarget && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" title="Chất này đã liên kết với Smart Plan" />
                )}
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">{n.name}</span>
                  <span className="font-mono text-slate-400">
                    <strong className="text-white">{current}</strong> / {target} {n.unit}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: n.color || '#10b981'
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Active Plan Snapshot Card */}
      {currentPlan && (
        <div 
          onClick={() => onNavigate('plan')}
          className="bg-gradient-to-r from-purple-950/30 via-slate-900 to-emerald-950/30 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 sm:p-5 cursor-pointer transition shadow-xl"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">LỘ TRÌNH ĐANG KÍCH HOẠT</h3>
                <h2 className="text-sm sm:text-base font-extrabold text-white mt-0.5">{currentPlan.planName}</h2>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-purple-400 font-bold">
              <span>Xem chi tiết</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* 8. AI Coach Max Quick Banner */}
      <div 
        onClick={() => onNavigate('coach')}
        className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-4 sm:p-5 cursor-pointer transition shadow-xl group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">Chat & Gọi Thoại Coach Max</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">ONLINE</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-0.5">📞 LIVE CALL</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                Đàm thoại giọng nói trực tiếp hoặc nhắn tin hỏi thực đơn, debloat và looksmaxxing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-cyan-400 font-bold shrink-0 ml-2">
            <span className="hidden sm:inline">Hỏi ngay</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>

    </div>
  );
};
