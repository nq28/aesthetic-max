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
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ChefHat className="w-4 h-4" />
              <span>AI Daily Meal Planner & Debloat Chef</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Thực Đơn Cá Nhân Hóa Hàng Ngày</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Thực đơn tự động tính toán chính xác calo, chuẩn vi chất tăng cơ & giàu Kali xả nước mặt (Debloat) để lộ đường nét góc cạnh Jawline.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleGeneratePlan(selectedDiet)}
              disabled={isGenerating}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                isGenerating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
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
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700 shrink-0"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diet Style Selector Pills */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Phong cách ăn uống yêu thích:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
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
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Ngân sách ăn uống dự kiến:</span>
            </span>
            {selectedBudget > 0 && (
              <span className="text-[11px] font-bold text-amber-400">
                Mục tiêu: ~{selectedBudget.toLocaleString('vi-VN')} đ/ngày
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
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
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TỔNG QUAN DINH DƯỠNG THỰC ĐƠN</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-white">{mealPlan.totalCalories}</span>
                    <span className="text-xs text-slate-400">/ Mục tiêu: {targetCal} kcal</span>
                    {calDiff !== 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        Math.abs(calDiff) <= 100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {calDiff > 0 ? `+${calDiff}` : calDiff} kcal
                      </span>
                    )}
                  </div>
                </div>

                {/* Debloat Pill */}
                <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Droplet className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Tỷ lệ Xả Nước K:Na</div>
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                      <span>{mealPlan.debloatRatio}:1</span>
                      <span className="text-[10px] text-emerald-400 font-normal">({mealPlan.debloatScore})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Macro Bars */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1 text-center">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Protein</div>
                  <div className="text-sm font-bold text-emerald-400">{mealPlan.totalProtein}g</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Carbs</div>
                  <div className="text-sm font-bold text-amber-400">{mealPlan.totalCarbs}g</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Chất béo (Fat)</div>
                  <div className="text-sm font-bold text-rose-400">{mealPlan.totalFat}g</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Kali (Xả nước)</div>
                  <div className="text-sm font-bold text-cyan-400">{mealPlan.totalPotassium}mg</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400">Natri (Muối)</div>
                  <div className="text-sm font-bold text-slate-300">{mealPlan.totalSodium}mg</div>
                </div>
              </div>

              {/* Estimated Budget & Cost Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-400">Chi phí dự kiến cả ngày: </span>
                    <span className="font-black text-amber-400">
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
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    (mealPlan.totalEstimatedCostVnd || 80000) <= selectedBudget
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {(mealPlan.totalEstimatedCostVnd || 80000) <= selectedBudget
                      ? '✓ Trong ngân sách'
                      : 'Vượt nhẹ ngân sách'}
                  </span>
                )}
              </div>

              {/* AI Chef Advice */}
              {mealPlan.aiChefAdvice && (
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200/90 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{mealPlan.aiChefAdvice}</span>
                </div>
              )}
            </div>
          )}

          {/* Loading Skeleton */}
          {isGenerating && !mealPlan && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
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
              ? 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30'
              : meal.mealType === 'lunch'
              ? 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30'
              : meal.mealType === 'dinner'
              ? 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30'
              : 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30';

            return (
              <div
                key={meal.id}
                className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 transition shadow-lg ${
                  meal.logged 
                    ? 'border-emerald-500/40 bg-slate-900/40' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-gradient-to-r ${mealColor}`}>
                      {mealLabel}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {meal.prepTimeMinutes} phút
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <Coins className="w-3 h-3 text-amber-400" />
                      ~{(meal.estimatedCostVnd || 25000).toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditMealModal(meal)}
                    className="text-right flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 transition group"
                    title="Chạm để sửa calo"
                  >
                    <div>
                      <span className="text-lg font-black text-white group-hover:text-emerald-400">{meal.calories}</span>
                      <span className="text-xs text-slate-400 ml-1">kcal</span>
                    </div>
                    <Pencil className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                  </button>
                </div>

                {/* Meal Name & Description */}
                <div className="mt-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{meal.name}</span>
                    {meal.logged && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đã ăn
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Khẩu phần: {meal.servingSize}</p>
                  {meal.description && (
                    <p className="text-xs text-slate-300 mt-1 italic">{meal.description}</p>
                  )}
                </div>

                {/* Macro Pills */}
                <div className="flex items-center gap-2.5 mt-3 text-[11px]">
                  <span className="bg-slate-950 px-2 py-1 rounded-md text-emerald-400 font-medium border border-slate-800">
                    P: {meal.protein}g
                  </span>
                  <span className="bg-slate-950 px-2 py-1 rounded-md text-amber-400 font-medium border border-slate-800">
                    C: {meal.carbs}g
                  </span>
                  <span className="bg-slate-950 px-2 py-1 rounded-md text-rose-400 font-medium border border-slate-800">
                    F: {meal.fat}g
                  </span>
                  <span className="bg-slate-950 px-2 py-1 rounded-md text-cyan-400 font-medium border border-slate-800">
                    Kali: {meal.potassium}mg
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    Muối: {meal.sodium}mg
                  </span>
                </div>

                {/* Expandable Recipe & Ingredients Section */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 space-y-2.5 animate-fade-in text-xs">
                    <div>
                      <div className="font-bold text-slate-300 mb-1">🛒 Nguyên liệu chính:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {meal.ingredients.map((ing, iIdx) => (
                          <span key={iIdx} className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-slate-300">
                            • {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    {meal.recipeQuickSteps && meal.recipeQuickSteps.length > 0 && (
                      <div className="mt-2">
                        <div className="font-bold text-slate-300 mb-1">👨‍🍳 Các bước nấu nhanh:</div>
                        <ol className="list-decimal list-inside space-y-1 text-slate-400">
                          {meal.recipeQuickSteps.map((step, sIdx) => (
                            <li key={sIdx} className="leading-relaxed">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
                  >
                    <span>{isExpanded ? 'Thu gọn' : 'Xem nguyên liệu & cách nấu'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditMealModal(meal)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1 transition border border-slate-700"
                      title="Sửa calo & thông tin bữa ăn"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sửa calo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwapMeal(meal)}
                      disabled={isSwapping}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
                    >
                      <RotateCw className={`w-3 h-3 ${isSwapping ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>{isSwapping ? 'Đang đổi...' : 'Đổi món'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLogPlannedMeal(meal)}
                      disabled={meal.logged}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md ${
                        meal.logged
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>Danh Sách Đi Chợ Cho Cả Ngày</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tổng hợp đầy đủ nguyên liệu của cả 4 bữa ăn để bạn đi chợ hoặc siêu thị một lần là xong.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyGrocery}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition border border-slate-700"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao Chép Danh Sách Đi Chợ</span>
            </button>
          </div>

          {/* Progress Bar & Estimated Basket Total */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tiến độ mua sắm:</span>
              <span className="font-bold text-emerald-400">{checkedGroceryItems} / {totalGroceryItems} món ({groceryProgressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${groceryProgressPercent}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs mt-1">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Tổng tiền đi chợ dự kiến:</span>
              </div>
              <span className="font-bold text-amber-400">
                ~{(mealPlan?.totalEstimatedCostVnd || 80000).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Categories Grid */}
          {mealPlan?.groceryList && mealPlan.groceryList.map((category, catIdx) => (
            <div key={catIdx} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {category.category} ({category.items.filter(i => i.checked).length}/{category.items.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {category.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    onClick={() => handleToggleGrocery(catIdx, itemIdx)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition border text-xs ${
                      item.checked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-500 line-through'
                        : 'bg-slate-900 border-slate-800/80 text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
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
                        <span className="text-amber-400/80 font-mono">~{item.estimatedCostVnd.toLocaleString('vi-VN')}đ</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!mealPlan?.groceryList || mealPlan.groceryList.length === 0) && (
            <div className="text-center py-8 text-xs text-slate-500">
              Chưa có danh sách đi chợ. Hãy bấm "Tạo / Đổi thực đơn" để sinh danh sách tự động!
            </div>
          )}
        </div>
      )}

      {/* Modal: Edit Planned Meal & Calories */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Chỉnh Sửa Calo • {editingMeal.mealType === 'breakfast' ? 'Bữa Sáng' : editingMeal.mealType === 'lunch' ? 'Bữa Trưa' : editingMeal.mealType === 'dinner' ? 'Bữa Tối' : 'Bữa Phụ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Tên món ăn trong thực đơn:</label>
                <input
                  type="text"
                  value={editMealName}
                  onChange={(e) => setEditMealName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Calories Editor with quick buttons */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30">
                <label className="block text-emerald-400 font-bold mb-1.5 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>Lượng Calories (Tự do chỉnh sửa):</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMealCalories(prev => Math.max(0, prev - 50))}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold rounded-lg transition"
                    title="Giảm 50 calo"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMealCalories(prev => Math.max(0, prev - 10))}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold rounded-lg transition"
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
                    className="flex-1 text-center font-black text-emerald-400 text-xl py-1 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setEditMealCalories(prev => prev + 10)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold rounded-lg transition"
                    title="Tăng 10 calo"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMealCalories(prev => prev + 50)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold rounded-lg transition"
                    title="Tăng 50 calo"
                  >
                    +50
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Khẩu phần:</label>
                  <input
                    type="text"
                    value={editMealServing}
                    onChange={(e) => setEditMealServing(e.target.value)}
                    placeholder="1 đĩa, 200g..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ước tính giá (VNĐ):</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editMealCost}
                    onChange={(e) => setEditMealCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-amber-400 font-medium text-xs focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-semibold text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Carbs (g):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealCarbs}
                    onChange={(e) => setEditMealCarbs(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 font-semibold text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Fat (g):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealFat}
                    onChange={(e) => setEditMealFat(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-rose-400 font-semibold text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Kali (mg - xả nước):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealPotassium}
                    onChange={(e) => setEditMealPotassium(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-cyan-400 font-semibold text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Muối/Natri (mg):</label>
                  <input
                    type="number"
                    min="0"
                    value={editMealSodium}
                    onChange={(e) => setEditMealSodium(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-semibold text-xs focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditedMeal}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Lưu & Cập Nhật Tổng</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
