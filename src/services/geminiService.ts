import { FoodItem, LooksmaxAnalysis, UserProfile, SmartPlan, DetectedMealItem, DailyMealPlan, PlannedMeal, DietType } from '../types';
import { storageService } from './storageService';
import { compressImageToThumbnail } from '../utils/imageUtils';

export interface AiRoadmapResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
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
  aiAdvice: string;
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

// Preferred order of models: flash-lite has maximum availability during peak hours
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

async function callGeminiApi(apiKey: string, payload: any): Promise<any> {
  let lastError = '';

  for (const model of CANDIDATE_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return await response.json();
      }

      const errorData = await response.json().catch(() => null);
      lastError = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      // Check if this error is temporary high demand, quota spike, or model deprecation
      const isTemporaryOrModelError = 
        lastError.includes('high demand') ||
        lastError.includes('Spikes in demand') ||
        lastError.includes('temporarily') ||
        lastError.includes('no longer available') ||
        lastError.includes('not found') ||
        lastError.includes('RESOURCE_EXHAUSTED') ||
        lastError.includes('quota') ||
        response.status === 429 ||
        response.status === 503 ||
        response.status === 404;

      if (isTemporaryOrModelError) {
        console.warn(`Model ${model} returned: ${lastError}. Trying next candidate model...`);
        continue;
      }

      // If it's an invalid key error (400 / 403), stop immediately
      if (lastError.includes('API_KEY_INVALID') || lastError.includes('API key not valid') || response.status === 400 || response.status === 403) {
        throw new Error(`Khóa API không hợp lệ: ${lastError}`);
      }

      // Otherwise try next
      continue;
    } catch (err: any) {
      lastError = err.message || 'Lỗi mạng khi kết nối Gemini API';
      if (lastError.includes('Khóa API không hợp lệ')) {
        throw err;
      }
    }
  }

  throw new Error(lastError || 'Tất cả các mô hình Gemini đang bận do lưu lượng cao. Vui lòng thử lại sau 1-2 phút!');
}

export const geminiService = {
  // Validate API key with Google's lightweight models endpoint (instant, 0 tokens, immune to high demand)
  validateApiKey: async (apiKey: string): Promise<{ valid: boolean; message: string }> => {
    const key = apiKey.trim();
    if (!key) {
      return { valid: false, message: 'Vui lòng nhập khóa API Gemini!' };
    }

    try {
      // 1. Direct key verification via models list endpoint (Official Google API)
      const listEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const response = await fetch(listEndpoint);

      if (response.ok) {
        return { 
          valid: true, 
          message: 'Khóa API Gemini hợp lệ! Đã kết nối thành công với Google AI Studio.' 
        };
      }

      const errorData = await response.json().catch(() => null);
      const errMsg = errorData?.error?.message || `HTTP ${response.status}`;

      // If the error message mentions high demand, the key IS actually valid!
      if (errMsg.includes('high demand') || errMsg.includes('Spikes in demand') || response.status === 503 || response.status === 429) {
        return { 
          valid: true, 
          message: 'Khóa API Gemini hợp lệ! (Hệ thống đã tự động định tuyến sang model tối ưu).' 
        };
      }

      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        return { valid: false, message: 'Khóa API không tồn tại hoặc nhập sai. Hãy kiểm tra lại tại Google AI Studio!' };
      }

      return { valid: false, message: `Lỗi xác thực: ${errMsg}` };
    } catch (err: any) {
      return { valid: false, message: `Không thể kết nối đến máy chủ Google: ${err.message}` };
    }
  },

  // 100% AI Generated Roadmap & Nutrition Calculation from User Profile
  generateRoadmapWithAi: async (input: {
    age: number;
    gender: 'male' | 'female' | 'other';
    height: number;
    weight: number;
    currentBodyFat: number;
    targetBodyFat: number;
    aestheticStyle: string;
    physiqueGoals: string[];
    activityLevel: string;
  }): Promise<AiRoadmapResult> => {
    const apiKey = storageService.getApiKey();
    if (!apiKey) {
      throw new Error('Chưa có khóa API Gemini. Vui lòng nhập API Key để AI tính toán!');
    }

    const isPuberty = input.age < 18;
    const prompt = `You are a world-class elite sports nutrition scientist, endocrinology researcher, and craniofacial aesthetic expert.
Calculate the complete personalized nutrition roadmap and workout split for this individual:
- Age: ${input.age} years old (${isPuberty ? 'PUBERTY: Crucial height growth and skull bone development. STRICT RULE: DO NOT prescribe extreme caloric deficit. Maximize growth plate nutrition (Calcium, D3, Zinc, Magnesium, high quality protein).' : 'Adult'})
- Gender: ${input.gender}
- Height: ${input.height} cm
- Weight: ${input.weight} kg
- Current Body Fat: ${input.currentBodyFat}%
- Target Body Fat: ${input.targetBodyFat}%
- Aesthetic Style: ${input.aestheticStyle === 'asian_pretty_boy' ? 'Asian Pretty Boy (Harmonious appeal, refined jaw, glowing skin, facial debloat)' : 'Western PSL Warrior (Angular jawline, high maxilla projection, hollow cheeks, dimorphism)'}
- Specific Physical Goals: ${input.physiqueGoals.join(', ')}
- Activity Level: ${input.activityLevel}

Calculate and return strictly valid JSON matching this exact structure:
{
  "bmr": number (integer, Mifflin-St Jeor),
  "tdee": number (integer),
  "targetCalories": number (integer, deficit/surplus tailored to goals and age),
  "proteinTarget": number (grams, 1.8-2.2g per kg),
  "carbTarget": number (grams),
  "fatTarget": number (grams, 0.7-1.0g per kg for hormone production),
  "sodiumTarget": number (mg, strict for debloat, e.g. 1500-1800mg),
  "potassiumTarget": number (mg, e.g. 3800-4200mg to flush water from cheeks),
  "calciumTarget": number (mg, 1200-1500mg especially for height/bone),
  "vitaminD3Target": number (IU, 2000-4000IU),
  "zincTarget": number (mg, 15-20mg for testosterone, skin & GH),
  "magnesiumTarget": number (mg, 400-500mg for sleep GH release),
  "waterTargetLiters": number (e.g. 3.5),
  "aiAdvice": string (Detailed, empowering personalized advice in Vietnamese about reaching their goals, balancing debloat, and jawline revelation),
  "workoutSplit": [
    {
      "day": "Thứ 2 & Thứ 5",
      "title": "Upper Body V-Taper (Vai & Xô tôn dáng mặt)",
      "target": "string",
      "exercises": ["Overhead Shoulder Press", "Lat Pulldown", "Incline Dumbbell Press", "Lateral Raises"]
    },
    {
      "day": "Thứ 3 & Thứ 6",
      "title": "Lower Body & Core (Tăng Testosterone)",
      "target": "string",
      "exercises": ["Barbell Squat", "Romanian Deadlift", "Hanging Leg Raises", "Plank"]
    },
    {
      "day": "Hàng ngày",
      "title": "Debloat & LISS Cardio",
      "target": "Xả nước tích tụ ở mặt",
      "exercises": ["Đi bộ 8,000 - 10,000 bước", "Chườm đá lạnh buổi sáng"]
    }
  ],
  "dailyHabits": [
    {
      "id": "h_mewing",
      "title": "Mewing chuẩn (áp toàn bộ mặt lưỡi lên vòm họng mềm)",
      "frequency": "24/7",
      "category": "mewing",
      "completed": false
    },
    {
      "id": "h_chin_tuck",
      "title": "Chin Tucks sửa tật gù cổ (3 hiệp x 15 lần)",
      "frequency": "Mỗi sáng & tối",
      "category": "posture",
      "completed": false
    },
    {
      "id": "h_debloat",
      "title": "Uống 1 ly nước ấm + khoáng Kali khi ngủ dậy",
      "frequency": "Mỗi sáng",
      "category": "debloat",
      "completed": false
    },
    {
      "id": "h_nasal",
      "title": "Thở 100% bằng mũi (tuyệt đối không thở miệng)",
      "frequency": "24/7",
      "category": "mewing",
      "completed": false
    }
  ]
}
All notes and text in Vietnamese. Return ONLY raw JSON without markdown formatting.`;

    const data = await callGeminiApi(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error('Không nhận được phản hồi từ Gemini AI');

    return JSON.parse(textOutput) as AiRoadmapResult;
  },

  // Analyze Food via Gemini Vision / Text (Strictly AI - Supports Multiple Photos)
  analyzeFood: async (
    input: { 
      textDescription?: string; 
      imageBase64?: string; 
      imagesBase64?: string[]; 
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    },
    customNutrientsList: { id: string; name: string; unit: string }[] = []
  ): Promise<Omit<FoodItem, 'id' | 'timestamp'>> => {
    const apiKey = storageService.getApiKey();
    if (!apiKey) {
      throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập API Key để AI phân tích món ăn!');
    }

    // Collect all unique images (supports both single imageBase64 and multi-photo imagesBase64)
    const allImages: string[] = [];
    if (input.imagesBase64 && Array.isArray(input.imagesBase64)) {
      input.imagesBase64.forEach(img => {
        if (img && typeof img === 'string' && !allImages.includes(img)) {
          allImages.push(img);
        }
      });
    }
    if (input.imageBase64 && !allImages.includes(input.imageBase64)) {
      allImages.unshift(input.imageBase64);
    }

    const customListPrompt = customNutrientsList.length > 0 
      ? `Also estimate these custom requested nutrients: ${customNutrientsList.map(n => `${n.name} (id: "${n.id}", unit: "${n.unit}")`).join(', ')}.`
      : '';

    const systemPrompt = `You are a certified sports clinical nutritionist, biochemist, and aesthetic physique specialist.
Analyze the provided food image(s) and/or text description with highest precision.
${allImages.length > 1 ? `IMPORTANT MULTI-IMAGE INSTRUCTION:
There are ${allImages.length} photos attached representing this single meal.
The photos may capture different dishes, side dishes, bowls, soup, drinks, sauces, desserts, or multiple plates/angles of the meal.
Identify and combine ALL food items, side dishes, drinks, and snacks detected across ALL ${allImages.length} photos into one comprehensive meal total:
- calories: Total combined calories (kcal) of all dishes and beverages across all photos.
- name: Vietnamese meal title combining the main dishes & drinks (e.g., "Cơm sườn bì chả + Canh cải thịt bằm + Nước dừa tươi").
- servingSize: Detailed portion estimation of all items (e.g., "1 đĩa cơm 400g, 1 bát canh 200ml, 1 cốc 300ml").` : `Return strict JSON with nutritional data:
- calories (integer kcal)
- name (Vietnamese meal title)
- servingSize (portion estimation in grams or descriptive)`}
- nutrients: {
    protein (grams - total combined),
    carbs (grams - total combined),
    fat (grams - total combined),
    fiber (grams),
    sugar (grams),
    sodium (mg - critical for facial water retention and debloat),
    potassium (mg - counteracts sodium for jawline definition),
    calcium (mg - bone density & height growth),
    vitamin_d3 (IU - calcium absorption & growth),
    zinc (mg - testosterone, collagen & skin repair),
    magnesium (mg - muscle relaxation & sleep GH synthesis),
    iron (mg - blood circulation & eye bags),
    caffeine (mg)
  }
${customListPrompt}
- aiNotes: Insightful advice in Vietnamese concerning facial debloat, jawline fat reduction, or bone/muscle optimization.${allImages.length > 1 ? ' Mention each of the dishes and drinks identified across the photos.' : ''}

Return ONLY raw JSON without markdown.`;

    const contents: any[] = [];
    const parts: any[] = [{ text: systemPrompt }];

    if (input.textDescription) {
      parts.push({ text: `Food description / user notes: "${input.textDescription}"` });
    }

    allImages.forEach((img, idx) => {
      const mimeType = img.startsWith('data:image/png')
        ? 'image/png'
        : img.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';
      const base64Data = img.includes(',') 
        ? img.split(',')[1] 
        : img;
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
      if (allImages.length > 1) {
        parts.push({ text: `[Ảnh #${idx + 1}/${allImages.length}]` });
      }
    });

    contents.push({ parts });

    const data = await callGeminiApi(apiKey, {
      contents,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error('Không nhận được dữ liệu từ Gemini Vision AI');

    const parsed = JSON.parse(textOutput);
    return {
      name: parsed.name || 'Món ăn phân tích bởi Gemini AI',
      calories: Math.round(parsed.calories || 300),
      servingSize: parsed.servingSize || '1 phần chuẩn',
      mealType: input.mealType || 'lunch',
      photoUrl: allImages[0] || undefined,
      photoUrls: allImages.length > 0 ? allImages : undefined,
      nutrients: parsed.nutrients || {},
      aiNotes: parsed.aiNotes || 'Được phân tích trực tiếp bởi Gemini AI.'
    };
  },

  // Analyze Face for Looksmaxxing (Strictly AI, supports Front, Side 90°, and 3/4 Views)
  analyzeFace: async (
    imagesInput: string | { front: string; side?: string; threeQuarter?: string },
    userProfile: UserProfile
  ): Promise<LooksmaxAnalysis> => {
    const apiKey = storageService.getApiKey();
    if (!apiKey) {
      throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập API Key để AI chấm điểm khuôn mặt!');
    }

    const isPuberty = userProfile.age < 18;
    const isAsian = userProfile.aestheticStyle === 'asian_pretty_boy';

    // Normalize input
    const frontImage = typeof imagesInput === 'string' ? imagesInput : imagesInput.front;
    const sideImage = typeof imagesInput === 'object' ? imagesInput.side : undefined;
    const threeQuarterImage = typeof imagesInput === 'object' ? imagesInput.threeQuarter : undefined;

    const analyzedAngles: ('front' | 'side' | 'three_quarter')[] = ['front'];
    if (sideImage) analyzedAngles.push('side');
    if (threeQuarterImage) analyzedAngles.push('three_quarter');

    const prompt = `You are a world-class aesthetician, craniofacial researcher, and looksmaxxing consultant.
Analyze this human face using all provided photographic angles (Front, Side profile 90°, Three-quarters 3/4) according to objective aesthetic principles and the user's specific context:
- User Age: ${userProfile.age} (${isPuberty ? 'PUBERTY AGE - Growth plates active, emphasize maxilla posture, proper chewing, no extreme caloric starvation' : 'Adult'})
- Height: ${userProfile.height} cm, Weight: ${userProfile.weight} kg, Body fat: ${userProfile.currentBodyFat}%
- Target Aesthetic: ${isAsian ? 'Asian Pretty Boy & Appeal (refined harmony, glowing skin, clear eye appeal, soft angularity, debloat focus)' : 'Western PSL & Dimorphism (forward maxilla, strong gonial angle, hollow cheeks, brow ridge)'}
- Personal Goals: ${(userProfile.physiqueGoals || []).join(', ')}
- Available Angles: ${analyzedAngles.join(', ')}.

CRITICAL MULTI-ANGLE ANALYSIS GUIDELINES:
1. Front View: Evaluate facial thirds symmetry, bi-zygomatic width vs bi-gonial width, eye spacing (ESR), canthal tilt, lip-to-nose ratio.
2. Side View (90° Profile): Specifically measure Gonial Angle (ideal 115°-125° vs obtuse/steep), Mandibular plane angle, Pogonion/Chin projection relative to lower lip and Frankfort horizontal line, Maxillary forward growth (nasion perpendicular), and submental fat.
3. 3/4 Angle (45°): Assess Ogee Curve, Zygomatic arch prominence, midface flatness, buccal fat vs hollow cheek potential.
Cross-correlate across all provided angles for the most rigorous and accurate 3D craniofacial assessment.

Evaluate objectively on TWO SCALES:
1. PSL Scale (1.0 to 8.0, where 3=Sub3, 4=Sub5, 5.0=LTN, 5.6=MTN, 6.3=HTN, 7.0=Chadlite/Changlite, 7.6=Chad/Chang, 8.0=True Adam).
2. Appeal Scale (1.0 to 10.0, general mass appeal, charisma, grooming, hair synergy).

Return strict JSON with this exact schema:
{
  "pslScore": number (1.0-8.0),
  "pslTier": string ("Sub3"|"Sub5"|"LTN"|"MTN"|"HTN"|"Chadlite / Changlite"|"Chad / Chang"|"True Adam"),
  "appealScore": number (1.0-10.0),
  "appealTier": string,
  "metrics": {
    "proportions": { "score": number, "title": "Tỉ lệ khuôn mặt", "ratingText": string, "notes": string, "recommendation": string, "thirdRatio": string },
    "hair": { "score": number, "title": "Tóc & Đường chân tóc", "ratingText": string, "notes": string, "recommendation": string },
    "sideProfile": { "score": number, "title": "Góc nghiêng & Xương hàm", "ratingText": string, "notes": string, "recommendation": string, "gonialAngle": string, "chinProjection": string },
    "cheekbones": { "score": number, "title": "Gò má & Vùng má", "ratingText": string, "notes": string, "recommendation": string, "hollowCheeksPotential": string },
    "maxilla": { "score": number, "title": "Xương hàm trên (Maxilla)", "ratingText": string, "notes": string, "recommendation": string, "forwardGrowth": string },
    "harmony": { "score": number, "title": "Độ hài hòa & Đối xứng", "ratingText": string, "notes": string, "recommendation": string, "symmetryScore": number },
    "canthalTilt": { "score": number, "title": "Vùng mắt & Canthal Tilt", "ratingText": string, "notes": string, "recommendation": string, "tiltType": "positive"|"neutral"|"negative" }
  },
  "debloatAdvice": {
    "waterRetentionLevel": "Thấp"|"Trung bình"|"Cao (Sưng húp)",
    "sodiumTargetMg": number,
    "potassiumTargetMg": number,
    "waterLiters": number,
    "actionSteps": string[]
  },
  "bodyFatAdvice": {
    "estimatedFacialFatLevel": string,
    "targetBodyFatForSharpJawline": number,
    "calorieDeficitRecommended": number,
    "weeksEstimate": number,
    "notes": string
  },
  "pubertyAdvice": {
    "isEligible": boolean,
    "heightOptimization": string[],
    "boneAndFacialGrowth": string[],
    "warnings": string[]
  },
  "smartPlanConfig": {
    "planName": string,
    "calorieTarget": number,
    "proteinTarget": number,
    "carbTarget": number,
    "fatTarget": number,
    "sodiumLimitMg": number,
    "potassiumTargetMg": number,
    "calciumTargetMg": number,
    "vitaminD3IU": number,
    "zincTargetMg": number,
    "magnesiumTargetMg": number,
    "workoutFocus": string,
    "mewingAndPostureRoutine": string[]
  }
}
All explanatory text must be in natural, empowering Vietnamese. Return only valid raw JSON without markdown.`;

    const parts: any[] = [{ text: prompt }];

    // Add Front View
    const frontBase64 = frontImage.includes(',') ? frontImage.split(',')[1] : frontImage;
    parts.push({ text: '📸 [Ảnh 1: Góc chính diện (Frontal View)]' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: frontBase64 } });

    // Add Side View if provided
    if (sideImage) {
      const sideBase64 = sideImage.includes(',') ? sideImage.split(',')[1] : sideImage;
      parts.push({ text: '📸 [Ảnh 2: Góc nghiêng 90° (Profile / Side View) - Đánh giá Gonial Angle, độ nhô cằm và forward growth]' });
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: sideBase64 } });
    }

    // Add 3/4 View if provided
    if (threeQuarterImage) {
      const tqBase64 = threeQuarterImage.includes(',') ? threeQuarterImage.split(',')[1] : threeQuarterImage;
      parts.push({ text: '📸 [Ảnh 3: Góc 3/4 45° (Three-Quarter View) - Đánh giá Ogee curve và gò má Zygoma]' });
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: tqBase64 } });
    }

    const data = await callGeminiApi(apiKey, {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json'
      }
    });

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error('Không nhận được kết quả chấm điểm từ Gemini AI');

    const parsed = JSON.parse(textOutput);

    // Compress thumbnails before saving to ensure localStorage safety
    const compressedFront = await compressImageToThumbnail(frontImage, 320, 320, 0.7);
    const compressedSide = sideImage ? await compressImageToThumbnail(sideImage, 320, 320, 0.7) : undefined;
    const compressedTq = threeQuarterImage ? await compressImageToThumbnail(threeQuarterImage, 320, 320, 0.7) : undefined;

    return {
      id: 'looksmax_' + Date.now(),
      timestamp: Date.now(),
      photoUrl: compressedFront,
      sidePhotoUrl: compressedSide,
      threeQuarterPhotoUrl: compressedTq,
      analyzedAngles,
      styleEvaluated: userProfile.aestheticStyle,
      ...parsed
    };
  },

  // Interactive Coach AI Chat (Multimodal + Meal & Workout Detection)
  chatWithCoach: async (
    conversationHistory: { role: 'user' | 'model'; text: string }[],
    userMessage: string,
    context: {
      userProfile: UserProfile;
      currentPlan: SmartPlan | null;
      todayFoodItems: FoodItem[];
      latestLooksmax: LooksmaxAnalysis | null;
      dailyMealPlan?: DailyMealPlan | null;
    },
    imageBase64?: string | string[]
  ): Promise<{ text: string; detectedMeals?: DetectedMealItem[]; suggestedMealPlan?: DailyMealPlan }> => {
    const apiKey = storageService.getApiKey();
    if (!apiKey) {
      throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập API Key để chat với Coach!');
    }

    const isPuberty = context.userProfile.age < 18;
    const isAsian = context.userProfile.aestheticStyle === 'asian_pretty_boy';
    const totalCaloriesToday = context.todayFoodItems.reduce((acc, item) => acc + (item.calories || 0), 0);

    const systemInstruction = `You are "Coach Max" - the ultimate elite AI Coach specializing in:
1. Calorie tracking, macronutrient balancing, fat loss, cutting body fat to reveal sharp facial features (jawline, hollow cheeks).
2. Craniofacial Looksmaxxing (PSL and Appeal scales, mewing, posture/chin tucks, masseter chewing, debloating).
3. Height & Puberty Optimization: Protecting growth plates, GH release, avoiding severe deficits for teens.
4. Dietary debloat: Balancing sodium vs potassium, hydration.
5. Workout & Gym Training: Hypertrophy, lifting splits, form correction, muscle recovery.

USER CONTEXT:
- Age: ${context.userProfile.age} (${isPuberty ? 'PUBERTY: Crucial height growth, protect growth plates, focus on Calcium/D3/Zinc/GH, NEVER recommend extreme fasting' : 'Adult'})
- Height: ${context.userProfile.height} cm, Weight: ${context.userProfile.weight} kg
- Current Body Fat: ${context.userProfile.currentBodyFat}%, Target: ${context.userProfile.targetBodyFat}%
- Aesthetic Style: ${isAsian ? 'Asian Pretty Boy & Appeal (refined harmony, glowing skin, clear eye appeal, soft angularity, debloat)' : 'Western PSL & Dimorphism (forward maxilla, strong gonial angle, hollow cheeks, brow ridge)'}
- Goals: ${(context.userProfile.physiqueGoals || []).join(', ')}
- Calories consumed today: ${totalCaloriesToday} / ${context.currentPlan?.calorieTarget || context.userProfile.dailyCalorieTarget} kcal
- Debloat Target: Sodium < ${context.currentPlan?.sodiumTarget || 1600}mg, Potassium > ${context.currentPlan?.potassiumTarget || 3800}mg
- Active Plan: ${context.currentPlan?.planName || 'Chưa kích hoạt'}
- Active Daily Meal Plan: ${context.dailyMealPlan ? `${context.dailyMealPlan.meals.map(m => `[${m.mealType}: ${m.name} (~${m.calories}kcal, ~${(m.estimatedCostVnd || 25000).toLocaleString('vi-VN')}đ)]`).join(', ')} (Tổng: ${context.dailyMealPlan.totalCalories} kcal, Ngân sách: ${(context.dailyMealPlan.totalEstimatedCostVnd || 85000).toLocaleString('vi-VN')}đ)` : 'Chưa có thực đơn hôm nay'}
- User Food Budget: ${context.userProfile.foodBudgetPerDayVnd && context.userProfile.foodBudgetPerDayVnd > 0 ? `${context.userProfile.foodBudgetPerDayVnd.toLocaleString('vi-VN')} VNĐ/ngày` : 'Tiết kiệm, bình dân hợp lý'}
${context.latestLooksmax ? `- Looksmax Evaluation: PSL ${context.latestLooksmax.pslScore} (${context.latestLooksmax.pslTier}), Appeal ${context.latestLooksmax.appealScore} (${context.latestLooksmax.appealTier})` : ''}

TONE & BEHAVIOR:
- Empowering, scientific, practical, direct, motivating gym/looksmaxxing coach in natural Vietnamese.
- Answer user questions regarding what they ate, what to eat, workout routines, gym splits, posture, Mewing, Debloat.
- If the user uploaded an image: analyze the image (food plate, physique check, gym posture, or progress) with high precision.

CRITICAL FEATURE - MEAL DETECTION, TRACKER LOGGING & DAILY MEAL PLAN INTEGRATION:
When the user mentions food they ate, OR asks you what to eat, OR asks you to change/swap a meal, OR asks you to design a menu/thực đơn (with or without budget):
1. Provide your charismatic coaching commentary, advice, and tips in Vietnamese.
2. At the very end of your response, output a structured JSON block inside triple backticks with tag \`\`\`json:meal_tracker:
\`\`\`json:meal_tracker
{
  "detectedMeals": [
    {
      "name": "Tên món ăn cụ thể",
      "mealType": "breakfast",
      "calories": 550,
      "servingSize": "1 đĩa vừa",
      "estimatedCostVnd": 25000,
      "nutrients": {
        "protein": 35,
        "carbs": 60,
        "fat": 15,
        "sodium": 650,
        "potassium": 850
      },
      "aiNotes": "Nhận xét ngắn về dinh dưỡng, debloat và tăng cơ",
      "prepTimeMinutes": 15,
      "ingredients": ["150g ức gà", "rau cải", "cơm trắng"]
    }
  ],
  "suggestedMealPlan": null
}
\`\`\`
Note: If user asks for an entire daily menu (4 meals), you can provide "suggestedMealPlan" matching DailyMealPlan structure with 4 meals ("meals": [breakfast, lunch, dinner, snack]) and "totalEstimatedCostVnd".
If NO meals or foods were eaten, mentioned, or asked, DO NOT output the \`\`\`json:meal_tracker block.`;

    const contents: any[] = [];
    contents.push({
      role: 'user',
      parts: [{ text: systemInstruction }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Chào bạn! Tôi là Coach Max, huấn luyện viên thể hình, dinh dưỡng và Looksmaxxing cá nhân của bạn. Tôi đã nắm rõ hồ sơ thể trạng và mục tiêu của bạn. Bạn muốn tôi tư vấn hoặc giải đáp gì hôm nay?' }]
    });

    // Add recent turns (last 8)
    const recentHistory = conversationHistory.slice(-8);
    for (const turn of recentHistory) {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.text }]
      });
    }

    // Add current user prompt (multimodal if imageBase64 present)
    const userParts: any[] = [];
    const imagesToAttach: string[] = [];
    if (Array.isArray(imageBase64)) {
      imagesToAttach.push(...imageBase64.filter(Boolean));
    } else if (typeof imageBase64 === 'string' && imageBase64) {
      imagesToAttach.push(imageBase64);
    }

    imagesToAttach.forEach((img, idx) => {
      const mimeType = img.startsWith('data:image/png')
        ? 'image/png'
        : img.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';
      const cleanBase64 = img.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '');
      userParts.push({
        inlineData: {
          mimeType,
          data: cleanBase64
        }
      });
      if (imagesToAttach.length > 1) {
        userParts.push({ text: `[Ảnh #${idx + 1}/${imagesToAttach.length}]` });
      }
    });

    userParts.push({
      text: userMessage || 'Phân tích hình ảnh này cho tôi và tư vấn dinh dưỡng / bài tập / calo phù hợp nhé coach!'
    });

    contents.push({
      role: 'user',
      parts: userParts
    });

    const data = await callGeminiApi(apiKey, {
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1200
      }
    });

    const rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let detectedMeals: DetectedMealItem[] | undefined;
    let suggestedMealPlan: DailyMealPlan | undefined;
    let cleanText = rawOutput;

    const mealMatch = rawOutput.match(/```json:meal_tracker\s*([\s\S]*?)\s*```/);
    if (mealMatch) {
      try {
        const parsed = JSON.parse(mealMatch[1]);
        if (parsed.detectedMeals && Array.isArray(parsed.detectedMeals)) {
          detectedMeals = parsed.detectedMeals;
        }
        if (parsed.suggestedMealPlan && parsed.suggestedMealPlan.meals && Array.isArray(parsed.suggestedMealPlan.meals)) {
          const todayStr = new Date().toISOString().slice(0, 10);
          suggestedMealPlan = {
            id: 'plan_coach_' + Date.now(),
            date: todayStr,
            dietType: parsed.suggestedMealPlan.dietType || 'vietnamese_home',
            targetCalories: parsed.suggestedMealPlan.targetCalories || context.userProfile.dailyCalorieTarget,
            totalCalories: parsed.suggestedMealPlan.totalCalories || 1800,
            totalProtein: parsed.suggestedMealPlan.totalProtein || 130,
            totalCarbs: parsed.suggestedMealPlan.totalCarbs || 180,
            totalFat: parsed.suggestedMealPlan.totalFat || 50,
            totalSodium: parsed.suggestedMealPlan.totalSodium || 1600,
            totalPotassium: parsed.suggestedMealPlan.totalPotassium || 3600,
            debloatScore: parsed.suggestedMealPlan.debloatScore || 'Xuất sắc',
            debloatRatio: parsed.suggestedMealPlan.debloatRatio || 2.2,
            totalEstimatedCostVnd: parsed.suggestedMealPlan.totalEstimatedCostVnd || 80000,
            aiChefAdvice: parsed.suggestedMealPlan.aiChefAdvice || 'Thực đơn tối ưu calo và kinh phí từ Coach Max.',
            meals: parsed.suggestedMealPlan.meals.map((m: any, idx: number) => ({
              ...m,
              id: m.id || `coach_meal_${idx}_${Date.now()}`,
              logged: false
            })),
            groceryList: parsed.suggestedMealPlan.groceryList || []
          };
        }
      } catch (e) {
        console.warn('Could not parse detectedMeals/suggestedMealPlan JSON from Coach:', e);
      }
      cleanText = rawOutput.replace(/```json:meal_tracker\s*[\s\S]*?\s*```/, '').trim();
    }

    return {
      text: cleanText || 'Coach chưa nhận được phản hồi, bạn thử hỏi lại nhé!',
      detectedMeals,
      suggestedMealPlan
    };
  },

  // Gemini Studio-Grade Neural Text-To-Speech (gemini-3.8-flash-tts / gemini-3.8-flash-lite-tts)
  generateSpeechWithGemini: async (text: string, voiceName: string = 'Puck'): Promise<string | null> => {
    const apiKey = storageService.getApiKey();
    if (!apiKey) return null;

    try {
      const cleanText = text.replace(/[*#_`~>]/g, '').trim().slice(0, 350);
      const modelsToTry = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];

      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{
                  text: cleanText,
                  speech_metadata: {
                    style: 'energetic, supportive, confident and friendly fitness coach'
                  }
                }]
              }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voiceName
                    }
                  }
                }
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const audioBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioBase64) return audioBase64;
          } else {
            console.warn(`TTS attempt with ${model} returned status ${response.status}`);
          }
        } catch (mErr) {
          console.warn(`TTS fetch error with ${model}:`, mErr);
        }
      }
      return null;
    } catch (err) {
      console.warn('Gemini neural TTS error:', err);
      return null;
    }
  },

  // AI Daily Meal Planner (Automatic Menu Generator with Debloat & Aesthetics optimization)
  generateDailyMealPlan: async (
    userProfile: UserProfile,
    currentPlan: SmartPlan | null,
    dietType: DietType = 'vietnamese_home',
    dailyBudgetVnd?: number
  ): Promise<DailyMealPlan> => {
    const apiKey = storageService.getApiKey();
    if (!apiKey) {
      throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập API Key để tạo thực đơn!');
    }

    const targetCal = currentPlan?.calorieTarget || userProfile.dailyCalorieTarget;
    const targetProt = currentPlan?.proteinTarget || Math.round(userProfile.weight * 2);
    const targetCarb = currentPlan?.carbTarget || Math.round((targetCal * 0.45) / 4);
    const targetFat = currentPlan?.fatTarget || Math.round((targetCal * 0.25) / 9);

    const dietDescriptions: Record<DietType, string> = {
      vietnamese_home: 'Mâm cơm gia đình Việt Nam bình dân, thơm ngon, dễ nấu từ nguyên liệu chợ truyền thống (thịt nạc, cá đồng/biển, trứng, đậu phụ, rau xanh theo mùa, khoai lang, cơm trắng/gạo lứt vừa phải).',
      eat_clean: 'Eat Clean & Fitness chuẩn GYM (ức gà áp chảo, cá hồi, thịt bò, yến mạch, rau củ hấp, dầu oliu, quả bơ, các loại hạt).',
      budget_student: 'Tiết kiệm sinh viên (<45.000đ/bữa) nhưng cực giàu protein và no lâu (trứng gà, đậu phụ rim, ức gà đông lạnh, rau muống, chuối, lạc rang).',
      quick_prep: 'Nhanh gọn tiện lợi (<15 phút chuẩn bị) cho người bận rộn (bánh mì nguyên cám, ức gà xé sẵn, sinh tố yến mạch whey/sữa hạt, salad trộn).',
      high_protein_veg: 'Món chay giàu đạm (đậu phụ non, nấm đùi gà, đậu nành Edamame, đậu lăng, các loại hạt dinh dưỡng, sữa đậu nành không đường).'
    };

    const budgetPrompt = dailyBudgetVnd && dailyBudgetVnd > 0
      ? `- Ngân sách ăn uống mục tiêu: ~${dailyBudgetVnd.toLocaleString('vi-VN')} VNĐ/ngày. Hãy chọn nguyên liệu tươi ngon nhưng kinh tế (như trứng gà, ức gà, cá đồng, đậu phụ, rau muống, rau ngót, chuối, khoai) sao cho "totalEstimatedCostVnd" không vượt quá ngân sách này.`
      : '- Ngân sách: Bình dân, kinh tế, hợp lý với giá chợ/siêu thị Việt Nam.';

    const prompt = `You are a certified executive sports nutritionist and chef specializing in Vietnamese physique and aesthetic looksmaxxing nutrition.
Create a complete, delicious 1-day meal plan tailored to this user:
- Goal: Body Fat ${userProfile.targetBodyFat}%, Aesthetic: ${userProfile.aestheticStyle === 'asian_pretty_boy' ? 'Asian Pretty Boy (Sharp V-line jaw, clean skin, de-bloat priority)' : 'Western PSL & Muscle Density'}
- Target Daily Calories: ${targetCal} kcal (Tolerance +/- 5%)
- Target Protein: ${targetProt}g
- Target Carbs: ${targetCarb}g
- Target Fat: ${targetFat}g
- Dietary Style: ${dietDescriptions[dietType]}
${budgetPrompt}

CRITICAL AESTHETIC & DEBLOAT RULES:
1. Maximize Potassium (Target > 3,000mg/day) from natural sources (spinach, sweet potato, banana, mushrooms, avocado) to flush facial sodium retention.
2. Moderate Sodium (< 1,800mg/day) to eliminate face puffiness and morning water retention.
3. Include 4 structured meals: Breakfast (Bữa sáng), Lunch (Bữa trưa), Dinner (Bữa tối), and Snack (Bữa phụ).
4. For each meal provide: realistic Vietnamese meal name, portion in grams or bowls/pieces, calories, protein, carbs, fat, sodium, potassium, prep time in minutes, estimated cost in VND ("estimatedCostVnd": number, e.g. 20000), key ingredients, and 2-3 quick cooking steps.
5. Create a smart consolidated Grocery List grouped into 4 categories: 'Thịt, Cá & Trứng (Protein)', 'Rau, Củ & Trái Cây (Kali & Vi chất)', 'Tinh Bột & Các Loại Hạt', 'Gia Vị & Khác'. Each grocery item should have estimatedCostVnd.

Return ONLY valid JSON matching this exact structure:
{
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalSodium": number,
  "totalPotassium": number,
  "totalEstimatedCostVnd": number,
  "debloatScore": "Xuất sắc",
  "debloatRatio": 2.2,
  "aiChefAdvice": string (1-2 sentences of encouraging aesthetic cooking tips in Vietnamese),
  "meals": [
    {
      "id": "meal_1",
      "name": string,
      "mealType": "breakfast",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "sodium": number,
      "potassium": number,
      "estimatedCostVnd": number,
      "servingSize": string,
      "description": string,
      "prepTimeMinutes": number,
      "ingredients": ["string"],
      "recipeQuickSteps": ["string"]
    }
  ],
  "groceryList": [
    {
      "category": string,
      "items": [
        { "name": string, "amount": string, "checked": false, "estimatedCostVnd": number }
      ]
    }
  ]
}
All names, descriptions, and instructions must be in natural, mouth-watering Vietnamese. Return ONLY raw JSON without markdown.`;

    const data = await callGeminiApi(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error('Không nhận được thực đơn từ Gemini AI');

    const parsed = JSON.parse(textOutput);
    const todayStr = new Date().toISOString().slice(0, 10);

    return {
      id: 'plan_' + Date.now(),
      date: todayStr,
      dietType,
      targetCalories: targetCal,
      dailyBudgetVnd: dailyBudgetVnd,
      ...parsed,
      meals: (parsed.meals || []).map((m: any, idx: number) => ({
        ...m,
        id: m.id || `meal_${Date.now()}_${idx}`,
        estimatedCostVnd: m.estimatedCostVnd || 25000,
        logged: false
      }))
    };
  },

  // Swap / Reroll a single meal while preserving total macro balance
  swapSingleMeal: async (
    userProfile: UserProfile,
    currentPlan: SmartPlan | null,
    mealToReplace: PlannedMeal,
    dietType: DietType = 'vietnamese_home',
    budgetVnd?: number
  ): Promise<PlannedMeal> => {
    const apiKey = storageService.getApiKey();
    if (!apiKey) {
      throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập API Key để đổi món!');
    }

    const prompt = `You are an expert fitness chef.
Recommend ONE alternative meal to replace this meal:
- Meal Type: ${mealToReplace.mealType}
- Current Meal: "${mealToReplace.name}"
- Target Calories to match: ~${mealToReplace.calories} kcal (+/- 10%)
- Target Protein: ~${mealToReplace.protein}g
- Target Carbs: ~${mealToReplace.carbs}g
- Target Fat: ~${mealToReplace.fat}g
- Target Budget: ${budgetVnd ? `~${budgetVnd.toLocaleString('vi-VN')} VNĐ` : 'Tiết kiệm, bình dân'}
- Diet Style: ${dietType}
- Aesthetic requirement: High potassium, low sodium to avoid facial water retention.

Return ONLY raw JSON with:
{
  "name": string (creative Vietnamese meal name),
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "sodium": number,
  "potassium": number,
  "estimatedCostVnd": number,
  "servingSize": string,
  "description": string,
  "prepTimeMinutes": number,
  "ingredients": ["string"],
  "recipeQuickSteps": ["string"]
}
No markdown, return strictly raw JSON.`;

    const data = await callGeminiApi(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json'
      }
    });

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error('Không nhận được món ăn thay thế từ Gemini AI');

    const parsed = JSON.parse(textOutput);
    return {
      ...parsed,
      id: 'meal_swapped_' + Date.now(),
      mealType: mealToReplace.mealType,
      estimatedCostVnd: parsed.estimatedCostVnd || 25000,
      logged: false
    };
  }
};
