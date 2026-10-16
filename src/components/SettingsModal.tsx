import React, { useState, useRef } from 'react';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { UserProfile, HabitNotificationSettings } from '../types';
import { 
  Settings, 
  Key, 
  RefreshCcw, 
  ExternalLink, 
  X, 
  Check, 
  AlertCircle, 
  Palette, 
  Calendar, 
  Bell, 
  BellRing, 
  Download, 
  Upload, 
  ShieldCheck, 
  Droplet, 
  Dumbbell
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onProfileReset: () => void;
  onProfileUpdate?: (profile: UserProfile) => void;
  onApiKeyChange: (key: string) => void;
  onOpenTheme?: () => void;
  onDataRestored?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileReset,
  onProfileUpdate,
  onApiKeyChange,
  onOpenTheme,
  onDataRestored
}) => {
  const [apiKey, setApiKey] = useState<string>(() => storageService.getApiKey());
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Start Date state
  const defaultStartDate = userProfile.startDate || new Date(userProfile.createdAt || Date.now()).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [startDateSaved, setStartDateSaved] = useState<boolean>(false);

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState<HabitNotificationSettings>(() => storageService.getNotificationSettings());
  const [notifSaved, setNotifSaved] = useState<boolean>(false);
  const [testNotifSent, setTestNotifSent] = useState<boolean>(false);

  // Backup & Restore
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Calculate days elapsed from start date
  const startTimestamp = new Date(startDate).getTime();
  const daysElapsed = Math.max(1, Math.floor((Date.now() - startTimestamp) / (1000 * 60 * 60 * 24)) + 1);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) {
      setErrorMessage('Khóa API không được để trống!');
      return;
    }

    setIsValidating(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    try {
      const result = await geminiService.validateApiKey(key);
      if (result.valid) {
        storageService.saveApiKey(key);
        onApiKeyChange(key);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi kiểm tra API Key.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveStartDate = () => {
    const updated: UserProfile = {
      ...userProfile,
      startDate
    };
    storageService.saveUserProfile(updated);
    if (onProfileUpdate) {
      onProfileUpdate(updated);
    }
    setStartDateSaved(true);
    setTimeout(() => setStartDateSaved(false), 3000);
  };

  const handleSaveNotifSettings = (newSettings: HabitNotificationSettings) => {
    setNotifSettings(newSettings);
    storageService.saveNotificationSettings(newSettings);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const handleTestNotification = async () => {
    if (!('Notification' in window)) {
      alert('Trình duyệt hoặc môi trường này chưa hỗ trợ Native Web Notification API.');
      return;
    }

    try {
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        new Notification('Coach Max 💧 Nhắc Nhở Debloat', {
          body: 'Đến giờ uống 300ml nước lọc để cân bằng Natri và giữ cằm góc hàm sắc nét bạn nhé!',
          icon: '/favicon.ico'
        });
        setTestNotifSent(true);
        setTimeout(() => setTestNotifSent(false), 3000);
      } else {
        alert('Vui lòng cấp quyền thông báo trong trình duyệt để nhận lời nhắc từ Coach Max.');
      }
    } catch (e) {
      console.warn('Notification test error:', e);
    }
  };

  // Export Backup File
  const handleExportBackup = () => {
    const backupJson = storageService.exportBackupData();
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AestheticMax_Backup_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBackupSuccess('Đã tải xuống file sao lưu an toàn (.json)!');
    setTimeout(() => setBackupSuccess(null), 4000);
  };

  // Import Backup File
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const success = storageService.importBackupData(content);
      if (success) {
        alert('🎉 Khôi phục dữ liệu thành công! 100% hồ sơ, plan, lịch sử ăn uống và streak đã được đồng bộ.');
        if (onDataRestored) {
          onDataRestored();
        }
        onClose();
      } else {
        alert('⚠️ File sao lưu không hợp lệ hoặc bị lỗi cấu trúc JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetProfile = () => {
    if (window.confirm('Bạn có chắc chắn muốn thiết lập lại hồ sơ và lộ trình cá nhân hóa ban đầu không? (Khuyên dùng tính năng Sao lưu trước khi reset)')) {
      storageService.clearAll();
      onProfileReset();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cài Đặt & Quản Lý Dữ Liệu</h2>
              <p className="text-[11px] text-slate-400">Ngày bắt đầu, chuỗi streak, thông báo & sao lưu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Start Date & Journey Milestone */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Ngày Bắt Đầu Lộ Trình</span>
            </label>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
              Ngày thứ {daysElapsed}
            </span>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 font-medium"
            />
            <button
              type="button"
              onClick={handleSaveStartDate}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shrink-0"
            >
              Lưu Ngày
            </button>
          </div>

          {startDateSaved && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Đã cập nhật ngày bắt đầu lộ trình!
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Hệ thống dùng ngày này để tính toán chuỗi ngày kiên trì và đo lường tốc độ lột xác của bạn.
          </p>
        </div>

        {/* 2. Gemini API Key Configuration */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Google Gemini API Key</span>
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Lấy key miễn phí</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <form onSubmit={handleSaveApiKey} className="space-y-2">
            <input
              type="password"
              placeholder="Nhập khóa API Gemini (AIza...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />

            {errorMessage && (
              <div className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage}
              </div>
            )}

            {savedSuccess && (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Đã xác thực và lưu khóa API thành công!
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-slate-500">
                100% chức năng phân tích món ăn & huấn luyện do Gemini AI đảm nhiệm.
              </p>
              <button
                type="submit"
                disabled={isValidating}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                {isValidating ? 'Đang kiểm tra...' : 'Lưu Key'}
              </button>
            </div>
          </form>
        </div>

        {/* 3. Habit Reminder Notification Settings */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Bell className="w-4 h-4 text-purple-400" />
              <span>Cài Đặt Nhắc Nhở Thói Quen</span>
            </label>
            <button
              type="button"
              onClick={handleTestNotification}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-950/40 border border-purple-500/30"
              title="Gửi thử thông báo hệ thống"
            >
              <BellRing className="w-3 h-3" />
              <span>Thử thông báo</span>
            </button>
          </div>

          {testNotifSent && (
            <div className="text-[11px] text-purple-300 bg-purple-950/80 p-2 rounded-xl border border-purple-500/40 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-purple-400" />
              Đã gửi thông báo thử nghiệm! Kiểm tra thanh thông báo hệ thống của bạn.
            </div>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between py-1 border-b border-slate-800 text-xs">
            <span className="text-slate-300 font-semibold">Bật thông báo định kỳ:</span>
            <input
              type="checkbox"
              checked={notifSettings.enabled}
              onChange={(e) => handleSaveNotifSettings({ ...notifSettings, enabled: e.target.checked })}
              className="w-4 h-4 accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Sub Reminders */}
          {notifSettings.enabled && (
            <div className="space-y-2.5 text-xs">
              
              {/* Water Reminder */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Nhắc uống nước Debloat:</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={notifSettings.waterIntervalHours}
                    onChange={(e) => handleSaveNotifSettings({ ...notifSettings, waterIntervalHours: parseInt(e.target.value, 10) })}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-[11px]"
                  >
                    <option value="1">Mỗi 1 tiếng</option>
                    <option value="2">Mỗi 2 tiếng</option>
                    <option value="3">Mỗi 3 tiếng</option>
                  </select>
                  <input
                    type="checkbox"
                    checked={notifSettings.waterReminder}
                    onChange={(e) => handleSaveNotifSettings({ ...notifSettings, waterReminder: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Meal Times */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-bold block">Giờ nhắc bữa ăn:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Sáng:</label>
                    <input
                      type="time"
                      value={notifSettings.breakfastTime}
                      onChange={(e) => handleSaveNotifSettings({ ...notifSettings, breakfastTime: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Trưa:</label>
                    <input
                      type="time"
                      value={notifSettings.lunchTime}
                      onChange={(e) => handleSaveNotifSettings({ ...notifSettings, lunchTime: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Tối:</label>
                    <input
                      type="time"
                      value={notifSettings.dinnerTime}
                      onChange={(e) => handleSaveNotifSettings({ ...notifSettings, dinnerTime: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Mewing & Workout */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Mewing & Tư thế:</label>
                  <input
                    type="time"
                    value={notifSettings.mewingTime}
                    onChange={(e) => handleSaveNotifSettings({ ...notifSettings, mewingTime: e.target.value })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Tập Gym / Thể dục:</label>
                  <input
                    type="time"
                    value={notifSettings.workoutTime}
                    onChange={(e) => handleSaveNotifSettings({ ...notifSettings, workoutTime: e.target.value })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {notifSaved && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Đã lưu cài đặt thông báo!
            </div>
          )}
        </div>

        {/* 4. Backup & Restore System (Cross-Device Migration) */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sao Lưu & Chuyển Thiết Bị (Backup System)</span>
            </label>
          </div>

          <p className="text-[11px] text-slate-400">
            Lưu trữ 100% dữ liệu (hồ sơ, chuỗi ngày streak, nhật ký calo, lịch sử quét mặt, đoạn chat với Coach). Khi đổi điện thoại hoặc sang máy tính mới, chỉ cần tải lên file sao lưu là dữ liệu nguyên vẹn!
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleExportBackup}
              className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Tải File Sao Lưu (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Khôi Phục Dữ Liệu</span>
            </button>
          </div>

          {backupSuccess && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <Check className="w-3.5 h-3.5" /> {backupSuccess}
            </div>
          )}
        </div>

        {/* 5. Theme Customizer Button */}
        {onOpenTheme && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTheme();
              }}
              className="w-full py-2.5 px-3 bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Tùy Biến Giao Diện, Đổi Màu Sắc & Đổi Hình Nền</span>
            </button>
          </div>
        )}

        {/* 6. Reset Profile Button */}
        <div className="pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetProfile}
            className="w-full py-2.5 px-3 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Thiết Lập Lại Hồ Sơ Ban Đầu (Reset Profile)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
