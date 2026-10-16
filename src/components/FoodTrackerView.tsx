import React, { useState, useRef } from 'react';
import { FoodItem, NutrientDefinition, UserProfile } from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { compressImageToThumbnail } from '../utils/imageUtils';
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
  Droplet
} from 'lucide-react';

interface FoodTrackerViewProps {
  userProfile: UserProfile;
  nutrients: NutrientDefinition[];
  onNutrientsUpdate: (updated: NutrientDefinition[]) => void;
  onFoodAdded: (item: FoodItem) => void;
  todayFoodItems: FoodItem[];
  onFoodDeleted: (id: string) => void;
}

export const FoodTrackerView: React.FC<FoodTrackerViewProps> = ({
  userProfile,
  nutrients,
  onNutrientsUpdate,
  onFoodAdded,
  todayFoodItems,
  onFoodDeleted
}) => {
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [description, setDescription] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<Omit<FoodItem, 'id' | 'timestamp'> | null>(null);

  // New Custom Nutrient Modal state
  const [showAddNutrientModal, setShowAddNutrientModal] = useState<boolean>(false);
  const [newNutrientName, setNewNutrientName] = useState<string>('');
  const [newNutrientUnit, setNewNutrientUnit] = useState<string>('mg');
  const [newNutrientTarget, setNewNutrientTarget] = useState<number>(100);
  const [newNutrientCategory, setNewNutrientCategory] = useState<'macro' | 'debloat' | 'height_growth' | 'energy' | 'custom'>('custom');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run Gemini AI Analysis
  const handleAnalyze = async () => {
    if (!description && !imagePreview) {
      alert('Vui lòng nhập miêu tả món ăn hoặc chọn một bức ảnh chụp đĩa thức ăn!');
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
          imageBase64: imagePreview || undefined,
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

  // Save current scan to Food Log
  const handleSaveToLog = async () => {
    if (!scanResult) return;
    try {
      let photoUrl = scanResult.photoUrl;
      if (photoUrl && photoUrl.startsWith('data:image')) {
        photoUrl = await compressImageToThumbnail(photoUrl, 320, 320, 0.7);
      }

      const itemToSave = {
        ...scanResult,
        photoUrl
      };

      const item = storageService.addFoodItem(itemToSave);
      onFoodAdded(item);
      setScanResult(null);
      setDescription('');
      setImagePreview(null);
      setSaveSuccessMsg(`🎉 Đã lưu "${item.name}" (${item.calories} kcal) vào nhật ký thành công!`);
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
    <div className="space-y-6 pb-20">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>AI Multi-Nutrient Tracker (Gemini Vision)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Quét Calo & Vi Chất Thức Ăn</h1>
            <p className="text-xs text-slate-400 mt-1">
              Phân tích từng gram protein, vi chất tăng chiều cao & khoáng chất xả nước mặt (Debloat).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddNutrientModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chất theo dõi mới</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Input / Scanner Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
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
              className={`py-2 px-1 rounded-xl text-xs font-semibold text-center transition ${
                mealType === m.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Text Description Input */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Miêu tả món ăn (tiếng Việt hoặc tiếng Anh):</label>
          <input
            type="text"
            placeholder="VD: 1 tô phở bò nhiều thịt tái nạm, 2 trứng chần, 1 ly cà phê đen đá ít đường..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Image Upload / Camera Box */}
        <div className="space-y-2">
          <label className="block text-xs text-slate-400">Hoặc chụp / chọn ảnh đĩa thức ăn:</label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 max-h-56 flex items-center justify-center bg-black/60">
              <img src={imagePreview} alt="Food preview" className="object-cover w-full h-full max-h-56" />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-rose-400 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 text-center cursor-pointer bg-slate-950/40 transition flex flex-col items-center justify-center gap-2"
            >
              <div className="flex gap-2 text-slate-400">
                <Camera className="w-6 h-6 text-emerald-400" />
                <Upload className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-xs text-slate-300 font-medium">Nhấn vào đây để Chụp ảnh hoặc Tải ảnh từ thư viện</p>
              <p className="text-[10px] text-slate-500">Gemini Vision AI sẽ tự động nhận diện món ăn và tính toán dinh dưỡng</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition uppercase tracking-wider ${
            isAnalyzing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Gemini AI Đang Phân Tích Dinh Dưỡng...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Quét Dinh Dưỡng Với Gemini AI</span>
            </>
          )}
        </button>
      </div>

      {/* Analysis Result Card */}
      {scanResult && (
        <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-2xl p-5 space-y-4 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">KẾT QUẢ PHÂN TÍCH TỪ AI</div>
              <h3 className="text-lg font-bold text-white mt-0.5">{scanResult.name}</h3>
              <p className="text-xs text-slate-400">{scanResult.servingSize}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400">{scanResult.calories}</span>
              <span className="text-xs text-slate-400 ml-1">kcal</span>
            </div>
          </div>

          {/* AI Notes on Debloat / Growth */}
          {scanResult.aiNotes && (
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-xs text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{scanResult.aiNotes}</span>
            </div>
          )}

          {/* Detailed Nutrients Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chi Tiết Vi Chất & Khoáng Chất:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {nutrients.map((nutri) => {
                const val = scanResult.nutrients[nutri.id] ?? 0;
                return (
                  <div key={nutri.id} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="text-[11px] font-medium text-slate-300 truncate max-w-[120px]">{nutri.name}</div>
                      <div className="text-[10px] text-slate-500">Mục tiêu: {nutri.dailyTarget}{nutri.unit}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white">{val}</span>
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
              className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSaveToLog}
              className="w-2/3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/25"
            >
              <Check className="w-4 h-4" />
              Lưu Vào Nhật Ký Ăn Uống Hôm Nay
            </button>
          </div>
        </div>
      )}

      {/* Today Food Log List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
          <span>Các món đã log hôm nay ({todayFoodItems.length})</span>
          <span className="text-xs text-emerald-400">
            Tổng: {todayFoodItems.reduce((acc, item) => acc + item.calories, 0)} kcal
          </span>
        </h2>

        {todayFoodItems.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
            Hôm nay chưa có món ăn nào được log. Hãy chụp ảnh hoặc nhập miêu tả món ăn ở phía trên để bắt đầu theo dõi!
          </div>
        ) : (
          <div className="space-y-2">
            {todayFoodItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-slate-800" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {item.mealType.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.name}</h4>
                    <p className="text-[10px] text-slate-400">
                      {item.mealType === 'breakfast' ? 'Bữa sáng' : item.mealType === 'lunch' ? 'Bữa trưa' : item.mealType === 'dinner' ? 'Bữa tối' : 'Bữa phụ'} • {item.servingSize || '1 phần'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span>P: {item.nutrients?.protein || 0}g</span>
                      <span>C: {item.nutrients?.carbs || 0}g</span>
                      <span>F: {item.nutrients?.fat || 0}g</span>
                      <span className="text-rose-400">Muối: {item.nutrients?.sodium || 0}mg</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-emerald-400">{item.calories} <span className="text-[10px] text-slate-400 font-normal">kcal</span></span>
                  <button
                    type="button"
                    onClick={() => onFoodDeleted(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add New Custom Nutrient */}
      {showAddNutrientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Thêm Chất / Vi Chất Theo Dõi Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddNutrientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomNutrient} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Tên vi chất / thực phẩm bổ sung:</label>
                <input
                  type="text"
                  placeholder="VD: Creatine Monohydrate, Omega 3, Vitamin C, Collagen..."
                  value={newNutrientName}
                  onChange={(e) => setNewNutrientName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Đơn vị đo:</label>
                  <select
                    value={newNutrientUnit}
                    onChange={(e) => setNewNutrientUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="mg">mg (Miligram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="mcg">mcg (Microgram)</option>
                    <option value="IU">IU (Đơn vị quốc tế)</option>
                    <option value="ml">ml (Mililit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Mục tiêu mỗi ngày:</label>
                  <input
                    type="number"
                    min="1"
                    value={newNutrientTarget}
                    onChange={(e) => setNewNutrientTarget(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nhóm dinh dưỡng:</label>
                <select
                  value={newNutrientCategory}
                  onChange={(e) => setNewNutrientCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="custom">Chất bổ sung tùy chọn (Supplement / Custom)</option>
                  <option value="debloat">Hỗ trợ xả nước mặt (Debloat)</option>
                  <option value="height_growth">Phát triển sụn chiều cao & xương</option>
                  <option value="energy">Tập luyện & chuyển hóa năng lượng</option>
                  <option value="macro">Đa lượng (Macro)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNutrientModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-md shadow-emerald-500/25"
                >
                  Tạo chất theo dõi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
