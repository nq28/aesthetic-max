import React, { useState, useEffect } from 'react';
import { UserProfile, FoodItem, NutrientDefinition, SmartPlan, ThemeSettings } from './types';
import { storageService } from './services/storageService';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { FoodTrackerView } from './components/FoodTrackerView';
import { LooksmaxView } from './components/LooksmaxView';
import { PlanView } from './components/PlanView';
import { CoachView } from './components/CoachView';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { ApiKeyGateModal } from './components/ApiKeyGateModal';
import { ThemeModal } from './components/ThemeModal';

export const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return storageService.getApiKey();
  });

  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    return storageService.getThemeSettings();
  });
  const [isThemeOpen, setIsThemeOpen] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return storageService.getUserProfile();
  });

  const [currentPlan, setCurrentPlan] = useState<SmartPlan | null>(() => {
    return storageService.getSmartPlan();
  });

  const [nutrients, setNutrients] = useState<NutrientDefinition[]>(() => {
    return storageService.getNutrients();
  });

  const [todayFoodItems, setTodayFoodItems] = useState<FoodItem[]>(() => {
    return storageService.getTodayFoodItems();
  });

  const [waterAmount, setWaterAmount] = useState<number>(() => {
    return storageService.getTodayWater();
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Daily Streak Record on App Mount
  useEffect(() => {
    storageService.recordDailyActive();
  }, []);

  // Habit Notifications Background Checker
  useEffect(() => {
    const triggerNotification = (title: string, body: string) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/favicon.ico' });
        } catch {}
      }
    };

    const interval = setInterval(() => {
      const notifs = storageService.getNotificationSettings();
      if (!notifs.enabled) return;

      const now = new Date();
      const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (now.getSeconds() > 20) return;

      if (notifs.mealReminders) {
        if (currentHHMM === notifs.breakfastTime) {
          triggerNotification('Coach Max 🍳 Bữa Sáng', 'Đã đến giờ nạp protein và năng lượng cho bữa sáng rồi bạn ơi!');
        } else if (currentHHMM === notifs.lunchTime) {
          triggerNotification('Coach Max 🥗 Bữa Trưa', 'Đến giờ ăn trưa rồi, nhớ ăn nhiều rau và uống nước để hạn chế tích muối nhé!');
        } else if (currentHHMM === notifs.dinnerTime) {
          triggerNotification('Coach Max 🍲 Bữa Tối', 'Bữa tối nhẹ nhàng, ưu tiên thực phẩm giàu Kali ít Natri để sáng mai mặt thon gọn!');
        }
      }

      if (notifs.mewingReminder && currentHHMM === notifs.mewingTime) {
        triggerNotification('Coach Max 🦴 Mewing & Posture Check', 'Chỉnh lại tư thế: Lưng thẳng, cằm thu nhẹ (chin tuck) và áp sát toàn bộ lưỡi lên vòm họng!');
      }

      if (notifs.workoutReminder && currentHHMM === notifs.workoutTime) {
        triggerNotification('Coach Max 🏋️ Giờ Tập Luyện', 'Đến giờ vận động đốt calo và kích thích cơ bắp rồi! Khởi động thôi!');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // When backup data is restored
  const handleDataRestored = () => {
    const p = storageService.getUserProfile();
    if (p) setUserProfile(p);
    const plan = storageService.getSmartPlan();
    if (plan) setCurrentPlan(plan);
    setTodayFoodItems(storageService.getTodayFoodItems());
    setNutrients(storageService.getNutrients());
    setThemeSettings(storageService.getThemeSettings());
    setWaterAmount(storageService.getTodayWater());
  };

  // Mandatory Gate: Require Gemini API Key first
  if (!apiKey) {
    return <ApiKeyGateModal onApiKeySaved={(key) => setApiKey(key)} />;
  }

  // When Onboarding is completed
  const handleOnboardingComplete = (profile: UserProfile, plan: SmartPlan) => {
    setUserProfile(profile);
    setCurrentPlan(plan);
    const synced = storageService.syncNutrientsWithPlan(plan);
    setNutrients(synced);
    setActiveTab('dashboard');
  };

  // When Plan is updated (from Looksmax AI or Plan Tab)
  const handlePlanUpdate = (updatedPlan: SmartPlan) => {
    setCurrentPlan(updatedPlan);
    const synced = storageService.syncNutrientsWithPlan(updatedPlan);
    setNutrients(synced);
  };

  // Add new food item
  const handleFoodAdded = (newItem: FoodItem) => {
    setTodayFoodItems(prev => [newItem, ...prev]);
  };

  // Update existing food item
  const handleFoodUpdated = (updatedItem: FoodItem) => {
    setTodayFoodItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  // Delete food item
  const handleFoodDeleted = (id: string) => {
    storageService.deleteFoodItem(id);
    setTodayFoodItems(prev => prev.filter(i => i.id !== id));
  };

  // Profile reset
  const handleProfileReset = () => {
    setUserProfile(null);
    setCurrentPlan(null);
    setTodayFoodItems([]);
    setWaterAmount(0);
    setApiKey('');
    setIsSettingsOpen(false);
  };

  // Theme change handler
  const handleThemeChange = (newTheme: ThemeSettings) => {
    setThemeSettings(newTheme);
    storageService.saveThemeSettings(newTheme);
  };

  const getBackgroundColor = () => {
    if (themeSettings.backgroundPreset === 'custom_color' && themeSettings.customBgColor) {
      return themeSettings.customBgColor;
    }
    switch (themeSettings.backgroundPreset) {
      case 'oled':
        return '#000000';
      case 'navy':
        return '#090d16';
      case 'purple_dark':
        return '#0d0814';
      case 'carbon':
        return '#0d1117';
      default:
        return '#07090e';
    }
  };

  return (
    <div 
      className="min-h-screen text-slate-100 flex flex-col font-sans relative selection:bg-emerald-500/30 selection:text-emerald-300"
      style={{ backgroundColor: getBackgroundColor() }}
    >
      {/* Optional Custom Background Wallpaper */}
      {themeSettings.customBgImage && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url(${themeSettings.customBgImage})`,
            filter: themeSettings.bgBlur ? `blur(${themeSettings.bgBlur}px)` : 'none',
            transform: themeSettings.bgBlur ? 'scale(1.05)' : 'none'
          }}
        />
      )}

      {/* Dimmer Overlay for Custom Wallpaper */}
      {themeSettings.customBgImage && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-300"
          style={{
            backgroundColor: getBackgroundColor(),
            opacity: themeSettings.bgOverlayOpacity
          }}
        />
      )}

      <div className={`relative z-10 flex flex-col min-h-screen transition-all ${
        isPhoneFrame ? 'items-center justify-center p-2 sm:p-6 bg-black/60 min-h-screen' : ''
      }`}>
        {/* Onboarding Flow: Triggered if no user profile exists */}
        {!userProfile && (
          <OnboardingModal onComplete={handleOnboardingComplete} />
        )}

        {/* Main App Layout */}
        {userProfile && (
          <div className={isPhoneFrame ? 'w-full max-w-[420px] h-[870px] border-[8px] border-slate-700/80 rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col bg-[#07090e] ring-1 ring-white/10' : 'w-full flex flex-col min-h-screen'}>
            
            {/* Android Punch Hole & Status Bar */}
            {isPhoneFrame && (
              <div className="bg-black/90 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-300 select-none shrink-0 relative z-50">
                <span className="font-mono font-bold">20:30</span>
                {/* Camera Punch Hole */}
                <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-700/60 absolute left-1/2 -translate-x-1/2 top-2.5"></div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Top Header */}
            <Navbar
              userProfile={userProfile}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenTheme={() => setIsThemeOpen(true)}
              onTogglePhoneFrame={() => setIsPhoneFrame(prev => !prev)}
              isPhoneFrame={isPhoneFrame}
            />

            {/* Main Content Area */}
            <main className={`flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 ${isPhoneFrame ? 'overflow-y-auto' : ''}`}>
              {activeTab === 'dashboard' && (
                <DashboardView
                  userProfile={userProfile}
                  todayFoodItems={todayFoodItems}
                  nutrients={nutrients}
                  currentPlan={currentPlan}
                  onNavigate={setActiveTab}
                  onWaterUpdate={setWaterAmount}
                  waterAmount={waterAmount}
                />
              )}

              {activeTab === 'food' && (
                <FoodTrackerView
                  userProfile={userProfile}
                  nutrients={nutrients}
                  onNutrientsUpdate={setNutrients}
                  onFoodAdded={handleFoodAdded}
                  onFoodUpdated={handleFoodUpdated}
                  todayFoodItems={todayFoodItems}
                  onFoodDeleted={handleFoodDeleted}
                  currentPlan={currentPlan}
                />
              )}

              {activeTab === 'looksmax' && (
                <LooksmaxView
                  userProfile={userProfile}
                  currentPlan={currentPlan}
                  onPlanUpdate={handlePlanUpdate}
                  onProfileUpdate={setUserProfile}
                />
              )}

              {activeTab === 'coach' && (
                <CoachView
                  userProfile={userProfile}
                  currentPlan={currentPlan}
                  todayFoodItems={todayFoodItems}
                  onFoodAdded={handleFoodAdded}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'plan' && (
                <PlanView
                  currentPlan={currentPlan}
                  userProfile={userProfile}
                  onPlanUpdate={handlePlanUpdate}
                  onNavigate={setActiveTab}
                />
              )}
            </main>

            {/* Bottom Navigation */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Bottom Android Gesture Bar */}
            {isPhoneFrame && (
              <div className="h-4 bg-black/95 flex items-center justify-center shrink-0">
                <div className="w-28 h-1 bg-slate-500/60 rounded-full"></div>
              </div>
            )}

            {/* Settings Modal */}
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              userProfile={userProfile}
              onProfileReset={handleProfileReset}
              onProfileUpdate={setUserProfile}
              onApiKeyChange={(key) => setApiKey(key)}
              onOpenTheme={() => setIsThemeOpen(true)}
              onDataRestored={handleDataRestored}
            />

            {/* Theme Customizer Modal */}
            <ThemeModal
              isOpen={isThemeOpen}
              onClose={() => setIsThemeOpen(false)}
              themeSettings={themeSettings}
              onThemeChange={handleThemeChange}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
