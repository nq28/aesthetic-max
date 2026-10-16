import React, { useRef } from 'react';
import { ThemeSettings, AccentColor, BackgroundPreset } from '../types';
import { 
  Palette, 
  X, 
  Check, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Sliders, 
  Sparkles,
  Eye
} from 'lucide-react';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeSettings: ThemeSettings;
  onThemeChange: (updated: ThemeSettings) => void;
}

interface AccentOption {
  id: AccentColor;
  name: string;
  colorHex: string;
  glowHex: string;
}

const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'emerald', name: 'Emerald Cyberpunk', colorHex: '#10b981', glowHex: 'rgba(16, 185, 129, 0.4)' },
  { id: 'purple', name: 'PSL Chad Purple', colorHex: '#a855f7', glowHex: 'rgba(168, 85, 247, 0.4)' },
  { id: 'cyan', name: 'Electric Cyan', colorHex: '#06b6d4', glowHex: 'rgba(6, 182, 212, 0.4)' },
  { id: 'gold', name: 'Golden Aesthetic', colorHex: '#f59e0b', glowHex: 'rgba(245, 158, 11, 0.4)' },
  { id: 'crimson', name: 'Crimson Vampire', colorHex: '#f43f5e', glowHex: 'rgba(244, 63, 94, 0.4)' },
  { id: 'silver', name: 'Titanium Silver', colorHex: '#94a3b8', glowHex: 'rgba(148, 163, 184, 0.4)' },
];

interface BackgroundOption {
  id: BackgroundPreset;
  name: string;
  bgHex: string;
  desc: string;
}

const BG_PRESETS: BackgroundOption[] = [
  { id: 'obsidian', name: 'Obsidian Dark', bgHex: '#07090e', desc: 'Mặc định Cyberpunk' },
  { id: 'oled', name: 'OLED Pitch Black', bgHex: '#000000', desc: 'Đen tuyệt đối, siêu tiết kiệm pin' },
  { id: 'navy', name: 'Midnight Navy', bgHex: '#090d16', desc: 'Xanh thẳm vũ trụ' },
  { id: 'purple_dark', name: 'Cyber Violet', bgHex: '#0d0814', desc: 'Tím đêm huyền bí' },
  { id: 'carbon', name: 'Carbon Slate', bgHex: '#0d1117', desc: 'Xám than carbon' },
];

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  themeSettings,
  onThemeChange
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSelectAccent = (accent: AccentColor) => {
    onThemeChange({
      ...themeSettings,
      accentColor: accent
    });
  };

  const handleSelectBgPreset = (preset: BackgroundPreset) => {
    onThemeChange({
      ...themeSettings,
      backgroundPreset: preset
    });
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onThemeChange({
          ...themeSettings,
          customBgImage: base64,
          backgroundPreset: 'custom_image'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustomImage = () => {
    onThemeChange({
      ...themeSettings,
      customBgImage: undefined,
      backgroundPreset: 'obsidian'
    });
  };

  const handleResetDefault = () => {
    onThemeChange({
      accentColor: 'emerald',
      backgroundPreset: 'obsidian',
      bgOverlayOpacity: 0.75,
      bgBlur: 0,
      customBgImage: undefined,
      customBgColor: undefined,
      customAccentHex: undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0e1320] border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 relative text-slate-100 my-auto animate-fade-in max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <span>Tùy Biến Giao Diện & Nền</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h2>
              <p className="text-[11px] text-slate-400">Đổi màu chủ đạo, chế độ nền tối hoặc tải ảnh nền tùy ý</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-xs">

          {/* Section 1: Accent Colors */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                1. Màu Điểm Nhấn (Accent Glow)
              </span>
              <span className="text-[10px] text-slate-400">
                Đổi màu cho nút, viền card, huy hiệu
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ACCENT_OPTIONS.map((opt) => {
                const isSelected = themeSettings.accentColor === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectAccent(opt.id)}
                    className={`p-3 rounded-2xl border text-left transition relative flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-slate-900 border-white/40 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span 
                      className="w-5 h-5 rounded-full shrink-0 border border-white/20 shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: opt.colorHex }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                    </span>
                    <span className="font-bold text-[11px] text-white truncate">{opt.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Accent Color Picker */}
            <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeSettings.customAccentHex || '#10b981'}
                  onChange={(e) => {
                    onThemeChange({
                      ...themeSettings,
                      accentColor: 'custom',
                      customAccentHex: e.target.value
                    });
                  }}
                  className="w-8 h-8 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                />
                <div>
                  <span className="font-bold text-slate-200 block text-[11px]">Màu tự chọn (Custom Color)</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {themeSettings.accentColor === 'custom' ? themeSettings.customAccentHex : 'Nhấn vào ô màu để chọn'}
                  </span>
                </div>
              </div>
              {themeSettings.accentColor === 'custom' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Đang dùng
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Background Mode */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                2. Chế Độ Nền (Background Style)
              </span>
              <span className="text-[10px] text-slate-400">Chọn tông tối hoặc ảnh riêng</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {BG_PRESETS.map((bg) => {
                const isSelected = themeSettings.backgroundPreset === bg.id && !themeSettings.customBgImage;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => handleSelectBgPreset(bg.id)}
                    className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between h-20 ${
                      isSelected
                        ? 'border-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                    style={{ backgroundColor: bg.bgHex }}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-white text-[11px]">{bg.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                    </div>
                    <span className="text-[9px] text-slate-400 line-clamp-1">{bg.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Custom Background Image Upload */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>3. Đổi Nền Tùy Chỉnh Bằng Ảnh (Custom Wallpaper)</span>
              </span>
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleCustomImageUpload}
              className="hidden"
            />

            {themeSettings.customBgImage ? (
              <div className="space-y-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-16 h-12 rounded-xl bg-cover bg-center border border-slate-700 relative shadow"
                      style={{ backgroundImage: `url(${themeSettings.customBgImage})` }}
                    >
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/80 px-1 rounded text-emerald-400 font-bold">
                        Đang áp dụng
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-white block text-xs">Ảnh nền tùy chỉnh</span>
                      <span className="text-[10px] text-emerald-400">Đã nạp vào bộ nhớ máy</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold transition"
                    >
                      Đổi ảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCustomImage}
                      className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
                      title="Gỡ ảnh nền"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Overlay Dimmer Slider */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-cyan-400" />
                      Độ tối lớp phủ (Giúp chữ luôn nổi bật):
                    </span>
                    <span className="font-mono font-bold text-cyan-400">
                      {Math.round(themeSettings.bgOverlayOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.95"
                    step="0.05"
                    value={themeSettings.bgOverlayOpacity}
                    onChange={(e) => {
                      onThemeChange({
                        ...themeSettings,
                        bgOverlayOpacity: parseFloat(e.target.value)
                      });
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>Sáng hơn (20%)</span>
                    <span>Tối tối ưu chữ (75%)</span>
                    <span>Rất tối (95%)</span>
                  </div>
                </div>

                {/* Blur Slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-purple-400" />
                      Độ làm mờ nền (Blur):
                    </span>
                    <span className="font-mono font-bold text-purple-400">
                      {themeSettings.bgBlur}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="2"
                    value={themeSettings.bgBlur}
                    onChange={(e) => {
                      onThemeChange({
                        ...themeSettings,
                        bgBlur: parseInt(e.target.value, 10)
                      });
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 text-center cursor-pointer bg-slate-950/40 transition flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-white font-bold">Chọn ảnh từ thư viện để làm hình nền</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Hỗ trợ ảnh gym, anime, model, thẩm mỹ cá nhân (tự động tối ưu độ tương phản)
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-2 py-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition"
          >
            Đóng & Lưu
          </button>
        </div>

      </div>
    </div>
  );
};
