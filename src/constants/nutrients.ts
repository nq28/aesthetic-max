import { NutrientDefinition } from '../types';

export const STANDARD_NUTRIENTS: NutrientDefinition[] = [
  // Macros
  {
    id: 'protein',
    name: 'Protein (Đạm)',
    unit: 'g',
    dailyTarget: 140,
    category: 'macro',
    isStandard: true,
    description: 'Xây dựng cơ bắp, săn chắc cơ mặt, duy trì chuyển hóa',
    color: '#38bdf8' // Cyan
  },
  {
    id: 'carbs',
    name: 'Carbohydrate (Tinh bột)',
    unit: 'g',
    dailyTarget: 220,
    category: 'macro',
    isStandard: true,
    description: 'Năng lượng cho tập luyện và hoạt động thần kinh',
    color: '#fbbf24' // Amber
  },
  {
    id: 'fat',
    name: 'Fat (Chất béo)',
    unit: 'g',
    dailyTarget: 55,
    category: 'macro',
    isStandard: true,
    description: 'Sản sinh hormone sinh dục, hấp thu vitamin tan trong dầu',
    color: '#f43f5e' // Rose
  },
  {
    id: 'fiber',
    name: 'Chất xơ (Fiber)',
    unit: 'g',
    dailyTarget: 30,
    category: 'macro',
    isStandard: true,
    description: 'Tốt cho tiêu hóa, no lâu, hỗ trợ giảm mỡ và da sạch mụn',
    color: '#34d399' // Emerald
  },
  {
    id: 'sugar',
    name: 'Đường (Sugar)',
    unit: 'g',
    dailyTarget: 25,
    category: 'macro',
    isStandard: true,
    description: 'Hạn chế dưới 25g/ngày để chống glycation da (ngừa mụn, già trước tuổi)',
    color: '#ec4899' // Pink
  },

  // Debloat & Electrolytes
  {
    id: 'sodium',
    name: 'Muối / Natri (Sodium)',
    unit: 'mg',
    dailyTarget: 1800,
    category: 'debloat',
    isStandard: true,
    description: 'Hạn chế muối để mặt không bị tích nước, sưng húp (Debloat)',
    color: '#f87171' // Light red
  },
  {
    id: 'potassium',
    name: 'Kali (Potassium)',
    unit: 'mg',
    dailyTarget: 3800,
    category: 'debloat',
    isStandard: true,
    description: 'Cân bằng Natri, đào thải nước thừa dưới da mặt, lộ gò má & hàm',
    color: '#a78bfa' // Purple
  },

  // Height & Bone & Hormones (Các chất tăng chiều cao & phát triển khung mặt)
  {
    id: 'calcium',
    name: 'Canxi (Calcium)',
    unit: 'mg',
    dailyTarget: 1200,
    category: 'height_growth',
    isStandard: true,
    description: 'Tăng mật độ xương, hỗ trợ chiều cao và sự vững chắc xương hàm',
    color: '#60a5fa' // Sky blue
  },
  {
    id: 'vitamin_d3',
    name: 'Vitamin D3',
    unit: 'IU',
    dailyTarget: 2000,
    category: 'height_growth',
    isStandard: true,
    description: 'Hấp thu Canxi vào xương, tối ưu hormone sinh trưởng (GH)',
    color: '#facc15' // Yellow
  },
  {
    id: 'zinc',
    name: 'Kẽm (Zinc)',
    unit: 'mg',
    dailyTarget: 15,
    category: 'height_growth',
    isStandard: true,
    description: 'Tối ưu Testosterone, tái tạo da không mụn, kích thích hormone tăng trưởng',
    color: '#4ade80' // Green
  },
  {
    id: 'magnesium',
    name: 'Magiê (Magnesium)',
    unit: 'mg',
    dailyTarget: 400,
    category: 'height_growth',
    isStandard: true,
    description: 'Thư giãn cơ, giấc ngủ sâu (tiết GH ban đêm), hỗ trợ tổng hợp protein',
    color: '#c084fc' // Violet
  },
  {
    id: 'iron',
    name: 'Sắt (Iron)',
    unit: 'mg',
    dailyTarget: 15,
    category: 'height_growth',
    isStandard: true,
    description: 'Vận chuyển oxy trong máu, chống mệt mỏi và thâm quầng mắt',
    color: '#fb7185' // Rose light
  },

  // Energy & Metabolism
  {
    id: 'caffeine',
    name: 'Cafein (Caffeine)',
    unit: 'mg',
    dailyTarget: 200,
    category: 'energy',
    isStandard: true,
    description: 'Tăng tốc chuyển hóa, tăng sinh nhiệt đốt mỡ, tỉnh táo tập luyện',
    color: '#d97706' // Dark Amber
  }
];
