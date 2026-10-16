import React, { useState, useRef } from 'react';
import { UserProfile, LooksmaxAnalysis, SmartPlan, AestheticStyle, PslTier } from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Flame, 
  Droplet,
  Globe2,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LooksmaxViewProps {
  userProfile: UserProfile;
  currentPlan: SmartPlan | null;
  onPlanUpdate: (updatedPlan: SmartPlan) => void;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export const LooksmaxView: React.FC<LooksmaxViewProps> = ({
  userProfile,
  currentPlan,
  onPlanUpdate,
  onProfileUpdate
}) => {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<string | null>(null);
  const [threeQuarterImage, setThreeQuarterImage] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<LooksmaxAnalysis | null>(() => {
    return storageService.getLatestLooksmax();
  });
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const sideInputRef = useRef<HTMLInputElement | null>(null);
  const threeQuarterInputRef = useRef<HTMLInputElement | null>(null);

  const isPuberty = userProfile.age < 18;
  const hasExistingPlan = !!currentPlan && currentPlan.isActive;

  // Handle single angle upload
  const handleAngleFile = (angle: 'front' | 'side' | 'threeQuarter', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn (>10MB). Vui lòng chọn ảnh nhẹ hơn!');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (angle === 'front') setFrontImage(result);
      else if (angle === 'side') setSideImage(result);
      else if (angle === 'threeQuarter') setThreeQuarterImage(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Run AI Facial Rating with Multi-Angle Photos
  const handleScanFace = async () => {
    if (!frontImage) {
      alert('Vui lòng chụp hoặc tải lên ít nhất bức ảnh góc CHÍNH DIỆN để bắt đầu phân tích!');
      return;
    }

    setIsScanning(true);
    try {
      const result = await geminiService.analyzeFace(
        {
          front: frontImage,
          side: sideImage || undefined,
          threeQuarter: threeQuarterImage || undefined
        },
        userProfile
      );
      setAnalysis(result);
      storageService.saveLooksmaxAnalysis(result);
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      console.error(err);
      alert('Không thể hoàn tất quét khuôn mặt: ' + (err?.message || 'Vui lòng thử lại với ảnh rõ sáng hơn'));
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle Aesthetic Style between Asian Pretty Boy vs Western PSL
  const handleToggleStyle = (newStyle: AestheticStyle) => {
    const updated = { ...userProfile, aestheticStyle: newStyle };
    storageService.saveUserProfile(updated);
    onProfileUpdate(updated);

    // If analysis exists, re-evaluate style context
    if (analysis) {
      const reEvaluated: LooksmaxAnalysis = {
        ...analysis,
        styleEvaluated: newStyle
      };
      setAnalysis(reEvaluated);
      storageService.saveLooksmaxAnalysis(reEvaluated);
    }
  };

  // Sync / Create / Change Plan from Looksmax Analysis
  const handleApplySmartPlan = () => {
    if (!analysis) return;

    const cfg = analysis.smartPlanConfig;

    const newPlan: SmartPlan = {
      isActive: true,
      planSource: 'looksmax_sync',
      planName: cfg.planName,
      updatedAt: Date.now(),
      calorieTarget: cfg.calorieTarget,
      proteinTarget: cfg.proteinTarget,
      carbTarget: cfg.carbTarget,
      fatTarget: cfg.fatTarget,
      sodiumTarget: cfg.sodiumLimitMg,
      potassiumTarget: cfg.potassiumTargetMg,
      calciumTarget: cfg.calciumTargetMg,
      vitaminD3Target: cfg.vitaminD3IU,
      zincTarget: cfg.zincTargetMg,
      magnesiumTarget: cfg.magnesiumTargetMg,
      waterTargetLiters: analysis.debloatAdvice.waterLiters,
      debloatActive: true,
      workoutSplit: [
        {
          day: 'Thứ 2, 4, 6',
          title: cfg.workoutFocus,
          target: 'Tạo thân trên V-taper tôn dáng khuôn mặt và tăng chuyển hóa',
          exercises: ['Overhead Shoulder Press', 'Pull-ups / Lat Pulldown', 'Dumbbell Lateral Raises', 'Incline Dumbbell Press']
        },
        {
          day: 'Thứ 3, 5, 7',
          title: 'Lower Body, Neck & High Testosterone',
          target: 'Kích thích hormone tăng trưởng, săn chắc hàm dưới qua bài tập cổ',
          exercises: ['Barbell Squats', 'Neck Curls & Extensions (2 hiệp nhẹ)', 'Plank & Core', 'Đi bộ 10,000 bước xả nước']
        }
      ],
      dailyHabits: cfg.mewingAndPostureRoutine.map((text, idx) => ({
        id: 'habit_lm_' + idx,
        title: text,
        frequency: 'Hàng ngày',
        category: idx === 0 ? 'mewing' : idx === 1 ? 'posture' : idx === 2 ? 'debloat' : 'growth',
        completed: false
      }))
    };

    storageService.saveSmartPlan(newPlan);
    onPlanUpdate(newPlan);

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch {
      // Ignored
    }

    setSyncSuccessMessage(
      hasExistingPlan 
        ? 'Đã thay đổi Plan hiện tại thành công! Các chỉ số dinh dưỡng (Calo, Natri debloat, Kali, Vi chất) đã được đồng bộ vào app.'
        : 'Đã tạo Plan mới thành công! Toàn bộ tiêu chuẩn ăn uống và bài tập đã được áp dụng vào app.'
    );

    setTimeout(() => {
      setSyncSuccessMessage(null);
    }, 6000);
  };

  // Helper for PSL tier color badges
  const getPslBadgeColor = (tier: PslTier) => {
    switch (tier) {
      case 'True Adam':
      case 'Chad / Chang':
        return 'bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 font-black shadow-lg shadow-amber-500/30';
      case 'Chadlite / Changlite':
        return 'bg-purple-500 text-white font-bold shadow-md shadow-purple-500/30';
      case 'HTN':
        return 'bg-emerald-500 text-slate-950 font-bold';
      case 'MTN':
        return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
      case 'LTN':
        return 'bg-slate-800 text-slate-300 border border-slate-700';
      default:
        return 'bg-rose-950/40 text-rose-300 border border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              <span>Craniofacial Looksmaxxing AI (PSL & Appeal)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Chấm Điểm & Nâng Tầm Khuôn Mặt</h1>
            <p className="text-xs text-slate-400 mt-1">
              Phân tích tỷ lệ giải phẫu học, xương hàm Maxilla, góc nghiêng và xả nước sưng mặt (Debloat).
            </p>
          </div>

          {/* Aesthetic Toggle Switch */}
          <div className="bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleToggleStyle('asian_pretty_boy')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                userProfile.aestheticStyle === 'asian_pretty_boy'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌸 Châu Á (Pretty Boy)
            </button>
            <button
              type="button"
              onClick={() => handleToggleStyle('western_psl')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                userProfile.aestheticStyle === 'western_psl'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚔️ Âu Mỹ (PSL Dimorphism)
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {syncSuccessMessage && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-xl text-emerald-200 text-xs flex items-center gap-3 animate-fade-in shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{syncSuccessMessage}</span>
        </div>
      )}

      {/* Camera / Multi-Angle Photo Scanner Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-400" />
              <span>Quét 3D Sọ Mặt Đa Góc Chụp (2 - 3 Ảnh)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Để đánh giá chuẩn xác xương hàm, cằm lẹm và gò má, hãy tải đủ các góc chụp bên dưới:
            </p>
          </div>
          
          <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 self-start sm:self-auto bg-purple-950/60 text-purple-300 border-purple-500/30">
            <span>Đã tải: {[frontImage, sideImage, threeQuarterImage].filter(Boolean).length}/3 góc</span>
          </div>
        </div>

        {/* Hidden File Inputs for each angle */}
        <input
          type="file"
          accept="image/*"
          ref={frontInputRef}
          onChange={(e) => handleAngleFile('front', e)}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          ref={sideInputRef}
          onChange={(e) => handleAngleFile('side', e)}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          ref={threeQuarterInputRef}
          onChange={(e) => handleAngleFile('threeQuarter', e)}
          className="hidden"
        />

        {/* 3 Angle Upload Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Angle 1: Frontal View (Required) */}
          <div className={`p-3.5 rounded-2xl border-2 transition flex flex-col justify-between relative ${
            frontImage 
              ? 'bg-slate-950/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10' 
              : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-purple-500/50'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <span>1. Góc Chính Diện</span>
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase">(Bắt buộc)</span>
              </span>
              {frontImage && (
                <button
                  type="button"
                  onClick={() => setFrontImage(null)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/30"
                >
                  Xóa
                </button>
              )}
            </div>

            {frontImage ? (
              <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black/90 flex items-center justify-center border border-slate-700/80">
                <img src={frontImage} alt="Front View" className="object-cover w-full h-full" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold flex items-center justify-center gap-1 border border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sẵn sàng
                </div>
              </div>
            ) : (
              <div 
                onClick={() => frontInputRef.current?.click()}
                className="aspect-[3/4] rounded-xl flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:bg-purple-950/20 transition border border-dashed border-slate-800 hover:border-purple-500/40"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">Mắt nhìn thẳng</span>
                <span className="text-[10px] text-slate-500 mt-1">Đo đối xứng, 3 tầng mặt & canthal tilt</span>
                <span className="mt-2 text-[10px] font-bold text-purple-400 bg-purple-950/40 px-2 py-1 rounded-lg border border-purple-500/30">
                  + Chụp / Tải ảnh
                </span>
              </div>
            )}
          </div>

          {/* Angle 2: Side Profile 90° (Recommended) */}
          <div className={`p-3.5 rounded-2xl border-2 transition flex flex-col justify-between relative ${
            sideImage 
              ? 'bg-slate-950/90 border-cyan-500/60 shadow-lg shadow-cyan-500/10' 
              : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-cyan-500/50'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <span>2. Góc Nghiêng 90°</span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase">(Khuyên dùng)</span>
              </span>
              {sideImage && (
                <button
                  type="button"
                  onClick={() => setSideImage(null)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/30"
                >
                  Xóa
                </button>
              )}
            </div>

            {sideImage ? (
              <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black/90 flex items-center justify-center border border-slate-700/80">
                <img src={sideImage} alt="Side View" className="object-cover w-full h-full" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-cyan-300 font-bold flex items-center justify-center gap-1 border border-cyan-500/40">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Sẵn sàng
                </div>
              </div>
            ) : (
              <div 
                onClick={() => sideInputRef.current?.click()}
                className="aspect-[3/4] rounded-xl flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:bg-cyan-950/20 transition border border-dashed border-slate-800 hover:border-cyan-500/40"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">Quay ngang 90°</span>
                <span className="text-[10px] text-slate-500 mt-1">Đo góc hàm Gonial, độ nhô cằm & Maxilla</span>
                <span className="mt-2 text-[10px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-500/30">
                  + Chụp / Tải ảnh
                </span>
              </div>
            )}
          </div>

          {/* Angle 3: 3/4 View 45° (Recommended) */}
          <div className={`p-3.5 rounded-2xl border-2 transition flex flex-col justify-between relative ${
            threeQuarterImage 
              ? 'bg-slate-950/90 border-purple-500/60 shadow-lg shadow-purple-500/10' 
              : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-purple-500/50'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <span>3. Góc 3/4 (45°)</span>
                <span className="text-[10px] text-purple-400 font-bold uppercase">(Khuyên dùng)</span>
              </span>
              {threeQuarterImage && (
                <button
                  type="button"
                  onClick={() => setThreeQuarterImage(null)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/30"
                >
                  Xóa
                </button>
              )}
            </div>

            {threeQuarterImage ? (
              <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black/90 flex items-center justify-center border border-slate-700/80">
                <img src={threeQuarterImage} alt="3/4 View" className="object-cover w-full h-full" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-purple-300 font-bold flex items-center justify-center gap-1 border border-purple-500/40">
                  <CheckCircle2 className="w-3 h-3 text-purple-400" /> Sẵn sàng
                </div>
              </div>
            ) : (
              <div 
                onClick={() => threeQuarterInputRef.current?.click()}
                className="aspect-[3/4] rounded-xl flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:bg-purple-950/20 transition border border-dashed border-slate-800 hover:border-purple-500/40"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">Nghiêng nhẹ 45°</span>
                <span className="text-[10px] text-slate-500 mt-1">Đo gò má Zygoma & đường cong Ogee</span>
                <span className="mt-2 text-[10px] font-bold text-purple-400 bg-purple-950/40 px-2 py-1 rounded-lg border border-purple-500/30">
                  + Chụp / Tải ảnh
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Live Scanning HUD effect */}
        {isScanning && (
          <div className="p-4 bg-purple-950/60 border border-purple-500/50 rounded-2xl flex items-center justify-center gap-3 animate-pulse">
            <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-purple-200">
              Gemini AI đang đối chiếu dữ liệu 3D: Gonial Angle, Forward Growth, Zygoma & Tỉ lệ Tam Phân...
            </span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleScanFace}
          disabled={isScanning || !frontImage}
          className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition uppercase tracking-wider ${
            isScanning || !frontImage
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white shadow-xl shadow-purple-600/30 transform active:scale-98'
          }`}
        >
          {isScanning ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Đang Phân Tích Đa Góc Chụp...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                {[frontImage, sideImage, threeQuarterImage].filter(Boolean).length >= 2 
                  ? '🔥 BẮT ĐẦU QUÉT ĐA GÓC 3D SỌ MẶT VỚI GEMINI AI' 
                  : 'BẮT ĐẦU CHẤM ĐIỂM & NÂNG TẦM KHUÔN MẶT'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Looksmaxxing Results Dashboard */}
      {analysis && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Multi-angle Scanned Photos Showcase */}
          {(analysis.photoUrl || analysis.sidePhotoUrl || analysis.threeQuarterPhotoUrl) && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  GÓC CHỤP ĐÃ ĐƯỢC AI ĐỐI CHIẾU 3D:
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(analysis.timestamp).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {analysis.photoUrl && (
                  <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black border border-slate-700">
                    <img src={analysis.photoUrl} alt="Chính diện" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 bg-black/80 text-[9px] font-bold text-slate-200 text-center py-0.5 rounded">
                      Chính diện
                    </span>
                  </div>
                )}
                {analysis.sidePhotoUrl && (
                  <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black border border-slate-700">
                    <img src={analysis.sidePhotoUrl} alt="Góc nghiêng" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 bg-black/80 text-[9px] font-bold text-cyan-300 text-center py-0.5 rounded">
                      Nghiêng 90°
                    </span>
                  </div>
                )}
                {analysis.threeQuarterPhotoUrl && (
                  <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-black border border-slate-700">
                    <img src={analysis.threeQuarterPhotoUrl} alt="Góc 3/4" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 right-1 bg-black/80 text-[9px] font-bold text-purple-300 text-center py-0.5 rounded">
                      Góc 3/4
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dual Score Cards: PSL & APPEAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Thang PSL */}
            <div className="bg-slate-900/95 border-2 border-purple-500/40 rounded-2xl p-5 relative overflow-hidden shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">THANG ĐO GIẢI PHẪU HỌC</div>
                  <h3 className="text-lg font-black text-white mt-0.5">PSL Scale</h3>
                  <p className="text-[11px] text-slate-400">Độ chuẩn xác cấu trúc xương, góc cạnh, nam tính</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-purple-400">{analysis.pslScore} <span className="text-xs text-slate-500 font-normal">/ 8.0</span></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Phân hạng PSL:</span>
                <span className={`px-3 py-1 rounded-full text-xs ${getPslBadgeColor(analysis.pslTier)}`}>
                  {analysis.pslTier}
                </span>
              </div>
            </div>

            {/* 2. Thang APPEAL */}
            <div className="bg-slate-900/95 border-2 border-emerald-500/40 rounded-2xl p-5 relative overflow-hidden shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    {userProfile.aestheticStyle === 'asian_pretty_boy' ? 'TRỌNG TÂM CHÂU Á' : 'ĐỘ THU HÚT ĐẠI CHÚNG'}
                  </div>
                  <h3 className="text-lg font-black text-white mt-0.5">Appeal Scale</h3>
                  <p className="text-[11px] text-slate-400">Độ ưa nhìn, vibe thần tượng, thiện cảm & sự hài hòa</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-emerald-400">{analysis.appealScore} <span className="text-xs text-slate-500 font-normal">/ 10.0</span></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Đánh giá thu hút:</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {analysis.appealTier}
                </span>
              </div>
            </div>

          </div>

          {/* Aesthetic Philosophy Note */}
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
            <Globe2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Triết lý Thẩm mỹ: </span>
              {userProfile.aestheticStyle === 'asian_pretty_boy' ? (
                <span>
                  <strong>Châu Á (Pretty Boy & Appeal):</strong> Ưu tiên đường nét thanh thoát, làn da căng sáng không mụn, tỉ lệ thon gọn, ánh mắt sáng và giảm sưng mặt (Debloat) để tạo thiện cảm tối đa.
                </span>
              ) : (
                <span>
                  <strong>Âu Mỹ (PSL & Dimorphism):</strong> Ưu tiên độ nhô xương hàm trên (forward maxilla), xương hàm dưới vuông vức sắc lẹm (gonial angle 120°), gò má nhô cao và độ hõm má (hollow cheeks).
                </span>
              )}
            </div>
          </div>

          {/* Detailed Facial Metrics Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Chi Tiết Từng Khía Cạnh Khuôn Mặt</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Proportions */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">📐 {analysis.metrics.proportions.title}</span>
                  <span className="text-emerald-400 font-bold">{analysis.metrics.proportions.score}/10</span>
                </div>
                <div className="text-[11px] text-purple-300 font-mono">{analysis.metrics.proportions.thirdRatio}</div>
                <p className="text-[11px] text-slate-400">{analysis.metrics.proportions.notes}</p>
                <p className="text-[10px] text-slate-500 italic">💡 {analysis.metrics.proportions.recommendation}</p>
              </div>

              {/* Side Profile */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">🗿 {analysis.metrics.sideProfile.title}</span>
                  <span className="text-emerald-400 font-bold">{analysis.metrics.sideProfile.score}/10</span>
                </div>
                <div className="text-[11px] text-cyan-300 font-mono">{analysis.metrics.sideProfile.gonialAngle} • {analysis.metrics.sideProfile.chinProjection}</div>
                <p className="text-[11px] text-slate-400">{analysis.metrics.sideProfile.notes}</p>
                <p className="text-[10px] text-slate-500 italic">💡 {analysis.metrics.sideProfile.recommendation}</p>
              </div>

              {/* Cheekbones */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">✨ {analysis.metrics.cheekbones.title}</span>
                  <span className="text-emerald-400 font-bold">{analysis.metrics.cheekbones.score}/10</span>
                </div>
                <div className="text-[11px] text-amber-300 font-mono">Tiềm năng má hõm: {analysis.metrics.cheekbones.hollowCheeksPotential}</div>
                <p className="text-[11px] text-slate-400">{analysis.metrics.cheekbones.notes}</p>
                <p className="text-[10px] text-slate-500 italic">💡 {analysis.metrics.cheekbones.recommendation}</p>
              </div>

              {/* Maxilla */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">🦷 {analysis.metrics.maxilla.title}</span>
                  <span className="text-emerald-400 font-bold">{analysis.metrics.maxilla.score}/10</span>
                </div>
                <div className="text-[11px] text-emerald-300 font-mono">Độ nhô hàm trên: {analysis.metrics.maxilla.forwardGrowth}</div>
                <p className="text-[11px] text-slate-400">{analysis.metrics.maxilla.notes}</p>
                <p className="text-[10px] text-slate-500 italic">💡 {analysis.metrics.maxilla.recommendation}</p>
              </div>

              {/* Hair */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">💇 {analysis.metrics.hair.title}</span>
                  <span className="text-emerald-400 font-bold">{analysis.metrics.hair.score}/10</span>
                </div>
                <p className="text-[11px] text-slate-400">{analysis.metrics.hair.notes}</p>
                <p className="text-[10px] text-slate-500 italic">💡 {analysis.metrics.hair.recommendation}</p>
              </div>

              {/* Eye Area / Canthal Tilt */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">👁️ {analysis.metrics.canthalTilt.title}</span>
                  <span className="text-emerald-400 font-bold">{analysis.metrics.canthalTilt.score}/10</span>
                </div>
                <div className="text-[11px] text-rose-300 font-mono">{analysis.metrics.canthalTilt.ratingText}</div>
                <p className="text-[11px] text-slate-400">{analysis.metrics.canthalTilt.notes}</p>
                <p className="text-[10px] text-slate-500 italic">💡 {analysis.metrics.canthalTilt.recommendation}</p>
              </div>
            </div>
          </div>

          {/* Actionable Knowledge Protocols (Debloat, Bodyfat, Puberty) */}
          <div className="space-y-3">
            
            {/* Debloat Protocol Card */}
            <div className="bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border border-blue-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Droplet className="w-5 h-5" />
                  <span>GIAI ĐOẠN DEBLOAT: XẢ NƯỚC TÍCH MẶT</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold">
                  Tích nước: {analysis.debloatAdvice.waterRetentionLevel}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400">Giới hạn Natri (Muối)</div>
                  <div className="text-xs font-bold text-rose-400">&lt; {analysis.debloatAdvice.sodiumTargetMg} mg</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Mục tiêu Kali xả nước</div>
                  <div className="text-xs font-bold text-purple-400">&gt; {analysis.debloatAdvice.potassiumTargetMg} mg</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Lượng nước uống</div>
                  <div className="text-xs font-bold text-cyan-400">{analysis.debloatAdvice.waterLiters} Lít/ngày</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                {analysis.debloatAdvice.actionSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">✓</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Body Fat & Jawline Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Flame className="w-5 h-5" />
                <span>MỤC TIÊU BODY FAT ĐỂ BẬT JAWLINE</span>
              </div>
              <p className="text-xs text-slate-300">{analysis.bodyFatAdvice.notes}</p>
              <div className="flex justify-between items-center bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Body fat hiện tại: </span>
                  <span className="font-bold text-white">{analysis.bodyFatAdvice.estimatedFacialFatLevel}</span>
                </div>
                <div>
                  <span className="text-slate-400">Thời gian ước tính: </span>
                  <span className="font-bold text-emerald-400">~{analysis.bodyFatAdvice.weeksEstimate} tuần siết</span>
                </div>
              </div>
            </div>

            {/* Puberty Knowledge Card (If < 18) */}
            {isPuberty && analysis.pubertyAdvice && (
              <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>KIẾN THỨC TUỔI DẬY THÌ: PHÁT TRIỂN CHIỀU CAO & KHUNG MẶT</span>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="font-semibold text-amber-300">🦴 Tối ưu sụn chiều cao:</div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
                    {analysis.pubertyAdvice.heightOptimization.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>

                  <div className="font-semibold text-amber-300 pt-1">🧬 Định hình cung hàm & Maxilla:</div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
                    {analysis.pubertyAdvice.boneAndFacialGrowth.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

          </div>

          {/* DYNAMIC SMART PLAN SYNC BUTTON (Create Plan OR Change Current Plan) */}
          <div className="bg-gradient-to-r from-slate-900 via-[#141b2d] to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-5 text-center space-y-3 shadow-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Smart Plan Synchronization</span>
            </div>

            <h3 className="text-base font-extrabold text-white">
              {hasExistingPlan 
                ? 'Đồng bộ lại toàn bộ tiêu chuẩn ăn uống & tập luyện' 
                : 'Thiết lập Plan ăn uống & tập luyện từ phân tích Looksmax'}
            </h3>

            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nhấn nút bên dưới để áp dụng trực tiếp: Calo thâm hụt ({analysis.smartPlanConfig.calorieTarget} kcal), Natri thấp ({analysis.smartPlanConfig.sodiumLimitMg}mg), Kali cao ({analysis.smartPlanConfig.potassiumTargetMg}mg) và thói quen Mewing vào phần Nutrition & Workout của App!
            </p>

            <button
              type="button"
              onClick={handleApplySmartPlan}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 mx-auto transition shadow-xl shadow-emerald-500/30 uppercase tracking-wider"
            >
              {hasExistingPlan ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin-slow" />
                  <span>THAY ĐỔI PLAN HIỆN TẠI (CHANGE CURRENT PLAN)</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>TẠO PLAN MỚI NGAY (CREATE PLAN)</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
