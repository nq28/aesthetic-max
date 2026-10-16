import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Key, Sparkles, ExternalLink, ShieldCheck, AlertCircle, ArrowRight, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ApiKeyGateModalProps {
  onApiKeySaved: (apiKey: string) => void;
}

export const ApiKeyGateModal: React.FC<ApiKeyGateModalProps> = ({ onApiKeySaved }) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleValidateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKeyInput.trim();
    if (!key) {
      setErrorMessage('Vui lòng nhập khóa API Gemini!');
      return;
    }

    setIsValidating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await geminiService.validateApiKey(key);
      if (result.valid) {
        storageService.saveApiKey(key);
        setSuccessMessage('Kích hoạt thành công! Đang khởi động hệ thống AI...');
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // Ignored
        }
        setTimeout(() => {
          onApiKeySaved(key);
        }, 1200);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi kiểm tra khóa API. Vui lòng thử lại.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-md bg-[#0b0f19] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative text-slate-100">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 text-slate-950">
            <Key className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bắt Buộc Nhập Khóa API</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Kích Hoạt Gemini AI Engine</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Toàn bộ tính toán của ứng dụng (lập lộ trình, quét đĩa thức ăn, bóc tách vi chất và chấm điểm khuôn mặt Looksmax) <strong>đều vận hành 100% bằng Trí Tuệ Nhân Tạo Google Gemini</strong>.
            </p>
          </div>
        </div>

        {/* Free API Key Guide Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Lấy API Key Miễn Phí (30 giây):
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition"
            >
              <span>Mở Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            1. Đăng nhập tài khoản Google của bạn tại Google AI Studio.<br />
            2. Nhấn nút <strong>Create API Key</strong> (Hoàn toàn miễn phí, không cần thẻ tín dụng).<br />
            3. Sao chép và dán khóa API vào ô bên dưới.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-950/70 border border-rose-500/50 p-3 rounded-xl text-rose-200 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-950/70 border border-emerald-500/50 p-3 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleValidateAndSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
              Nhập Gemini API Key của bạn:
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              disabled={isValidating}
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isValidating || !apiKeyInput.trim()}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition uppercase tracking-wider ${
              isValidating || !apiKeyInput.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 shadow-xl shadow-emerald-500/30'
            }`}
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Đang Kiểm Tra & Kích Hoạt...</span>
              </>
            ) : (
              <>
                <span>Kích Hoạt & Bắt Đầu Sử Dụng</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
