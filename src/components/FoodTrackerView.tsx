import React, { useState, useRef } from 'react';
import { FoodItem, NutrientDefinition, UserProfile, SmartPlan } from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { compressImageToThumbnail } from '../utils/imageUtils';
import { MealPlannerView } from './MealPlannerView';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Plus, 
  Trash2, 
  Flame, 
  Check, 
  Info, 
  X,
  Droplet,
  UtensilsCrossed,
  Pencil
} from 'lucide-react';

interface FoodTrackerViewProps {
  userProfile: UserProfile;
  nutrients: NutrientDefinition[];
  onNutrientsUpdate: (updated: NutrientDefinition[]) => void;
  onFoodAdded: (item: FoodItem) => void;
  onFoodUpdated?: (item: FoodItem) => void;
  todayFoodItems: FoodItem[];
  onFoodDeleted: (id: string) => void;
  currentPlan?: SmartPlan | null;
}

export const FoodTrackerView: React.FC<FoodTrackerViewProps> = ({
  userProfile,
  nutrients,
  onNutrientsUpdate,
  onFoodAdded,
  onFoodUpdated,
  todayFoodItems,
  onFoodDeleted,
  currentPlan
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'planner' | 'scanner'>('planner');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [description, setDescription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<Omit<FoodItem, 'id' | 'timestamp'> | null>(null);

  // Edit Logged Food Item Modal state
  const [editingFoodItem, setEditingFoodItem] = useState<FoodItem | null>(null);
  const [editFormName, setEditFormName] = useState<string>('');
  const [editFormCalories, setEditFormCalories] = useState<number>(0);
  const [editFormServing, setEditFormServing] = useState<string>('');
  const [editFormProtein, setEditFormProtein] = useState<number>(0);
  const [editFormCarbs, setEditFormCarbs] = useState<number>(0);
  const [editFormFat, setEditFormFat] = useState<number>(0);
  const [editFormSodium, setEditFormSodium] = useState<number>(0);

  const openEditModal = (item: FoodItem) => {
    setEditingFoodItem(item);
    setEditFormName(item.name);
    setEditFormCalories(item.calories);
    setEditFormServing(item.servingSize || '1 phần');
    setEditFormProtein(item.nutrients?.protein || 0);
    setEditFormCarbs(item.nutrients?.carbs || 0);
    setEditFormFat(item.nutrients?.fat || 0);
    setEditFormSodium(item.nutrients?.sodium || 0);
  };

  const handleSaveEditedFood = () => {
    if (!editingFoodItem) return;
    const updatedNutrients = {
      ...editingFoodItem.nutrients,
      protein: editFormProtein,
      carbs: editFormCarbs,
      fat: editFormFat,
      sodium: editFormSodium
    };
    const updated = storageService.updateFoodItem(editingFoodItem.id, {
      name: editFormName.trim() || editingFoodItem.name,
      calories: Math.max(0, editFormCalories),
      servingSize: editFormServing,
      nutrients: updatedNutrients
    });
    if (updated) {
      onFoodUpdated?.(updated);
    }
    setEditingFoodItem(null);
  };

  // New Custom Nutrient Modal state
  const [showAddNutrientModal, setShowAddNutrientModal] = useState<boolean>(false);
  const [newNutrientName, setNewNutrientName] = useState<string>('');
  const [newNutrientUnit, setNewNutrientUnit] = useState<string>('mg');
  const [newNutrientTarget, setNewNutrientTarget] = useState<number>(100);
  const [newNutrientCategory, setNewNutrientCategory] = useState<'macro' | 'debloat' | 'height_growth' | 'energy' | 'custom'>('custom');

  const [imagesPreview, setImagesPreview] = useState<string[]>([]);
  const [viewingItemPhotos, setViewingItemPhotos] = useState<FoodItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle multiple image selection (from camera or file picker)
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const readers = fileList.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newImages => {
      setImagesPreview(prev => {
        const combined = [...prev, ...newImages];
        // Allow up to 8 images per meal
        return combined.slice(0, 8);
      });
    });

    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImagesPreview(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Run Gemini AI Analysis with Multi-Image Support
  const handleAnalyze = async () => {
    if (!description && imagesPreview.length === 0) {
      alert('Vui lòng nhập miêu tả món ăn hoặc chụp/chọn ít nhất 1 ảnh đĩa thức ăn!');
      return;
    }

    setIsAnalyzing(true);
    try {
      const customNutrients = nutrients.filter(n => !n.isStandard).map(n => ({
        id: n.id,
        name: n.name,
        unit: n.unit
      }));

      const result = await geminiService.analyzeFood(
        {
          textDescription: description,
          imagesBase64: imagesPreview,
          mealType
        },
        customNutrients
      );

      setScanResult(result);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi quét món ăn. Vui lòng kiểm tra lại kết nối hoặc khóa API Gemini trong cài đặt.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Save current scan to Food Log (compresses all thumbnails for localStorage safety)
  const handleSaveToLog = async () => {
    if (!scanResult) return;
    try {
      let photoUrl = scanResult.photoUrl;
      if (photoUrl && photoUrl.startsWith('data:image')) {
        photoUrl = await compressImageToThumbnail(photoUrl, 320, 320, 0.7);
      }

      let photoUrls: string[] | undefined = undefined;
      if (scanResult.photoUrls && scanResult.photoUrls.length > 0) {
        photoUrls = await Promise.all(
          scanResult.photoUrls.map(async (u) => {
            if (u.startsWith('data:image')) {
              return await compressImageToThumbnail(u, 320, 320, 0.7);
            }
            return u;
          })
        );
      }

      const itemToSave = {
        ...scanResult,
        photoUrl,
        photoUrls
      };

      const item = storageService.addFoodItem(itemToSave);
      onFoodAdded(item);
      setScanResult(null);
      setDescription('');
      setImagesPreview([]);
      setSaveSuccessMsg(`🎉 Đã lưu "${item.name}" (${item.calories} kcal) với ${photoUrls?.length || 1} ảnh vào nhật ký thành công!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch {}
    } catch (err: any) {
      console.error('Lỗi khi lưu món ăn:', err);
      alert('Không thể lưu món ăn: ' + (err?.message || 'Lỗi bộ nhớ'));
    }
  };

  // Create Custom Nutrient
  const handleCreateCustomNutrient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNutrientName.trim()) return;

    const id = 'custom_' + newNutrientName.trim().toLowerCase().replace(/\s+/g, '_');
    const updated = storageService.addCustomNutrient({
      id,
      name: newNutrientName.trim(),
      unit: newNutrientUnit,
      dailyTarget: newNutrientTarget,
      category: newNutrientCategory,
      description: 'Chất theo dõi tùy chỉnh do người dùng thêm'
    });

    onNutrientsUpdate(updated);
    setShowAddNutrientModal(false);
    setNewNutrientName('');
    setNewNutrientTarget(100);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Segmented Sub-Tab Switcher */}
      <div className="liquid-glass p-1.5 rounded-[24px] flex gap-1.5 shadow-2xl relative select-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('planner')}
          className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ${
            activeSubTab === 'planner'
              ? 'liquid-pill-active text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Thực Đơn Hàng Ngày (AI Planner)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('scanner')}
          className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ${
            activeSubTab === 'scanner'
              ? 'liquid-pill-active text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.35)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Quét Calo & Nhật Ký Đã Ăn</span>
        </button>
      </div>

      {activeSubTab === 'planner' ? (
        <MealPlannerView
          userProfile={userProfile}
          currentPlan={currentPlan || null}
          onFoodAdded={onFoodAdded}
          onNavigateToScan={() => setActiveSubTab('scanner')}
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Banner */}
          <div className="liquid-glass-emerald rounded-[28px] p-5 relative overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_#34d399]" />
                  <span>AI Multi-Nutrient Tracker (Gemini Vision)</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Quét Calo & Vi Chất Thức Ăn</h1>
                <p className="text-xs text-slate-300/80 mt-1">
                  Phân tích từng gram protein, vi chất tăng chiều cao & khoáng chất xả nước mặt (Debloat).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddNutrientModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 liquid-glass-btn text-emerald-300 hover:text-white border-emerald-400/40 rounded-2xl text-xs font-bold transition shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm chất theo dõi mới</span>
              </button>
            </div>
          </div>

          {/* Success Notification Banner */}
          {saveSuccessMsg && (
            <div className="p-3.5 liquid-pill-active rounded-2xl text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-lg animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Input / Scanner Section */}
          <div className="liquid-glass-card rounded-[28px] p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. Nhập hoặc chụp ảnh món ăn</span>
            </h2>

            {/* Meal Type Selector */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'breakfast', label: 'Bữa Sáng' },
                { id: 'lunch', label: 'Bữa Trưa' },
                { id: 'dinner', label: 'Bữa Tối' },
                { id: 'snack', label: 'Bữa Phụ' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMealType(m.id as any)}
                  className={`py-2.5 px-1 rounded-2xl text-xs font-bold text-center transition-all duration-200 active:scale-95 ${
                    mealType === m.id
                      ? 'liquid-pill-active text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'liquid-glass text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Text Description Input */}
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1.5">Miêu tả món ăn (tiếng Việt hoặc tiếng Anh):</label>
              <input
                type="text"
                placeholder="VD: 1 tô phở bò nhiều thịt tái nạm, 2 trứng chần, 1 ly cà phê đen đá ít đường..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 liquid-glass-input rounded-2xl text-white text-sm placeholder:text-slate-500"
              />
            </div>

            {/* Image Upload / Camera Box (Multi-Image Support) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-slate-300 font-medium">
                  Chụp hoặc tải ảnh món ăn <span className="text-emerald-400 font-bold">(Có thể chọn nhiều ảnh cùng lúc)</span>:
                </label>
                {imagesPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setImagesPreview([])}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Xóa tất cả ({imagesPreview.length} ảnh)
                  </button>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleImagesChange}
                className="hidden"
              />

              {imagesPreview.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-emerald-400/50 rounded-2xl p-6 text-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-2.5 group"
                >
                  <div className="flex gap-2.5 text-slate-400 group-hover:scale-105 transition-transform">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                      <Upload className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 font-bold">Chạm để Chụp ảnh hoặc Tải nhiều ảnh món ăn</p>
                    <p className="text-[10px] text-emerald-300/90 font-medium mt-0.5">
                      💡 Mẹo: Có thể chọn nhiều ảnh (món chính + canh + đồ uống + tráng miệng) để AI gộp chung 1 bữa!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Grid of uploaded images */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {imagesPreview.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="relative rounded-2xl overflow-hidden border border-white/20 aspect-video sm:aspect-square bg-black/60 shadow-md group"
                      >
                        <img 
                          src={img} 
                          alt={`Món ăn ${idx + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"></div>

                        {/* Photo Number Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white flex items-center gap-1 shadow">
                          <span>Ảnh {idx + 1}</span>
                          {idx === 0 && <span className="text-emerald-300">• Món chính</span>}
                        </div>

                        {/* Remove Single Photo Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition shadow-md active:scale-90"
                          title="Xóa ảnh này"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* "+ Thêm ảnh" Button Card if less than 8 images */}
                    {imagesPreview.length < 8 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/20 hover:border-emerald-400/50 rounded-2xl p-4 aspect-video sm:aspect-square flex flex-col items-center justify-center gap-1.5 bg-white/[0.02] hover:bg-white/[0.06] transition text-slate-300 hover:text-emerald-300 group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </div>
                        <span className="text-[11px] font-bold">+ Thêm ảnh</span>
                        <span className="text-[9px] text-slate-400">Canh / Nước / Món phụ</span>
                      </button>
                    )}
                  </div>

                  {/* Multi-image Info Notice */}
                  <div className="p-2.5 rounded-xl liquid-glass text-[11px] text-slate-300 flex items-center justify-between border border-emerald-500/20">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Đã gắn <strong>{imagesPreview.length} bức ảnh</strong>. Gemini AI sẽ tổng hợp toàn bộ các món trong các ảnh.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-emerald-400 hover:text-emerald-300 font-bold shrink-0 text-[10px] ml-2 underline"
                    >
                      Thêm ảnh nữa
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${
                isAnalyzing
                  ? 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.35)] active:scale-95 border border-white/40'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Gemini AI Đang Phân Tích Dinh Dưỡng...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950 stroke-none" />
                  <span>Quét Dinh Dưỡng Với Gemini AI</span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Result Card */}
          {scanResult && (
            <div className="liquid-glass-card rounded-[28px] p-5 sm:p-6 space-y-4 border-emerald-500/40 shadow-2xl animate-in fade-in duration-300 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 liquid-glass p-4 rounded-2xl border border-white/15">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>KẾT QUẢ PHÂN TÍCH TỪ AI</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Chạm để sửa tên & calo)</span>
                  </div>
                  <input
                    type="text"
                    value={scanResult.name}
                    onChange={(e) => setScanResult(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Tên món ăn"
                    className="text-base sm:text-lg font-black text-white mt-1 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none w-full"
                  />
                  <input
                    type="text"
                    value={scanResult.servingSize || ''}
                    onChange={(e) => setScanResult(prev => prev ? { ...prev, servingSize: e.target.value } : null)}
                    placeholder="Khẩu phần (VD: 1 tô, 200g...)"
                    className="text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-800 focus:border-slate-600 focus:outline-none mt-0.5 w-full"
                  />
                </div>

                <div className="flex flex-col items-start sm:items-end shrink-0">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Calo Tự Do Chỉnh Sửa:</span>
                  </span>
                  <div className="flex items-center gap-1.5 bg-black/60 border border-emerald-500/40 rounded-2xl px-2.5 py-1.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setScanResult(prev => prev ? { ...prev, calories: Math.max(0, prev.calories - 50) } : null)}
                      className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-xs font-bold text-slate-200 flex items-center justify-center transition"
                      title="Giảm 50 calo"
                    >
                      -50
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="9999"
                      value={scanResult.calories}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setScanResult(prev => prev ? { ...prev, calories: Math.max(0, val) } : null);
                      }}
                      className="w-16 text-center font-black text-emerald-300 text-xl bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setScanResult(prev => prev ? { ...prev, calories: prev.calories + 50 } : null)}
                      className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-xs font-bold text-slate-200 flex items-center justify-center transition"
                      title="Tăng 50 calo"
                    >
                      +50
                    </button>
                    <span className="text-xs text-slate-400 font-semibold pr-1">kcal</span>
                  </div>
                </div>
              </div>

              {/* Multi-Photo Carousel / Grid in Scan Result */}
              {scanResult.photoUrls && scanResult.photoUrls.length > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Các ảnh món & thức uống đã quét ({scanResult.photoUrls.length} ảnh):</span>
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {scanResult.photoUrls.map((p, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 shrink-0 shadow bg-black/60">
                        <img src={p} alt={`Món ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/75 px-1.5 py-0.5 rounded text-white font-bold">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Notes on Debloat / Growth */}
              {scanResult.aiNotes && (
                <div className="liquid-glass border border-cyan-500/30 p-3.5 rounded-2xl text-xs text-slate-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{scanResult.aiNotes}</span>
                </div>
              )}

              {/* Detailed Nutrients Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chi Tiết Vi Chất & Khoáng Chất:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {nutrients.map((nutri) => {
                    const val = scanResult.nutrients[nutri.id] ?? 0;
                    return (
                      <div key={nutri.id} className="liquid-glass p-3 rounded-2xl border border-white/10 flex justify-between items-center">
                        <div>
                          <div className="text-[11px] font-bold text-slate-200 truncate max-w-[120px]">{nutri.name}</div>
                          <div className="text-[10px] text-slate-400">Mục tiêu: {nutri.dailyTarget}{nutri.unit}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-300">{val}</span>
                          <span className="text-[10px] text-slate-400 ml-0.5">{nutri.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  className="w-1/3 py-3 liquid-glass-btn text-slate-300 text-xs font-bold rounded-2xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveToLog}
                  className="w-2/3 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black rounded-2xl flex items-center justify-center gap-1.5 transition shadow-[0_0_20px_rgba(52,211,153,0.35)] active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  Lưu Vào Nhật Ký Ăn Uống Hôm Nay
                </button>
              </div>
            </div>
          )}

          {/* Today Food Log List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Các món đã log hôm nay ({todayFoodItems.length})</span>
              <span className="text-xs font-black text-emerald-400">
                Tổng: {todayFoodItems.reduce((acc, item) => acc + item.calories, 0)} kcal
              </span>
            </h2>

            {todayFoodItems.length === 0 ? (
              <div className="liquid-glass rounded-[28px] p-8 text-center text-xs text-slate-400 border border-white/10">
                Hôm nay chưa có món ăn nào được log. Hãy chụp ảnh hoặc nhập miêu tả món ăn ở phía trên để bắt đầu theo dõi!
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayFoodItems.map((item) => (
                  <div
                    key={item.id}
                    className="liquid-glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-white/20 transition group"
                  >
                    <div className="flex items-center gap-3">
                      {item.photoUrl ? (
                        <div 
                          onClick={() => setViewingItemPhotos(item)}
                          className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/15 shrink-0 cursor-pointer group/img hover:border-emerald-400 transition"
                          title="Chạm để xem ảnh món ăn"
                        >
                          <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform" />
                          {item.photoUrls && item.photoUrls.length > 1 && (
                            <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[8px] font-black text-center text-emerald-300 py-0.5">
                              {item.photoUrls.length} ảnh
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-black text-sm shadow-[0_0_10px_rgba(52,211,153,0.2)] shrink-0">
                          {item.mealType.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.mealType === 'breakfast' ? 'Bữa sáng' : item.mealType === 'lunch' ? 'Bữa trưa' : item.mealType === 'dinner' ? 'Bữa tối' : 'Bữa phụ'} • {item.servingSize || '1 phần'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className="text-cyan-300">P: {item.nutrients?.protein || 0}g</span>
                          <span className="text-amber-300">C: {item.nutrients?.carbs || 0}g</span>
                          <span className="text-rose-300">F: {item.nutrients?.fat || 0}g</span>
                          <span className="text-slate-400">Muối: {item.nutrients?.sodium || 0}mg</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-emerald-300">{item.calories} <span className="text-[10px] text-slate-400 font-normal">kcal</span></span>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-2 liquid-glass-btn text-slate-300 hover:text-emerald-300 rounded-xl transition"
                        title="Chỉnh sửa calo & món ăn"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onFoodDeleted(item.id)}
                        className="p-2 liquid-glass-btn text-slate-400 hover:text-rose-400 rounded-xl transition"
                        title="Xóa món"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add New Custom Nutrient */}
      {showAddNutrientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="w-full max-w-md liquid-glass rounded-[32px] border border-white/20 p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Thêm Chất / Vi Chất Theo Dõi Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddNutrientModal(false)}
                className="text-slate-400 hover:text-white p-1.5 liquid-glass-btn rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomNutrient} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Tên vi chất / thực phẩm bổ sung:</label>
                <input
                  type="text"
                  placeholder="VD: Creatine Monohydrate, Omega 3, Vitamin C, Collagen..."
                  value={newNutrientName}
                  onChange={(e) => setNewNutrientName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 liquid-glass-input rounded-2xl text-white text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Đơn vị đo:</label>
                  <select
                    value={newNutrientUnit}
                    onChange={(e) => setNewNutrientUnit(e.target.value)}
                    className="w-full px-3 py-2.5 liquid-glass-input rounded-2xl text-white text-xs focus:outline-none"
                  >
                    <option value="mg">mg (Miligram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="mcg">mcg (Microgram)</option>
                    <option value="IU">IU (Đơn vị quốc tế)</option>
                    <option value="ml">ml (Mililit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Mục tiêu mỗi ngày:</label>
                  <input
                    type="number"
                    min="1"
                    value={newNutrientTarget}
                    onChange={(e) => setNewNutrientTarget(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 liquid-glass-input rounded-2xl text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Nhóm dinh dưỡng:</label>
                <select
                  value={newNutrientCategory}
                  onChange={(e) => setNewNutrientCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 liquid-glass-input rounded-2xl text-white text-xs focus:outline-none"
                >
                  <option value="custom">Chất bổ sung tùy chọn (Supplement / Custom)</option>
                  <option value="debloat">Hỗ trợ xả nước mặt (Debloat)</option>
                  <option value="height_growth">Phát triển sụn chiều cao & xương</option>
                  <option value="energy">Tập luyện & chuyển hóa năng lượng</option>
                  <option value="macro">Đa lượng (Macro)</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNutrientModal(false)}
                  className="w-1/2 py-3 liquid-glass-btn text-slate-300 font-bold rounded-2xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl transition shadow-[0_0_20px_rgba(52,211,153,0.35)] active:scale-95"
                >
                  Tạo chất theo dõi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Logged Food Item & Calories */}
      {editingFoodItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="liquid-glass rounded-[32px] border border-white/20 w-full max-w-md p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Chỉnh Sửa Calo & Bữa Ăn</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFoodItem(null)}
                className="text-slate-400 hover:text-white p-1.5 liquid-glass-btn rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Tên món ăn:</label>
                <input
                  type="text"
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  className="w-full px-4 py-2.5 liquid-glass-input rounded-2xl text-white text-sm focus:outline-none"
                />
              </div>

              {/* Calories Editor with quick adjust buttons */}
              <div className="liquid-glass-emerald p-4 rounded-2xl border border-emerald-500/30">
                <label className="block text-emerald-300 font-bold mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>Lượng Calories (Tự do chỉnh sửa):</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormCalories(prev => Math.max(0, prev - 50))}
                    className="px-3 py-2 liquid-glass-btn active:scale-95 text-slate-200 font-black rounded-xl transition"
                    title="Giảm 50 calo"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormCalories(prev => Math.max(0, prev - 10))}
                    className="px-2.5 py-2 liquid-glass-btn active:scale-95 text-slate-200 font-black rounded-xl transition"
                    title="Giảm 10 calo"
                  >
                    -10
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={editFormCalories}
                    onChange={(e) => setEditFormCalories(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center font-black text-emerald-300 text-2xl py-1.5 bg-black/60 border border-emerald-500/40 rounded-xl focus:outline-none shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setEditFormCalories(prev => prev + 10)}
                    className="px-2.5 py-2 liquid-glass-btn active:scale-95 text-slate-200 font-black rounded-xl transition"
                    title="Tăng 10 calo"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormCalories(prev => prev + 50)}
                    className="px-3 py-2 liquid-glass-btn active:scale-95 text-slate-200 font-black rounded-xl transition"
                    title="Tăng 50 calo"
                  >
                    +50
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Khẩu phần / Đơn vị:</label>
                <input
                  type="text"
                  value={editFormServing}
                  onChange={(e) => setEditFormServing(e.target.value)}
                  placeholder="1 tô, 1 đĩa, 200g..."
                  className="w-full px-4 py-2.5 liquid-glass-input rounded-2xl text-white text-xs focus:outline-none"
                />
              </div>

              {/* Macros */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Protein (Đạm - g):</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormProtein}
                    onChange={(e) => setEditFormProtein(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-emerald-300 font-black text-sm focus:outline-none"
                  />
                </div>
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Carbs (Tinh bột - g):</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormCarbs}
                    onChange={(e) => setEditFormCarbs(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-amber-300 font-black text-sm focus:outline-none"
                  />
                </div>
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Fat (Chất béo - g):</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormFat}
                    onChange={(e) => setEditFormFat(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-rose-300 font-black text-sm focus:outline-none"
                  />
                </div>
                <div className="liquid-glass p-2.5 rounded-2xl border border-white/10">
                  <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Natri / Muối (mg):</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormSodium}
                    onChange={(e) => setEditFormSodium(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-cyan-300 font-black text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingFoodItem(null)}
                className="flex-1 py-3 liquid-glass-btn text-slate-300 font-bold rounded-2xl text-xs transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditedFood}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 transition shadow-[0_0_20px_rgba(52,211,153,0.35)] active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3px]" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Meal Photos Gallery */}
      {viewingItemPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="w-full max-w-lg liquid-glass rounded-[32px] border border-white/20 p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black text-white">{viewingItemPhotos.name}</h3>
                <p className="text-[10px] text-slate-400">
                  {viewingItemPhotos.calories} kcal • {viewingItemPhotos.photoUrls?.length || (viewingItemPhotos.photoUrl ? 1 : 0)} bức ảnh đã quét
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingItemPhotos(null)}
                className="text-slate-400 hover:text-white p-1.5 liquid-glass-btn rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {(viewingItemPhotos.photoUrls && viewingItemPhotos.photoUrls.length > 0 
                ? viewingItemPhotos.photoUrls 
                : [viewingItemPhotos.photoUrl].filter(Boolean)
              ).map((url, idx) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden border border-white/20 aspect-video bg-black/60 shadow">
                  <img src={url!} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 text-[10px] bg-black/75 px-2 py-0.5 rounded-full text-white font-bold border border-white/20">
                    Ảnh #{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setViewingItemPhotos(null)}
                className="px-4 py-2 liquid-glass-btn rounded-xl text-xs font-bold text-slate-300 hover:text-white"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
