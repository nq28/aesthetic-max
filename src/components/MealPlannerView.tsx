import React, { useState, useEffect } from 'react';
import { UserProfile, SmartPlan, DailyMealPlan, PlannedMeal, DietType, FoodItem } from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  RotateCw, 
  Check, 
  Clock, 
  ChefHat, 
  ShoppingCart, 
  Copy, 
  Flame, 
  Droplet, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Utensils, 
  Share2,
  CheckSquare,
  Square,
  RefreshCw,
  Coins,
  Pencil,
  X
} from 'lucide-react';

interface MealPlannerViewProps {
  userProfile: UserProfile;
  currentPlan: SmartPlan | null;
  onFoodAdded: (item: FoodItem) => void;
  onNavigateToScan?: () => void;
}

const DIET_OPTIONS: { id: DietType; label: string; icon: string; desc: string }[] = [
  { id: 'vietnamese_home', label: 'Cơm Nhà Việt Nam', icon: '🍚', desc: 'Mâm cơm bình dân, thơm ngon, dễ mua ở chợ' },
  { id: 'eat_clean', label: 'Eat Clean GYM', icon: '🥗', desc: 'Ức gà, cá, yến mạch, chuẩn tăng cơ giảm mỡ' },
  { id: 'budget_student', label: 'Tiết Kiệm Sinh Viên', icon: '💰', desc: 'Dưới 45k/bữa nhưng vẫn đảm bảo đủ protein' },
  { id: 'quick_prep', label: 'Nhanh Gọn <15 Phút', icon: '⚡', desc: 'Chuẩn bị siêu nhanh cho người bận rộn' },
  { id: 'high_protein_veg', label: 'Chay Giàu Đạm', icon: '🌱', desc: 'Đậu phụ, nấm, hạt dinh dưỡng lành mạnh' }
];

const BUDGET_OPTIONS = [
  { value: 0, label: 'Tùy thích' },
  { value: 50000, label: 'Dưới 50k (Sinh viên)' },
  { value: 80000, label: '~80k (Tiết kiệm)' },
  { value: 120000, label: '~120k (Tiêu chuẩn)' },
  { value: 160000, label: '160k+ (Dồi dào GYM)' }
];

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  userProfile,
  currentPlan,
  onFoodAdded,
  onNavigateToScan
}) => {
  const [mealPlan, setMealPlan] = useState<DailyMealPlan | null>(() => {
    return storageService.getDailyMealPlan();
  });

  const [selectedDiet, setSelectedDiet] = useState<DietType>(() => {
    return mealPlan?.dietType || 'vietnamese_home';
  });

  const [selectedBudget, setSelectedBudget] = useState<number>(() => {
    return mealPlan?.dailyBudgetVnd ?? userProfile.foodBudgetPerDayVnd ?? 80000;
  });

  const [activeTab, setActiveTab] = useState<'meals' | 'grocery'>('meals');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [swappingMealId, setSwappingMealId] = useState<string | null>(null);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Edit Planned Meal state
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | null>(null);
  const [editMealName, setEditMealName] = useState<string>('');
  const [editMealCalories, setEditMealCalories] = useState<number>(0);
  const [editMealServing, setEditMealServing] = useState<string>('');
  const [editMealProtein, setEditMealProtein] = useState<number>(0);
  const [editMealCarbs, setEditMealCarbs] = useState<number>(0);
  const [editMealFat, setEditMealFat] = useState<number>(0);
  const [editMealSodium, setEditMealSodium] = useState<number>(0);
  const [editMealPotassium, setEditMealPotassium] = useState<number>(0);
  const [editMealCost, setEditMealCost] = useState<number>(25000);

  const openEditMealModal = (meal: PlannedMeal) => {
    setEditingMeal(meal);
    setEditMealName(meal.name);
    setEditMealCalories(meal.calories);
    setEditMealServing(meal.servingSize || '1 phần');
    setEditMealProtein(meal.protein);
    setEditMealCarbs(meal.carbs);
    setEditMealFat(meal.fat);
    setEditMealSodium(meal.sodium);
    setEditMealPotassium(meal.potassium);
    setEditMealCost(meal.estimatedCostVnd || 25000);
  };

  const handleSaveEditedMeal = () => {
    if (!editingMeal) return;
    const updatedMeal: PlannedMeal = {
      ...editingMeal,
      name: editMealName.trim() || editingMeal.name,
      calories: Math.max(0, editMealCalories),
      servingSize: editMealServing,
      protein: Math.max(0, editMealProtein),
      carbs: Math.max(0, editMealCarbs),
      fat: Math.max(0, editMealFat),
      sodium: Math.max(0, editMealSodium),
      potassium: Math.max(0, editMealPotassium),
      estimatedCostVnd: Math.max(0, editMealCost)
    };
    const updatedPlan = storageService.replaceMealInPlan(updatedMeal);
    if (updatedPlan) {
      setMealPlan(updatedPlan);
    }
    setToastMsg(`✏️ Đã cập nhật calo & bữa ăn "${updatedMeal.name}"!`);
    setTimeout(() => setToastMsg(null), 3000);
    setEditingMeal(null);
  };

  // Auto-generate if today doesn't have a plan yet
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!mealPlan || mealPlan.date !== today) {
      handleGeneratePlan(selectedDiet, selectedBudget);
    }
  }, []);

  // Generate / Reroll Entire Daily Meal Plan
  const handleGeneratePlan = async (dietToUse: DietType = selectedDiet, budgetToUse: number = selectedBudget) => {
    setIsGenerating(true);
    try {
      const plan = await geminiService.generateDailyMealPlan(userProfile, currentPlan, dietToUse, budgetToUse);
      setMealPlan(plan);
      storageService.saveDailyMealPlan(plan);
      setToastMsg('✨ Đã tạo thực đơn mới chuẩn Aesthetic & Debloat thành công!');
      setTimeout(() => setToastMsg(null), 3500);
      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      console.error(err);
      alert('Không thể tạo thực đơn: ' + (err?.message || 'Lỗi mạng hoặc API'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Swap / Reroll a single meal
  const handleSwapMeal = async (mealToSwap: PlannedMeal) => {
    if (!mealPlan) return;
    setSwappingMealId(mealToSwap.id);
    try {
      const newMeal = await geminiService.swapSingleMeal(userProfile, currentPlan, mealToSwap, selectedDiet, mealToSwap.estimatedCostVnd || 25000);
      
      const updatedMeals = mealPlan.meals.map(m => m.id === mealToSwap.id ? newMeal : m);
      
      // Recalculate totals
      const totalCalories = updatedMeals.reduce((acc, m) => acc + m.calories, 0);
      const totalProtein = updatedMeals.reduce((acc, m) => acc + m.protein, 0);
      const totalCarbs = updatedMeals.reduce((acc, m) => acc + m.carbs, 0);
      const totalFat = updatedMeals.reduce((acc, m) => acc + m.fat, 0);
      const totalSodium = updatedMeals.reduce((acc, m) => acc + m.sodium, 0);
      const totalPotassium = updatedMeals.reduce((acc, m) => acc + m.potassium, 0);
      const totalEstimatedCostVnd = updatedMeals.reduce((acc, m) => acc + (m.estimatedCostVnd || 0), 0);
      const debloatRatio = Number((totalPotassium / (totalSodium || 1)).toFixed(1));

      const updatedPlan: DailyMealPlan = {
        ...mealPlan,
        meals: updatedMeals,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalSodium,
        totalPotassium,
        totalEstimatedCostVnd,
        debloatRatio
      };

      setMealPlan(updatedPlan);
      storageService.saveDailyMealPlan(updatedPlan);
      setToastMsg(`🔄 Đã đổi món sang "${newMeal.name}"!`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Không thể đổi món: ' + (err?.message || 'Vui lòng thử lại'));
    } finally {
      setSwappingMealId(null);
    }
  };

  // 1-Click: Log planned meal to today's food tracker
  const handleLogPlannedMeal = (meal: PlannedMeal) => {
    if (meal.logged) {
      alert('Món này đã được lưu vào nhật ký ăn uống hôm nay rồi!');
      return;
    }

    try {
      const foodItem: Omit<FoodItem, 'id' | 'timestamp'> = {
        name: meal.name,
        mealType: meal.mealType,
        calories: meal.calories,
        servingSize: meal.servingSize,
        nutrients: {
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          sodium: meal.sodium,
          potassium: meal.potassium
        },
        aiNotes: `Thực đơn AI đề xuất (${meal.prepTimeMinutes}p chuẩn bị) • Tỷ lệ xả nước Kali:Natri cao.`
      };

      const saved = storageService.addFoodItem(foodItem);
      storageService.markPlannedMealLogged(meal.id);
      
      // Update local state
      if (mealPlan) {
        const updatedMeals = mealPlan.meals.map(m => m.id === meal.id ? { ...m, logged: true } : m);
        setMealPlan({ ...mealPlan, meals: updatedMeals });
      }

      onFoodAdded(saved);
      setToastMsg(`🎉 Đã nạp "${meal.name}" (${meal.calories} kcal) vào nhật ký calo!`);
      setTimeout(() => setToastMsg(null), 3500);

      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      } catch {}
    } catch (err: any) {
      console.error(err);
      alert('Lỗi lưu nhật ký: ' + err?.message);
    }
  };

  // Toggle grocery item checkbox
  const handleToggleGrocery = (catIdx: number, itemIdx: number) => {
    storageService.toggleGroceryItem(catIdx, itemIdx);
    if (!mealPlan) return;
    const list = [...mealPlan.groceryList];
    const items = [...list[catIdx].items];
    items[itemIdx] = { ...items[itemIdx], checked: !items[itemIdx].checked };
    list[catIdx] = { ...list[catIdx], items };
    setMealPlan({ ...mealPlan, groceryList: list });
  };

  // Copy Menu to Clipboard
  const handleCopyMenu = () => {
    if (!mealPlan) return;
    const lines = [
      `🌟 THỰC ĐƠN HÔM NAY (${mealPlan.date}) - AESTHETIC MAX`,
      `🎯 Mục tiêu: ${mealPlan.totalCalories} kcal | P: ${mealPlan.totalProtein}g | C: ${mealPlan.totalCarbs}g | F: ${mealPlan.totalFat}g`,
      `💧 Tỷ lệ Xả Nước (K:Na): ${mealPlan.debloatRatio} : 1 (${mealPlan.debloatScore})`,
      '',
      ...mealPlan.meals.map(m => {
        const mealTitle = m.mealType === 'breakfast' ? '🍳 BỮA SÁNG' : m.mealType === 'lunch' ? '🥗 BỮA TRƯA' : m.mealType === 'dinner' ? '🍲 BỮA TỐI' : '🍎 BỮA PHỤ';
        return `${mealTitle}: ${m.name}\n- Khẩu phần: ${m.servingSize}\n- Calo: ${m.calories} kcal (P:${m.protein}g C:${m.carbs}g F:${m.fat}g)\n- Thời gian: ~${m.prepTimeMinutes} phút\n- Nguyên liệu: ${m.ingredients.join(', ')}\n`;
      }),
      '👨‍🍳 Lời khuyên từ Coach: ' + mealPlan.aiChefAdvice
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMsg('Đã sao chép thực đơn vào Clipboard!');
    setTimeout(() => setCopiedMsg(null), 3000);
  };

  // Copy Grocery List to Clipboard
  const handleCopyGrocery = () => {
    if (!mealPlan || !mealPlan.groceryList) return;
    const lines = [
      `🛒 DANH SÁCH ĐI CHỢ - AESTHETIC MAX (${mealPlan.date})`,
      '',
      ...mealPlan.groceryList.map(cat => {
        const catLines = cat.items.map(it => `[${it.checked ? 'X' : ' '}] ${it.name} (${it.amount})`);
        return `📌 ${cat.category.toUpperCase()}:\n${catLines.join('\n')}\n`;
      })
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMsg('Đã sao chép danh sách đi chợ!');
    setTimeout(() => setCopiedMsg(null), 3000);
  };

  const targetCal = currentPlan?.calorieTarget || userProfile.dailyCalorieTarget;
  const calDiff = mealPlan ? mealPlan.totalCalories - targetCal : 0;

  // Grocery progress
  const totalGroceryItems = mealPlan?.groceryList?.reduce((acc, cat) => acc + cat.items.length, 0) || 0;
  const checkedGroceryItems = mealPlan?.groceryList?.reduce((acc, cat) => acc + cat.items.filter(i => i.checked).length, 0) || 0;
  const groceryProgressPercent = totalGroceryItems > 0 ? Math.round((checkedGroceryItems / totalGroceryItems) * 100) : 0;

  return (
    <div className="space-y-5 pb-20">
      
      {/* Top Banner Card */}
      <div className="liquid-glass-emerald rounded-[28px] p-5 sm:p-6 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <ChefHat className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_#34d399]" />
              <span>AI Daily Meal Planner & Debloat Chef</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Thực Đơn Cá Nhân Hóa Hàng Ngày</h1>
            <p className="text-xs text-slate-300/80 mt-1 max-w-xl">
              Thực đơn tự động tính toán chính xác calo, chuẩn vi chất tăng cơ & giàu Kali xả nước mặt (Debloat) để lộ đường nét góc cạnh Jawline.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleGeneratePlan(selectedDiet)}
              disabled={isGenerating}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black transition-all duration-200 shadow-lg active:scale-95 ${
                isGenerating
                  ? 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.35)] border border-white/30'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Đang Lên Thực Đơn...' : 'Đổi Toàn Bộ Thực Đơn'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMenu}
              disabled={!mealPlan}
              title="Sao chép thực đơn để gửi hoặc lưu"
              className="p-2.5 liquid-glass-btn text-slate-300 hover:text-white rounded-2xl text-xs font-semibold transition shrink-0 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diet Style Selector Pills */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
            Phong cách ăn uống yêu thích:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {DIET_OPTIONS.map((diet) => {
              const isSelected = selectedDiet === diet.id;
              return (
                <button
                  key={diet.id}
                  type="button"
                  onClick={() => {
                    setSelectedDiet(diet.id);
                    handleGeneratePlan(diet.id);
                  }}
                  disabled={isGenerating}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border ${
                    isSelected
                      ? 'liquid-pill-active text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'liquid-glass text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{diet.icon}</span>
                  <span>{diet.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget Selector Pills */}
        <div className="mt-3 pt-2.5 border-t border-white/10">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Ngân sách ăn uống dự kiến:</span>
            </span>
            {selectedBudget > 0 && (
              <span className="text-[11px] font-bold text-amber-300">
                Mục tiêu: ~{selectedBudget.toLocaleString('vi-VN')} đ/ngày
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {BUDGET_OPTIONS.map((b) => {
              const isSelected = selectedBudget === b.value;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => {
                    setSelectedBudget(b.value);
                    handleGeneratePlan(selectedDiet, b.value);
                  }}
                  disabled={isGenerating}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border ${
                    isSelected
                      ? 'bg-amber-500/25 border-amber-400/50 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                      : 'liquid-glass text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast Alert Feedback */}
      {toastMsg && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {copiedMsg && (
        <div className="p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-300 flex items-center gap-2 shadow-lg animate-fade-in">
          <Copy className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{copiedMsg}</span>
        </div>
      )}

      {/* Sub Tabs: 4 Bữa Ăn vs Danh Sách Đi Chợ */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('meals')}
          className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'meals'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>4 Bữa Ăn Hôm Nay ({mealPlan?.meals.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grocery')}
          className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold transition border-b-2 relative ${
            activeTab === 'grocery'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Danh Sách Đi Chợ ({checkedGroceryItems}/{totalGroceryItems})</span>
          {checkedGroceryItems > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'meals' && (
        <div className="space-y-4">
          
          {/* Nutrition & Debloat Summary Matrix */}
          {mealPlan && (
            <div className="liquid-glass-card rounded-[28px] p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TỔNG QUAN DINH DƯỠNG THỰC ĐƠN</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">{mealPlan.totalCalories}</span>
                    <span className="text-xs text-slate-400 font-medium">/ Mục tiêu: {targetCal} kcal</span>
                    {calDiff !== 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        Math.abs(calDiff) <= 100 ? 'liquid-pill-active text-emerald-200' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {calDiff > 0 ? `+${calDiff}` : calDiff} kcal
                      </span>
                    )}
                  </div>
                </div>

                {/* Debloat Pill */}
                <div className="flex items-center gap-2.5 liquid-glass px-3.5 py-2 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <Droplet className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Tỷ lệ Xả Nước K:Na</div>
                    <div className="text-xs font-black text-cyan-300 flex items-center gap-1">
                      <span>{mealPlan.debloatRatio}:1</span>
                      <span className="text-[10px] text-emerald-400 font-normal">({mealPlan.debloatScore})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Macro Bars */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-medium">Protein</div>
                  <div className="text-sm font-black text-emerald-300 mt-0.5">{mealPlan.totalProtein}g</div>
                </div>
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-medium">Carbs</div>
                  <div className="text-sm font-black text-amber-300 mt-0.5">{mealPlan.totalCarbs}g</div>
                </div>
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-medium">Chất béo (Fat)</div>
                  <div className="text-sm font-black text-rose-300 mt-0.5">{mealPlan.totalFat}g</div>
                </div>
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
                  <div className="text-[10px] text-slate-400 font-medium">Kali (Xả nước)</div>
                  <div className="text-sm font-black text-cyan-300 mt-0.5">{mealPlan.totalPotassium}mg</div>
                </div>
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400 font-medium">Natri (Muối)</div>
                  <div className="text-sm font-black text-slate-300 mt-0.5">{mealPlan.totalSodium}mg</div>
                </div>
              </div>

              {/* Estimated Budget & Cost Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 liquid-glass p-3.5 rounded-2xl border border-amber-500/25 text-xs">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-400">Chi phí dự kiến cả ngày: </span>
                    <span className="font-black text-amber-300">
                      ~{(mealPlan.totalEstimatedCostVnd || 80000).toLocaleString('vi-VN')} đ
                    </span>
                    {selectedBudget > 0 && (
                      <span className="text-slate-500 ml-1">
                        / Ngân sách: {selectedBudget.toLocaleString('vi-VN')} đ
                      </span>
                    )}
                  </div>
                </div>

                {selectedBudget > 0 && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    (mealPlan.totalEstimatedCostVnd || 80000) <= selectedBudget
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {(mealPlan.totalEstimatedCostVnd || 80000) <= selectedBudget
                      ? '✓ Trong ngân sách'
                      : 'Vượt nhẹ ngân sách'}
                  </span>
                )}
              </div>

              {/* AI Chef Advice */}
              {mealPlan.aiChefAdvice && (
                <div className="liquid-glass-emerald border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200/90 flex items-start gap-2.5 shadow-md">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{mealPlan.aiChefAdvice}</span>
                </div>
              )}
            </div>
          )}

          {/* Loading Skeleton */}
          {isGenerating && !mealPlan && (
            <div className="liquid-glass-card rounded-[28px] p-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-bold text-white">Gemini AI Đang Tính Toán & Soạn Thực Đơn...</p>
              <p className="text-xs text-slate-400">Đang tối ưu hàm lượng Kali, cắt giảm Natri và cân bằng macro.</p>
            </div>
          )}

          {/* Meal Cards */}
          {mealPlan && mealPlan.meals.map((meal, index) => {
            const isSwapping = swappingMealId === meal.id;
            const isExpanded = expandedMealId === meal.id;
            const mealLabel = meal.mealType === 'breakfast' 
              ? 'Bữa Sáng' 
              : meal.mealType === 'lunch' 
              ? 'Bữa Trưa' 
              : meal.mealType === 'dinner' 
              ? 'Bữa Tối' 
              : 'Bữa Phụ';

            const mealColor = meal.mealType === 'breakfast'
              ? 'from-amber-500/25 to-orange-500/15 text-amber-300 border-amber-500/40'
              : meal.mealType === 'lunch'
              ? 'from-emerald-500/25 to-teal-500/15 text-emerald-300 border-emerald-500/40'
              : meal.mealType === 'dinner'
              ? 'from-cyan-500/25 to-blue-500/15 text-cyan-300 border-cyan-500/40'
              : 'from-purple-500/25 to-pink-500/15 text-purple-300 border-purple-500/40';

            return (
              <div
                key={meal.id}
                className={`liquid-glass-card rounded-[28px] p-5 sm:p-6 transition-all duration-300 shadow-2xl relative overflow-hidden group ${
                  meal.logged 
                    ? 'border-emerald-500/40 bg-emerald-950/10' 
                    : 'hover:border-white/20'
                }`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black border bg-gradient-to-r ${mealColor} shadow-sm`}>
                      {mealLabel}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {meal.prepTimeMinutes} phút
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      <Coins className="w-3 h-3 text-amber-400" />
                      ~{(meal.estimatedCostVnd || 25000).toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditMealModal(meal)}
                    className="text-right flex items-center gap-1.5 px-3 py-1.5 rounded-2xl liquid-glass-btn hover:border-emerald-400/50 transition group"
                    title="Chạm để sửa calo"
                  >
                    <div>
                      <span className="text-base font-black text-white group-hover:text-emerald-300">{meal.calories}</span>
                      <span className="text-xs text-slate-400 ml-1">kcal</span>
                    </div>
                    <Pencil className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-300" />
                  </button>
                </div>

                {/* Meal Name & Description */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{meal.name}</span>
                    {meal.logged && (
                      <span className="px-2.5 py-0.5 rounded-full liquid-pill-active text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đã ăn
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Khẩu phần: {meal.servingSize}</p>
                  {meal.description && (
                    <p className="text-xs text-slate-300 mt-1.5 italic bg-white/[0.02] p-2 rounded-xl border border-white/5">{meal.description}</p>
                  )}
                </div>

                {/* Macro Pills */}
                <div className="flex items-center gap-2 mt-3 text-[11px] flex-wrap">
                  <span className="liquid-glass px-2.5 py-1 rounded-lg text-emerald-300 font-semibold border border-white/10">
                    P: {meal.protein}g
                  </span>
                  <span className="liquid-glass px-2.5 py-1 rounded-lg text-amber-300 font-semibold border border-white/10">
                    C: {meal.carbs}g
                  </span>
                  <span className="liquid-glass px-2.5 py-1 rounded-lg text-rose-300 font-semibold border border-white/10">
                    F: {meal.fat}g
                  </span>
                  <span className="liquid-glass px-2.5 py-1 rounded-lg text-cyan-300 font-semibold border border-white/10">
                    Kali: {meal.potassium}mg
                  </span>
                  <span className="text-slate-400 text-[10px] px-1">
                    Muối: {meal.sodium}mg
                  </span>
                </div>

                {/* Expandable Recipe & Ingredients Section */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-3 animate-fade-in text-xs">
                    <div>
                      <div className="font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Nguyên liệu chính:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {meal.ingredients.map((ing, iIdx) => (
                          <span key={iIdx} className="liquid-glass px-2.5 py-1 rounded-xl border border-white/10 text-slate-300">
                            • {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    {meal.recipeQuickSteps && meal.recipeQuickSteps.length > 0 && (
                      <div className="mt-2.5">
                        <div className="font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                          <span>👨‍🍳</span>
                          <span>Các bước nấu nhanh:</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-300/90 pl-1">
                          {meal.recipeQuickSteps.map((step, sIdx) => (
                            <li key={sIdx} className="leading-relaxed">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition py-1"
                  >
                    <span>{isExpanded ? 'Thu gọn' : 'Xem nguyên liệu & nấu'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditMealModal(meal)}
                      className="px-3 py-1.5 liquid-glass-btn text-slate-300 hover:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                      title="Sửa calo & thông tin bữa ăn"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sửa calo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwapMeal(meal)}
                      disabled={isSwapping}
                      className="px-3 py-1.5 liquid-glass-btn text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                    >
                      <RotateCw className={`w-3 h-3 ${isSwapping ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>{isSwapping ? 'Đang đổi...' : 'Đổi món'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLogPlannedMeal(meal)}
                      disabled={meal.logged}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-lg ${
                        meal.logged
                          ? 'liquid-glass text-slate-500 cursor-not-allowed border-white/5'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/25 hover:brightness-110 active:scale-95'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{meal.logged ? 'Đã ăn' : 'Nạp'}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}

        </div>
      )}

      {/* Grocery / Shopping List Tab */}
      {activeTab === 'grocery' && (
        <div className="liquid-glass-card rounded-[28px] p-5 sm:p-6 space-y-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>Danh Sách Đi Chợ Cho Cả Ngày</span>
              </h2>
              <p className="text-xs text-slate-300/80 mt-0.5">
                Tổng hợp đầy đủ nguyên liệu của cả 4 bữa ăn để bạn đi chợ hoặc siêu thị một lần là xong.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyGrocery}
              className="flex items-center gap-1.5 px-3.5 py-1.5 liquid-glass-btn text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao Chép Danh Sách Đi Chợ</span>
            </button>
          </div>

          {/* Progress Bar & Estimated Basket Total */}
          <div className="space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Tiến độ mua sắm:</span>
              <span className="font-bold text-emerald-300">{checkedGroceryItems} / {totalGroceryItems} món ({groceryProgressPercent}%)</span>
            </div>
            <div className="w-full liquid-glass h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow-sm shadow-emerald-500/50"
                style={{ width: `${groceryProgressPercent}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl liquid-glass border border-white/10 text-xs mt-1">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Tổng tiền đi chợ dự kiến:</span>
              </div>
              <span className="font-black text-amber-300 text-sm">
                ~{(mealPlan?.totalEstimatedCostVnd || 80000).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Categories Grid */}
          {mealPlan?.groceryList && mealPlan.groceryList.map((category, catIdx) => (
            <div key={catIdx} className="liquid-glass rounded-2xl p-4 border border-white/10 space-y-3">
              <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                <span>{category.category}</span>
                <span className="text-[10px] text-slate-400 font-mono">({category.items.filter(i => i.checked).length}/{category.items.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {category.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    onClick={() => handleToggleGrocery(catIdx, itemIdx)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition border text-xs ${
                      item.checked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-500 line-through'
                        : 'liquid-glass border-white/5 text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className={item.checked ? 'text-slate-500' : 'text-slate-200'}>
                        {item.name}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <span>{item.amount}</span>
                      {item.estimatedCostVnd && (
                        <span className="text-amber-400/90 font-mono">~{item.estimatedCostVnd.toLocaleString('vi-VN')}đ</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!mealPlan?.groceryList || mealPlan.groceryList.length === 0) && (
            <div className="text-center py-8 text-xs text-slate-400">
              Chưa có danh sách đi chợ. Hãy bấm "Tạo / Đổi thực đơn" để sinh danh sách tự động!
            </div>
          )}
        </div>
      )}

      {/* Modal: Edit Planned Meal & Calories */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="liquid-glass rounded-[32px] border border-white/20 w-full max-w-md p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Chỉnh Sửa Calo • {editingMeal.mealType === 'breakfast' ? 'Bữa Sáng' : editingMeal.mealType === 'lunch' ? 'Bữa Trưa' : editingMeal.mealType === 'dinner' ? 'Bữa Tối' : 'Bữa Phụ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl liquid-glass-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Tên món ăn trong thực đơn:</label>
                <input
                  type="text"
                  value={editMealName}
                  onChange={(e) => setEditMealName(e.target.value)}
                  className="w-full px-3.5 py-2.5 liquid-glass-input rounded-xl text-white text-sm"
                />
              </div>

              {/* Calories Editor with quick buttons */}
              <div className="liquid-glass-emerald p-4 rounded-2xl border border-emerald-500/30">
                <label className="block text-emerald-300 font-bold mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>Lượng Calories (Tự do chỉnh sửa):</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMealCalories(prev => Math.max(0, prev - 50))}
                    className="px-3 py-2 liquid-glass-btn active:scale-95 text-slate-200 font-bold rounded-xl transition"
                    title="Giảm 50 calo"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMealCalories(prev => Math.max(0, prev - 10))}
                    className="px-3 py-2 liquid-glass-btn active:scale-95 text-slate-200 font-bold rounded-xl transition"
                    title="Giảm 10 calo"
                  >
                    -10
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={editMealCalories}
                    onChange={(e) => setEditMealCalories(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center font-black text-emerald-300 text-2xl py-1.5 liquid-glass border border-emerald-500/30 rounded-xl focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setEditMealCalories(prev => prev + 10)}
                    className="px-3 py-2 liquid-glass-btn active:scale-95 text-slate-200 font-bold rounded-xl transition"
                    title="Tăng 10 calo"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMealCalories(prev => prev + 50)}
                    className="px-3 py-2 liquid-glass-btn active:scale-95 text-slate-200 font-bold rounded-xl transition"
                    title="Tăng 50 calo"
                  >
                    +50
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Khẩu phần:</label>
                  <input
                    type="text"
                    value={editMealServing}
                    onChange={(e) => setEditMealServing(e.target.value)}
                    placeholder="1 đĩa, 200g..."
                    className="w-full px-3 py-2 liquid-glass-input rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ước tính giá (VNĐ):</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editMealCost}
                    onChange={(e) => setEditMealCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 liquid-glass-input rounded-xl text-amber-300 font-bold text-xs"
                  />
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Protein (g):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealProtein}
                    onChange={(e) => setEditMealProtein(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 liquid-glass-input rounded-xl text-emerald-300 font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Carbs (g):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealCarbs}
                    onChange={(e) => setEditMealCarbs(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 liquid-glass-input rounded-xl text-amber-300 font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Fat (g):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealFat}
                    onChange={(e) => setEditMealFat(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 liquid-glass-input rounded-xl text-rose-300 font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Kali (mg - xả nước):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealPotassium}
                    onChange={(e) => setEditMealPotassium(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 liquid-glass-input rounded-xl text-cyan-300 font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Muối/Natri (mg):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealSodium}
                    onChange={(e) => setEditMealSodium(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 liquid-glass-input rounded-xl text-slate-300 font-semibold text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="flex-1 py-2.5 liquid-glass-btn text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditedMeal}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/25"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Lưu & Cập Nhật</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
