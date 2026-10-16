import React, { useState } from 'react';
import { UserProfile, AestheticStyle, PhysiqueGoal, ActivityLevel, SmartPlan } from '../types';
import { storageService } from '../services/storageService';
import { geminiService, AiRoadmapResult } from '../services/geminiService';
import { Sparkles, ArrowRight, ShieldAlert, Award, User, Target, Flame, HeartPulse, Check, Plus, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile, plan: SmartPlan) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [age, setAge] = useState<number>(19);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(68);
  const [currentBodyFat, setCurrentBodyFat] = useState<number>(18);
  const [targetBodyFat, setTargetBodyFat] = useState<number>(12);
  const [aestheticStyle, setAestheticStyle] = useState<AestheticStyle>('asian_pretty_boy');
  
  // Multi-select & Custom Goals State
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['jawline_shred', 'lean_cut']);
  const [customGoals, setCustomGoals] = useState<string[]>([]);
  const [customGoalInput, setCustomGoalInput] = useState<string>('');
  
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');

  // AI Calculation State
  const [isCalculatingAi, setIsCalculatingAi] = useState<boolean>(false);
  const [aiRoadmap, setAiRoadmap] = useState<AiRoadmapResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const isPuberty = age < 18;

  const STANDARD_GOALS = [
    { id: 'jawline_shred', title: 'Siết Jawline & Debloat', desc: 'Cắt mỡ mặt, giảm sưng' },
    { id: 'lean_cut', title: 'Giảm cân siết mỡ', desc: 'Giảm mỡ toàn diện' },
    { id: 'recomp', title: 'Tăng cơ giảm mỡ', desc: 'Body Recomposition' },
    { id: 'height_max', title: 'Tối ưu chiều cao', desc: isPuberty ? 'Được đề xuất cho tuổi bạn!' : 'Xương & tư thế' },
  ];

  // Toggle goal selection
  const handleToggleGoal = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      if (selectedGoals.length === 1) {
        alert('Vui lòng giữ lại ít nhất 1 mục tiêu thể chất!');
        return;
      }
      setSelectedGoals(prev => prev.filter(g => g !== goalId));
    } else {
      setSelectedGoals(prev => [...prev, goalId]);
    }
  };

  // Add custom goal
  const handleAddCustomGoal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customGoalInput.trim();
    if (!trimmed) return;

    if (!customGoals.includes(trimmed)) {
      setCustomGoals(prev => [...prev, trimmed]);
      setSelectedGoals(prev => [...prev, trimmed]);
    }
    setCustomGoalInput('');
  };

  // Remove custom goal
  const handleRemoveCustomGoal = (goalText: string) => {
    setCustomGoals(prev => prev.filter(g => g !== goalText));
    setSelectedGoals(prev => prev.filter(g => g !== goalText));
  };

  // Calculate Roadmap using Gemini AI
  const handleCalculateAiRoadmap = async () => {
    setIsCalculatingAi(true);
    setAiError(null);

    try {
      const result = await geminiService.generateRoadmapWithAi({
        age,
        gender,
        height,
        weight,
        currentBodyFat,
        targetBodyFat,
        aestheticStyle,
        physiqueGoals: selectedGoals,
        activityLevel
      });

      setAiRoadmap(result);
      setStep(4);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Lỗi khi kết nối với Gemini AI. Vui lòng kiểm tra lại khóa API.');
    } finally {
      setIsCalculatingAi(false);
    }
  };

  const handleFinish = () => {
    if (!aiRoadmap) return;

    const profile: UserProfile = {
      age,
      isPuberty,
      gender,
      height,
      weight,
      currentBodyFat,
      targetBodyFat,
      targetWeight: Math.round(weight - ((currentBodyFat - targetBodyFat) / 100 * weight)),
      aestheticStyle,
      physiqueGoals: selectedGoals,
      physiqueGoal: (selectedGoals[0] as PhysiqueGoal) || 'jawline_shred',
      activityLevel,
      bmr: aiRoadmap.bmr,
      tdee: aiRoadmap.tdee,
      dailyCalorieTarget: aiRoadmap.targetCalories,
      createdAt: Date.now(),
      startDate: new Date().toISOString().slice(0, 10),
      onboardingCompleted: true
    };

    const initialPlan: SmartPlan = {
      isActive: true,
      planSource: 'onboarding',
      planName: aestheticStyle === 'asian_pretty_boy' 
        ? 'Lộ trình Pretty Boy & Jawline Cut (Gemini AI)' 
        : 'Lộ trình PSL Warrior & Bone Structure (Gemini AI)',
      updatedAt: Date.now(),
      calorieTarget: aiRoadmap.targetCalories,
      proteinTarget: aiRoadmap.proteinTarget,
      carbTarget: aiRoadmap.carbTarget,
      fatTarget: aiRoadmap.fatTarget,
      sodiumTarget: aiRoadmap.sodiumTarget,
      potassiumTarget: aiRoadmap.potassiumTarget,
      calciumTarget: aiRoadmap.calciumTarget,
      vitaminD3Target: aiRoadmap.vitaminD3Target,
      zincTarget: aiRoadmap.zincTarget,
      magnesiumTarget: aiRoadmap.magnesiumTarget,
      waterTargetLiters: aiRoadmap.waterTargetLiters,
      debloatActive: currentBodyFat > 15,
      workoutSplit: aiRoadmap.workoutSplit,
      dailyHabits: aiRoadmap.dailyHabits
    };

    storageService.saveUserProfile(profile);
    storageService.saveSmartPlan(initialPlan);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored
    }

    onComplete(profile, initialPlan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0e1320] border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-7 relative text-slate-100 my-auto">
        
        {/* Loading Overlay when Gemini AI is computing */}
        {isCalculatingAi && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Gemini AI Đang Tính Toán Lộ Trình</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Đang phân tích nhân trắc học ({age} tuổi, {height}cm, {weight}kg), mục tiêu thể chất và cân đối vi chất tăng trưởng / debloat...
              </p>
            </div>
          </div>
        )}

        {/* Progress Header */}
        <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                AESTHETIC<span className="text-emerald-400">MAX</span>
              </h2>
              <p className="text-xs text-slate-400">Khởi tạo hồ sơ & Lộ trình Cá nhân hóa</p>
            </div>
          </div>
          <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            Bước {step}/4
          </div>
        </div>

        {/* STEP 1: TUỔI (BẮT BUỘC HỎI TRƯỚC) */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
                <User className="w-4 h-4" />
                <span>BƯỚC 1: XÁC ĐỊNH ĐỘ TUỔI ĐẦU TIÊN</span>
              </div>
              <p className="text-xs text-slate-300">
                Tuổi là yếu tố quan trọng nhất để AI quyết định phân phối dinh dưỡng (phát triển sụn chiều cao vs siết mỡ cắt nét) và cấu trúc xương khuôn mặt.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Bạn bao nhiêu tuổi? <span className="text-emerald-400 font-bold">({age} tuổi)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="13"
                  max="60"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <input
                  type="number"
                  min="13"
                  max="60"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                  className="w-16 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-center font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Puberty Alert or Adult Mode Indicator */}
            {isPuberty ? (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>PHÁT HIỆN ĐỘ TUỔI DẬY THÌ ({age} tuổi)</span>
                </div>
                <p>
                  Sụn tăng trưởng và xương sọ mặt (Maxilla & Mandible) của bạn đang định hình mạnh mẽ! App sẽ tự động tối ưu các vi chất phát triển chiều cao (Canxi, D3, Kẽm, Magiê) và ngăn chặn việc thâm hụt calo quá mức.
                </p>
              </div>
            ) : (
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 text-blue-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-400 mb-1">
                  <Award className="w-4 h-4" />
                  <span>CHẾ ĐỘ TRƯỞNG THÀNH ({age} tuổi)</span>
                </div>
                <p>
                  Tập trung tối đa vào tối ưu tỷ lệ mỡ cơ thể (10-12% body fat), xả nước tích tụ (Debloat) để bóc tách cấu trúc xương hàm (jawline) và gò má sắc bén.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Giới tính sinh học</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium transition ${
                    gender === 'male'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Nam (Male)
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium transition ${
                    gender === 'female'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Nữ (Female)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full mt-4 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
            >
              Tiếp tục: Cân nặng & Chiều cao
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: CHỈ SỐ THỂ HÌNH HIỆN TẠI */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <HeartPulse className="w-4 h-4" />
              <span>BƯỚC 2: CHỈ SỐ CƠ THỂ HIỆN TẠI</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Chiều cao (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Cân nặng (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Tỷ lệ mỡ cơ thể hiện tại (Body Fat)</span>
                <span className="text-emerald-400 font-bold">{currentBodyFat}%</span>
              </div>
              <input
                type="range"
                min="8"
                max="35"
                value={currentBodyFat}
                onChange={(e) => setCurrentBodyFat(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>10-12% (Rất nét/Lộ hàm)</span>
                <span>14-17% (Cân đối)</span>
                <span>18-24% (Mặt tròn nhẹ)</span>
                <span>25%+ (Tích mỡ)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Mức độ vận động hàng ngày</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value="sedentary">Ít vận động (Dân văn phòng/học sinh ngồi nhiều)</option>
                <option value="light">Nhẹ nhàng (Đi bộ nhẹ 1-3 ngày/tuần)</option>
                <option value="moderate">Vừa phải (Tập gym/thể thao 3-5 ngày/tuần)</option>
                <option value="active">Năng động (Tập nặng 6-7 ngày/tuần)</option>
                <option value="athlete">Cường độ cao / Vận động viên</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                Tiếp tục: Phong cách Thẩm mỹ
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MỤC TIÊU & PHONG CÁCH THẨM MỸ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Target className="w-4 h-4" />
              <span>BƯỚC 3: MỤC TIÊU CƠ THỂ & PHONG CÁCH KHUÔN MẶT</span>
            </div>

            {/* Error Message if AI call fails */}
            {aiError && (
              <div className="bg-rose-950/70 border border-rose-500/50 p-3 rounded-xl text-rose-200 text-xs flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}

            {/* Aesthetic Style Selection */}
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">
                Phong cách Thẩm mỹ mong muốn (Aesthetic Style):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setAestheticStyle('asian_pretty_boy')}
                  className={`p-3 rounded-xl border cursor-pointer transition relative ${
                    aestheticStyle === 'asian_pretty_boy'
                      ? 'border-emerald-500 bg-emerald-950/30'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-300">🌸 Châu Á: Pretty Boy</span>
                    {aestheticStyle === 'asian_pretty_boy' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Thiên về <strong>Appeal & Hài hòa</strong>: khuôn mặt thanh thoát, da sáng mịn, không sưng phù (Debloat), mắt cuốn hút tự nhiên.
                  </p>
                </div>

                <div
                  onClick={() => setAestheticStyle('western_psl')}
                  className={`p-3 rounded-xl border cursor-pointer transition relative ${
                    aestheticStyle === 'western_psl'
                      ? 'border-purple-500 bg-purple-950/30'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-purple-300">⚔️ Âu Mỹ: PSL Warrior</span>
                    {aestheticStyle === 'western_psl' && (
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Thiên về <strong>PSL & Dimorphism</strong>: xương hàm góc cạnh (jawline vuông), gò má cao, maxilla nhô trước, mắt sắc lạnh.
                  </p>
                </div>
              </div>
            </div>

            {/* Target Body Fat */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Mục tiêu Body Fat mong muốn</span>
                <span className="text-emerald-400 font-bold">{targetBodyFat}%</span>
              </div>
              <input
                type="range"
                min="8"
                max="20"
                value={targetBodyFat}
                onChange={(e) => setTargetBodyFat(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {targetBodyFat <= 12 
                  ? '🔥 10-12%: Ngưỡng lý tưởng để lộ toàn bộ đường viền xương hàm và má hõm (Hollow cheeks)!' 
                  : 'Cơ thể cân đối, khỏe mạnh và dễ duy trì lâu dài.'}
              </p>
            </div>

            {/* Multi-Select Physique Goals & Custom Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-slate-300 font-medium">Mục tiêu thể chất cụ thể:</label>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Đã chọn {selectedGoals.length} mục tiêu
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Bạn có thể <strong>chọn nhiều mục tiêu cùng lúc</strong> hoặc <strong>tự nhập mục tiêu riêng</strong> bên dưới:
              </p>

              {/* Standard Options Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {STANDARD_GOALS.map((g) => {
                  const isSelected = selectedGoals.includes(g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleToggleGoal(g.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer text-left transition select-none ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-sm'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="font-semibold text-white text-xs">{g.title}</div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                          isSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700 bg-slate-950'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400">{g.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Goal Input Box */}
              <div className="pt-2 space-y-2">
                <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tự thêm mục tiêu thể chất tùy chỉnh:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="VD: Cắt mỡ bụng dưới, Tập cơ cổ dày, Tăng cơ tay trước..."
                    value={customGoalInput}
                    onChange={(e) => setCustomGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomGoal();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomGoal()}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0 shadow-md shadow-emerald-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm</span>
                  </button>
                </div>

                {/* Custom Goals List Chips */}
                {customGoals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {customGoals.map((cg) => {
                      const isSelected = selectedGoals.includes(cg);
                      return (
                        <div
                          key={cg}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            isSelected
                              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span
                            onClick={() => handleToggleGoal(cg)}
                            className="cursor-pointer flex items-center gap-1"
                          >
                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                              isSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-600'
                            }`}>
                              {isSelected && '✓'}
                            </span>
                            <span>{cg}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomGoal(cg);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5 ml-0.5 rounded transition"
                            title="Xóa mục tiêu này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleCalculateAiRoadmap}
                disabled={isCalculatingAi}
                className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/25 uppercase tracking-wide"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tính toán bằng Gemini AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: LỘ TRÌNH DO GEMINI AI TÍNH TOÁN */}
        {step === 4 && aiRoadmap && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Flame className="w-4 h-4" />
              <span>BƯỚC 4: LỘ TRÌNH DO GEMINI AI TÍNH TOÁN</span>
            </div>

            {/* AI Advice Callout */}
            {aiRoadmap.aiAdvice && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lời Khuyên Chuyên Gia Từ Gemini AI:</span>
                </div>
                <p className="leading-relaxed text-[11px] text-slate-300">{aiRoadmap.aiAdvice}</p>
              </div>
            )}

            {/* Roadmap Summary Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400">BMR Cơ Bản</div>
                  <div className="text-sm font-bold text-white">{aiRoadmap.bmr} <span className="text-[10px] font-normal">kcal</span></div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">TDEE Tiêu Thụ</div>
                  <div className="text-sm font-bold text-slate-300">{aiRoadmap.tdee} <span className="text-[10px] font-normal">kcal</span></div>
                </div>
                <div className="bg-emerald-950/40 rounded-lg p-1 border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 font-semibold">Calo Mục Tiêu AI</div>
                  <div className="text-sm font-extrabold text-emerald-300">{aiRoadmap.targetCalories} <span className="text-[10px] font-normal">kcal</span></div>
                </div>
              </div>

              {/* Targets */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 text-[10px]">Đạm (Protein):</span>
                  <div className="font-bold text-cyan-400">{aiRoadmap.proteinTarget}g/ngày</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 text-[10px]">Muối (Natri) Debloat:</span>
                  <div className="font-bold text-rose-400">&lt; {aiRoadmap.sodiumTarget}mg/ngày</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 text-[10px]">Kali (Xả nước má):</span>
                  <div className="font-bold text-purple-400">&gt; {aiRoadmap.potassiumTarget}mg/ngày</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 text-[10px]">Canxi & D3:</span>
                  <div className="font-bold text-yellow-400">{aiRoadmap.calciumTarget}mg / {aiRoadmap.vitaminD3Target}IU</div>
                </div>
              </div>

              {/* Selected Goals Display */}
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block mb-1.5 font-medium">
                  Mục tiêu thể chất đã chọn ({selectedGoals.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedGoals.map((g) => {
                    const std = STANDARD_GOALS.find(x => x.id === g);
                    const title = std ? std.title : g;
                    return (
                      <span key={g} className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-md text-[10px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>{title}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-200">
                ✨ <strong>Lộ trình Looksmax:</strong> {aestheticStyle === 'asian_pretty_boy' ? 'Tối ưu Appeal, làn da mịn và góc hàm thanh tú (Pretty Boy)' : 'Tối ưu PSL, cấu trúc xương hàm vuông góc và độ nhô Maxilla (Warrior)'}.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/30 uppercase tracking-wider"
              >
                🚀 Bắt đầu vào App ngay
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
