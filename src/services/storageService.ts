import { 
  UserProfile, 
  FoodItem, 
  NutrientDefinition, 
  LooksmaxAnalysis, 
  SmartPlan, 
  CoachMessage, 
  ThemeSettings,
  StreakData,
  HabitNotificationSettings,
  DailySnapshot,
  WorkoutBurnItem
} from '../types';
import { STANDARD_NUTRIENTS } from '../constants/nutrients';

const KEYS = {
  USER_PROFILE: 'aesthetic_max_user_profile',
  FOOD_ITEMS: 'aesthetic_max_food_items',
  NUTRIENTS: 'aesthetic_max_nutrients_list',
  LOOKSMAX_HISTORY: 'aesthetic_max_looksmax_history',
  SMART_PLAN: 'aesthetic_max_smart_plan',
  GEMINI_API_KEY: 'aesthetic_max_gemini_api_key',
  WATER_INTAKE: 'aesthetic_max_water_intake',
  COACH_MESSAGES: 'aesthetic_max_coach_messages',
  THEME_SETTINGS: 'aesthetic_max_theme_settings',
  STREAK_DATA: 'aesthetic_max_streak_data',
  DAILY_HISTORY: 'aesthetic_max_daily_history',
  NOTIFICATION_SETTINGS: 'aesthetic_max_notification_settings',
  WORKOUT_BURN: 'aesthetic_max_workout_burn',
};

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`LocalStorage write warning for ${key}:`, err?.message || err);
    try {
      // 1. If it's FOOD_ITEMS, drop photoUrls and keep latest 50 items
      if (key === KEYS.FOOD_ITEMS) {
        const items = JSON.parse(value);
        const slimItems = items.slice(0, 50).map((i: any) => ({
          ...i,
          photoUrl: undefined
        }));
        localStorage.setItem(key, JSON.stringify(slimItems));
        return true;
      }

      // 2. If it's COACH_MESSAGES, keep only last 20 messages and clear older base64 images
      if (key === KEYS.COACH_MESSAGES) {
        const msgs = JSON.parse(value);
        const trimmed = msgs.slice(-20).map((m: any, idx: number) => ({
          ...m,
          imageUrl: idx >= msgs.slice(-20).length - 1 ? m.imageUrl : undefined
        }));
        localStorage.setItem(key, JSON.stringify(trimmed));
        return true;
      }

      // 3. If it's LOOKSMAX_HISTORY, keep only last 5
      if (key === KEYS.LOOKSMAX_HISTORY) {
        const history = JSON.parse(value);
        const trimmed = history.slice(0, 5);
        localStorage.setItem(key, JSON.stringify(trimmed));
        return true;
      }
    } catch (fallbackErr) {
      console.error('SafeSetItem fallback failed:', fallbackErr);
    }
    return false;
  }
}

export const storageService = {
  // User Profile
  getUserProfile: (): UserProfile | null => {
    try {
      const data = localStorage.getItem(KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveUserProfile: (profile: UserProfile): void => {
    localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  },

  // Gemini API Key
  getApiKey: (): string => {
    return localStorage.getItem(KEYS.GEMINI_API_KEY) || '';
  },

  saveApiKey: (key: string): void => {
    localStorage.setItem(KEYS.GEMINI_API_KEY, key.trim());
  },

  // Nutrients List (Standard + Custom)
  syncNutrientsWithPlan: (plan: SmartPlan, baseNutrients?: NutrientDefinition[]): NutrientDefinition[] => {
    let list = baseNutrients;
    if (!list || list.length === 0) {
      try {
        const data = localStorage.getItem(KEYS.NUTRIENTS);
        list = data ? JSON.parse(data) : [...STANDARD_NUTRIENTS];
      } catch {
        list = [...STANDARD_NUTRIENTS];
      }
    }

    if (!list || list.length === 0) {
      list = [...STANDARD_NUTRIENTS];
    }

    const updated = list.map(n => {
      let target = n.dailyTarget;
      switch (n.id) {
        case 'protein':
          if (plan.proteinTarget) target = plan.proteinTarget;
          break;
        case 'carbs':
          if (plan.carbTarget) target = plan.carbTarget;
          break;
        case 'fat':
          if (plan.fatTarget) target = plan.fatTarget;
          break;
        case 'sodium':
          if (plan.sodiumTarget) target = plan.sodiumTarget;
          break;
        case 'potassium':
          if (plan.potassiumTarget) target = plan.potassiumTarget;
          break;
        case 'calcium':
          if (plan.calciumTarget) target = plan.calciumTarget;
          break;
        case 'vitamin_d3':
          if (plan.vitaminD3Target) target = plan.vitaminD3Target;
          break;
        case 'zinc':
          if (plan.zincTarget) target = plan.zincTarget;
          break;
        case 'magnesium':
          if (plan.magnesiumTarget) target = plan.magnesiumTarget;
          break;
      }
      return { ...n, dailyTarget: target };
    });

    localStorage.setItem(KEYS.NUTRIENTS, JSON.stringify(updated));
    return updated;
  },

  getNutrients: (): NutrientDefinition[] => {
    let list: NutrientDefinition[] = [];
    try {
      const data = localStorage.getItem(KEYS.NUTRIENTS);
      if (data) {
        list = JSON.parse(data);
      }
    } catch {
      // Fallback
    }

    if (!list || list.length === 0) {
      list = [...STANDARD_NUTRIENTS];
    }

    // Auto-sync with existing smart plan if present
    const plan = storageService.getSmartPlan();
    if (plan) {
      return storageService.syncNutrientsWithPlan(plan, list);
    }

    storageService.saveNutrients(list);
    return list;
  },

  saveNutrients: (nutrients: NutrientDefinition[]): void => {
    localStorage.setItem(KEYS.NUTRIENTS, JSON.stringify(nutrients));
  },

  addCustomNutrient: (nutrient: Omit<NutrientDefinition, 'isStandard'>): NutrientDefinition[] => {
    const current = storageService.getNutrients();
    const newNutrient: NutrientDefinition = {
      ...nutrient,
      isStandard: false
    };
    const updated = [...current, newNutrient];
    storageService.saveNutrients(updated);
    return updated;
  },

  // Food Items
  getFoodItems: (): FoodItem[] => {
    try {
      const data = localStorage.getItem(KEYS.FOOD_ITEMS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getTodayFoodItems: (): FoodItem[] => {
    const all = storageService.getFoodItems();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return all.filter(item => item.timestamp >= startOfDay.getTime());
  },

  addFoodItem: (item: Omit<FoodItem, 'id' | 'timestamp'>): FoodItem => {
    const all = storageService.getFoodItems();
    const newItem: FoodItem = {
      ...item,
      id: 'food_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now()
    };
    const updated = [newItem, ...all.slice(0, 100)];
    safeSetItem(KEYS.FOOD_ITEMS, JSON.stringify(updated));
    return newItem;
  },

  deleteFoodItem: (id: string): void => {
    const all = storageService.getFoodItems();
    const updated = all.filter(i => i.id !== id);
    safeSetItem(KEYS.FOOD_ITEMS, JSON.stringify(updated));
  },

  // Looksmax Analysis
  getLooksmaxHistory: (): LooksmaxAnalysis[] => {
    try {
      const data = localStorage.getItem(KEYS.LOOKSMAX_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getLatestLooksmax: (): LooksmaxAnalysis | null => {
    const history = storageService.getLooksmaxHistory();
    return history.length > 0 ? history[0] : null;
  },

  saveLooksmaxAnalysis: (analysis: LooksmaxAnalysis): void => {
    const current = storageService.getLooksmaxHistory();
    const updated = [analysis, ...current.slice(0, 9)];
    safeSetItem(KEYS.LOOKSMAX_HISTORY, JSON.stringify(updated));
  },

  // Smart Plan
  getSmartPlan: (): SmartPlan | null => {
    try {
      const data = localStorage.getItem(KEYS.SMART_PLAN);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveSmartPlan: (plan: SmartPlan): void => {
    localStorage.setItem(KEYS.SMART_PLAN, JSON.stringify(plan));
    storageService.syncNutrientsWithPlan(plan);
  },

  // Water Intake (in ml)
  getTodayWater: (): number => {
    try {
      const key = `${KEYS.WATER_INTAKE}_${new Date().toISOString().slice(0, 10)}`;
      const val = localStorage.getItem(key);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },

  addWater: (amountMl: number): number => {
    const key = `${KEYS.WATER_INTAKE}_${new Date().toISOString().slice(0, 10)}`;
    const current = storageService.getTodayWater();
    const next = Math.max(0, current + amountMl);
    localStorage.setItem(key, next.toString());
    return next;
  },

  // Coach Messages
  getCoachMessages: (): CoachMessage[] => {
    try {
      const data = localStorage.getItem(KEYS.COACH_MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCoachMessages: (messages: CoachMessage[]): void => {
    safeSetItem(KEYS.COACH_MESSAGES, JSON.stringify(messages));
  },

  clearCoachMessages: (): void => {
    localStorage.removeItem(KEYS.COACH_MESSAGES);
  },

  // Theme & Appearance Customization
  getThemeSettings: (): ThemeSettings => {
    const defaultTheme: ThemeSettings = {
      accentColor: 'emerald',
      backgroundPreset: 'obsidian',
      bgOverlayOpacity: 0.75,
      bgBlur: 0
    };
    try {
      const data = localStorage.getItem(KEYS.THEME_SETTINGS);
      return data ? { ...defaultTheme, ...JSON.parse(data) } : defaultTheme;
    } catch {
      return defaultTheme;
    }
  },

  saveThemeSettings: (settings: ThemeSettings): void => {
    localStorage.setItem(KEYS.THEME_SETTINGS, JSON.stringify(settings));
  },

  // Daily Streak System
  getStreakData: (): StreakData => {
    const defaultStreak: StreakData = {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      history: { [new Date().toISOString().slice(0, 10)]: true }
    };
    try {
      const data = localStorage.getItem(KEYS.STREAK_DATA);
      return data ? { ...defaultStreak, ...JSON.parse(data) } : defaultStreak;
    } catch {
      return defaultStreak;
    }
  },

  recordDailyActive: (): StreakData => {
    const current = storageService.getStreakData();
    const today = new Date().toISOString().slice(0, 10);

    if (current.lastActiveDate === today) {
      current.history[today] = true;
      localStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(current));
      return current;
    }

    // Check if yesterday
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().slice(0, 10);

    let nextStreak = current.currentStreak;
    if (current.lastActiveDate === yesterday) {
      nextStreak += 1;
    } else {
      nextStreak = 1; // reset streak if missed a day
    }

    const updated: StreakData = {
      currentStreak: nextStreak,
      longestStreak: Math.max(current.longestStreak, nextStreak),
      lastActiveDate: today,
      history: { ...current.history, [today]: true }
    };

    localStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(updated));
    return updated;
  },

  // Daily History & Snapshots
  getDailyHistory: (): Record<string, DailySnapshot> => {
    try {
      const data = localStorage.getItem(KEYS.DAILY_HISTORY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveDailySnapshot: (snapshot: Partial<DailySnapshot>): void => {
    const today = new Date().toISOString().slice(0, 10);
    const history = storageService.getDailyHistory();
    const existing = history[today] || {
      date: today,
      totalCalories: 0,
      waterMl: 0,
      caloriesBurnedEstimate: 0,
      weightKg: 0,
      foodCount: 0,
      habitsCompleted: 0
    };

    history[today] = { ...existing, ...snapshot };
    localStorage.setItem(KEYS.DAILY_HISTORY, JSON.stringify(history));
  },

  // Habit Notification Settings
  getNotificationSettings: (): HabitNotificationSettings => {
    const defaultSettings: HabitNotificationSettings = {
      enabled: true,
      waterReminder: true,
      waterIntervalHours: 2,
      mealReminders: true,
      breakfastTime: '07:30',
      lunchTime: '12:00',
      dinnerTime: '19:00',
      mewingReminder: true,
      mewingTime: '09:30',
      workoutReminder: true,
      workoutTime: '17:30'
    };
    try {
      const data = localStorage.getItem(KEYS.NOTIFICATION_SETTINGS);
      return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  saveNotificationSettings: (settings: HabitNotificationSettings): void => {
    localStorage.setItem(KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  },

  // Workout Burn Tracking
  getTodayWorkoutBurn: (): WorkoutBurnItem[] => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const data = localStorage.getItem(`${KEYS.WORKOUT_BURN}_${today}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addWorkoutBurn: (item: Omit<WorkoutBurnItem, 'id' | 'timestamp'>): WorkoutBurnItem => {
    const today = new Date().toISOString().slice(0, 10);
    const all = storageService.getTodayWorkoutBurn();
    const newItem: WorkoutBurnItem = {
      ...item,
      id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now()
    };
    const updated = [newItem, ...all];
    localStorage.setItem(`${KEYS.WORKOUT_BURN}_${today}`, JSON.stringify(updated));
    return newItem;
  },

  // Backup & Restore System
  exportBackupData: (): string => {
    const today = new Date().toISOString().slice(0, 10);
    const backup = {
      app: 'AestheticMax',
      version: '1.0',
      exportTimestamp: Date.now(),
      exportDate: today,
      userProfile: storageService.getUserProfile(),
      nutrients: storageService.getNutrients(),
      foodItems: storageService.getFoodItems(),
      looksmaxHistory: storageService.getLooksmaxHistory(),
      smartPlan: storageService.getSmartPlan(),
      coachMessages: storageService.getCoachMessages(),
      themeSettings: storageService.getThemeSettings(),
      streakData: storageService.getStreakData(),
      dailyHistory: storageService.getDailyHistory(),
      notificationSettings: storageService.getNotificationSettings(),
      todayWorkoutBurn: storageService.getTodayWorkoutBurn()
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupData: (jsonString: string): boolean => {
    try {
      const backup = JSON.parse(jsonString);
      if (!backup || typeof backup !== 'object') return false;

      if (backup.userProfile) localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(backup.userProfile));
      if (backup.nutrients) localStorage.setItem(KEYS.NUTRIENTS, JSON.stringify(backup.nutrients));
      if (backup.foodItems) localStorage.setItem(KEYS.FOOD_ITEMS, JSON.stringify(backup.foodItems));
      if (backup.looksmaxHistory) localStorage.setItem(KEYS.LOOKSMAX_HISTORY, JSON.stringify(backup.looksmaxHistory));
      if (backup.smartPlan) localStorage.setItem(KEYS.SMART_PLAN, JSON.stringify(backup.smartPlan));
      if (backup.coachMessages) localStorage.setItem(KEYS.COACH_MESSAGES, JSON.stringify(backup.coachMessages));
      if (backup.themeSettings) localStorage.setItem(KEYS.THEME_SETTINGS, JSON.stringify(backup.themeSettings));
      if (backup.streakData) localStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(backup.streakData));
      if (backup.dailyHistory) localStorage.setItem(KEYS.DAILY_HISTORY, JSON.stringify(backup.dailyHistory));
      if (backup.notificationSettings) localStorage.setItem(KEYS.NOTIFICATION_SETTINGS, JSON.stringify(backup.notificationSettings));
      return true;
    } catch (e) {
      console.error('Backup import error:', e);
      return false;
    }
  },

  // Reset all for testing
  clearAll: (): void => {
    localStorage.clear();
  }
};
