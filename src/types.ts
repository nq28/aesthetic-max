export type AestheticStyle = 'asian_pretty_boy' | 'western_psl';

export type PhysiqueGoal = 'lean_cut' | 'jawline_shred' | 'recomp' | 'height_max';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';

export interface UserProfile {
  age: number; // Asked first! Crucial for puberty vs adult guidance
  isPuberty: boolean; // age < 18
  gender: 'male' | 'female' | 'other';
  height: number; // cm
  weight: number; // kg
  currentBodyFat: number; // %
  targetBodyFat: number; // %
  targetWeight: number; // kg
  aestheticStyle: AestheticStyle;
  physiqueGoal?: PhysiqueGoal;
  physiqueGoals: string[]; // Supports multiple standard and custom goals
  activityLevel: ActivityLevel;
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  createdAt: number;
  startDate?: string; // YYYY-MM-DD (Ngày bắt đầu hành trình)
  foodBudgetPerDayVnd?: number; // Ngân sách ăn uống mỗi ngày (VND), e.g. 50000, 80000, 120000, 0 = không giới hạn
  onboardingCompleted: boolean;
}

export type NutrientCategory = 'macro' | 'debloat' | 'height_growth' | 'energy' | 'custom';

export interface NutrientDefinition {
  id: string;
  name: string;
  unit: string;
  dailyTarget: number;
  category: NutrientCategory;
  isStandard: boolean;
  description?: string;
  color?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  timestamp: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  photoUrl?: string;
  photoUrls?: string[]; // Array of multiple photos if multi-image meal scan
  calories: number;
  nutrients: Record<string, number>; // nutrient id -> quantity
  aiNotes?: string;
  servingSize?: string;
}

export type PslTier = 
  | 'Sub3'
  | 'Sub5'
  | 'LTN'
  | 'MTN'
  | 'HTN'
  | 'Chadlite / Changlite'
  | 'Chad / Chang'
  | 'True Adam';

export interface FacialMetric {
  score: number; // 1-10
  title: string;
  ratingText: string;
  notes: string;
  recommendation: string;
}

export interface LooksmaxAnalysis {
  id: string;
  timestamp: number;
  photoUrl?: string;
  sidePhotoUrl?: string;
  threeQuarterPhotoUrl?: string;
  analyzedAngles?: ('front' | 'side' | 'three_quarter')[];
  pslScore: number; // 1.0 - 8.0
  pslTier: PslTier;
  appealScore: number; // 1.0 - 10.0
  appealTier: string;
  styleEvaluated: AestheticStyle;
  metrics: {
    proportions: FacialMetric & { thirdRatio: string };
    hair: FacialMetric;
    sideProfile: FacialMetric & { gonialAngle: string; chinProjection: string };
    cheekbones: FacialMetric & { hollowCheeksPotential: string };
    maxilla: FacialMetric & { forwardGrowth: string };
    harmony: FacialMetric & { symmetryScore: number };
    canthalTilt: FacialMetric & { tiltType: 'positive' | 'neutral' | 'negative' };
  };
  debloatAdvice: {
    waterRetentionLevel: 'Thấp' | 'Trung bình' | 'Cao (Sưng húp)';
    sodiumTargetMg: number;
    potassiumTargetMg: number;
    waterLiters: number;
    actionSteps: string[];
  };
  bodyFatAdvice: {
    estimatedFacialFatLevel: string;
    targetBodyFatForSharpJawline: number;
    calorieDeficitRecommended: number;
    weeksEstimate: number;
    notes: string;
  };
  pubertyAdvice?: {
    isEligible: boolean;
    heightOptimization: string[];
    boneAndFacialGrowth: string[];
    warnings: string[];
  };
  smartPlanConfig: {
    planName: string;
    calorieTarget: number;
    proteinTarget: number;
    carbTarget: number;
    fatTarget: number;
    sodiumLimitMg: number;
    potassiumTargetMg: number;
    calciumTargetMg: number;
    vitaminD3IU: number;
    zincTargetMg: number;
    magnesiumTargetMg: number;
    workoutFocus: string;
    mewingAndPostureRoutine: string[];
  };
}

export interface SmartPlan {
  isActive: boolean;
  planSource: 'onboarding' | 'looksmax_sync';
  planName: string;
  updatedAt: number;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  sodiumTarget: number;
  potassiumTarget: number;
  calciumTarget: number;
  vitaminD3Target: number;
  zincTarget: number;
  magnesiumTarget: number;
  waterTargetLiters: number;
  debloatActive: boolean;
  workoutSplit: {
    day: string;
    title: string;
    target: string;
    exercises: string[];
  }[];
  dailyHabits: {
    id: string;
    title: string;
    frequency: string;
    category: 'mewing' | 'debloat' | 'posture' | 'growth' | 'skincare';
    completed: boolean;
  }[];
}

export interface DetectedMealItem {
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  servingSize?: string;
  nutrients: Record<string, number>;
  aiNotes?: string;
  applied?: boolean;
  appliedToPlan?: boolean;
  estimatedCostVnd?: number;
  prepTimeMinutes?: number;
  ingredients?: string[];
  recipeQuickSteps?: string[];
}

export interface CoachMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: number;
  imageUrl?: string;
  imageUrls?: string[];
  detectedMeals?: DetectedMealItem[];
  suggestedMealPlan?: DailyMealPlan;
  suggestedPlanApplied?: boolean;
}

export type AccentColor = 'emerald' | 'purple' | 'cyan' | 'gold' | 'crimson' | 'silver' | 'custom';
export type BackgroundPreset = 'obsidian' | 'oled' | 'navy' | 'purple_dark' | 'carbon' | 'custom_color' | 'custom_image';

export interface ThemeSettings {
  accentColor: AccentColor;
  customAccentHex?: string;
  backgroundPreset: BackgroundPreset;
  customBgColor?: string;
  customBgImage?: string; // base64 / data URL
  bgOverlayOpacity: number; // 0.1 to 0.95
  bgBlur: number; // 0 to 20
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  history: Record<string, boolean>; // date -> true
}

export interface HabitNotificationSettings {
  enabled: boolean;
  waterReminder: boolean;
  waterIntervalHours: number;
  mealReminders: boolean;
  breakfastTime: string; // "07:30"
  lunchTime: string; // "12:00"
  dinnerTime: string; // "19:00"
  mewingReminder: boolean;
  mewingTime: string; // "09:30"
  workoutReminder: boolean;
  workoutTime: string; // "17:30"
}

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  totalCalories: number;
  waterMl: number;
  caloriesBurnedEstimate: number;
  weightKg: number;
  foodCount: number;
  habitsCompleted: number;
}

export interface WorkoutBurnItem {
  id: string;
  title: string;
  durationMinutes: number;
  caloriesBurned: number;
  timestamp: number;
}

export type DietType = 
  | 'vietnamese_home'   // Món Việt cơm nhà bình dân
  | 'eat_clean'         // Chuẩn GYM & Eat Clean
  | 'budget_student'    // Tiết kiệm sinh viên (<45k/bữa)
  | 'quick_prep'        // Nhanh gọn (<15 phút)
  | 'high_protein_veg'; // Món chay giàu đạm

export interface PlannedMeal {
  id: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number; // mg
  potassium: number; // mg
  servingSize: string;
  description: string;
  prepTimeMinutes: number;
  ingredients: string[];
  recipeQuickSteps?: string[];
  logged?: boolean;
  estimatedCostVnd?: number; // Chi phí ước tính (VND)
}

export interface GroceryCategory {
  category: string;
  items: { name: string; amount: string; checked: boolean; estimatedCostVnd?: number }[];
}

export interface DailyMealPlan {
  id: string;
  date: string; // YYYY-MM-DD
  dietType: DietType;
  targetCalories: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSodium: number;
  totalPotassium: number;
  debloatScore: 'Xuất sắc' | 'Tốt' | 'Cần chú ý';
  debloatRatio: number; // Potassium / Sodium
  aiChefAdvice: string;
  meals: PlannedMeal[];
  groceryList: GroceryCategory[];
  dailyBudgetVnd?: number; // Ngân sách mục tiêu (VND)
  totalEstimatedCostVnd?: number; // Tổng chi phí thực tế ước tính (VND)
}


