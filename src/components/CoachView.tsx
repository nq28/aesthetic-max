import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { UserProfile, SmartPlan, FoodItem, CoachMessage, DetectedMealItem, DailyMealPlan } from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { 
  Send, 
  Sparkles, 
  Trash2, 
  Bot, 
  User, 
  Flame, 
  Check, 
  ArrowRight,
  PhoneCall,
  Image as ImageIcon,
  Camera,
  X,
  PlusCircle,
  Dumbbell,
  Utensils,
  Coins,
  RefreshCw,
  ChefHat
} from 'lucide-react';
import { CoachCallModal } from './CoachCallModal';
import { compressImageToThumbnail } from '../utils/imageUtils';

interface CoachViewProps {
  userProfile: UserProfile;
  currentPlan: SmartPlan | null;
  todayFoodItems: FoodItem[];
  onFoodAdded?: (item: FoodItem) => void;
  onNavigateToTab?: (tab: 'dashboard' | 'food' | 'looksmax' | 'coach' | 'plan') => void;
}

export const CoachView: React.FC<CoachViewProps> = ({
  userProfile,
  currentPlan,
  todayFoodItems,
  onFoodAdded,
  onNavigateToTab
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>(() => {
    const saved = storageService.getCoachMessages();
    if (saved.length > 0) return saved;

    // Initial greeting from Coach Max
    const isPuberty = userProfile.age < 18;
    const styleText = userProfile.aestheticStyle === 'asian_pretty_boy' ? 'Pretty Boy & Appeal Châu Á' : 'PSL Warrior & Dimorphism Âu Mỹ';

    return [
      {
        id: 'msg_welcome',
        sender: 'coach',
        timestamp: Date.now(),
        text: `Chào bạn! Tôi là **Coach Max** — Huấn luyện viên AI chuyên biệt về **Calo, Dinh dưỡng, Bài tập Gym và Looksmaxxing** của bạn.\n\nTôi đã đồng bộ toàn bộ hồ sơ của bạn:\n- **Thể trạng:** ${userProfile.age} tuổi (${isPuberty ? 'Đang dậy thì phát triển chiều cao' : 'Giai đoạn trưởng thành'}), ${userProfile.height}cm, ${userProfile.weight}kg.\n- **Mục tiêu:** Body Fat ${userProfile.targetBodyFat}%, phong cách **${styleText}**.\n- **Mục tiêu riêng:** ${(userProfile.physiqueGoals || []).join(', ')}.\n\n✨ **Bạn có thể:**\n- Kể cho tôi nghe **hôm nay bạn ăn gì** hoặc **chụp/tải ảnh bữa ăn lên** — Tôi sẽ phân tích dinh dưỡng và **tự động tạo nút [Áp dụng vào Tracker]** để lưu vào nhật ký calo chỉ bằng 1 chạm!\n- Kể về **bài tập gym/cardio hôm nay** để nhận lời khuyên phục hồi và bổ sung protein.\n- Hoặc bấm **"Gọi Coach"** để gọi điện đàm thoại trực tiếp!`
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCallOpen, setIsCallOpen] = useState<boolean>(false);
  const [justAppliedMealName, setJustAppliedMealName] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, selectedImage]);

  // Handle Image File Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh quá lớn (>10MB). Vui lòng chọn ảnh nhẹ hơn!');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send message to Coach
  const handleSendMessage = async (textToSend?: string) => {
    const msg = (textToSend || inputMessage).trim();
    if ((!msg && !selectedImage) || isLoading) return;

    const currentImage = selectedImage;

    const userMsg: CoachMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: msg || (currentImage ? '📸 [Ảnh đính kèm phân tích món ăn / thể hình]' : ''),
      imageUrl: currentImage || undefined,
      timestamp: Date.now()
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    storageService.saveCoachMessages(nextMessages);
    setInputMessage('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const latestLooksmax = storageService.getLatestLooksmax();

      // Format history for Gemini
      const history = messages.slice(-8).map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text
      }));

      const reply = await geminiService.chatWithCoach(
        history,
        msg,
        {
          userProfile,
          currentPlan,
          todayFoodItems,
          latestLooksmax,
          dailyMealPlan: storageService.getDailyMealPlan()
        },
        currentImage || undefined
      );

      const coachMsg: CoachMessage = {
        id: 'msg_' + Date.now() + '_coach',
        sender: 'coach',
        text: reply.text,
        detectedMeals: reply.detectedMeals,
        suggestedMealPlan: reply.suggestedMealPlan,
        timestamp: Date.now()
      };

      const finalMessages = [...nextMessages, coachMsg];
      setMessages(finalMessages);
      storageService.saveCoachMessages(finalMessages);
    } catch (err: any) {
      console.error(err);
      const errorMsg: CoachMessage = {
        id: 'msg_err_' + Date.now(),
        sender: 'coach',
        text: `⚠️ **Lỗi kết nối Gemini AI:** ${err.message || 'Không thể phản hồi lúc này'}. Vui lòng thử lại sau giây lát!`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply Detected Meal directly to Tracker
  const handleApplyMeal = async (messageId: string, mealIndex: number, meal: DetectedMealItem) => {
    try {
      let photoUrl: string | undefined = undefined;
      const msgIndex = messages.findIndex(m => m.id === messageId);
      if (msgIndex > 0 && messages[msgIndex - 1]?.imageUrl) {
        photoUrl = await compressImageToThumbnail(messages[msgIndex - 1].imageUrl!, 320, 320, 0.7);
      }

      const foodToSave: Omit<FoodItem, 'id' | 'timestamp'> = {
        name: meal.name,
        mealType: meal.mealType || 'lunch',
        calories: Math.round(meal.calories),
        servingSize: meal.servingSize || '1 phần',
        nutrients: meal.nutrients || {},
        aiNotes: meal.aiNotes,
        photoUrl
      };

      const saved = storageService.addFoodItem(foodToSave);
      if (onFoodAdded) {
        onFoodAdded(saved);
      }

      // Mark as applied in state & local storage
      const updated = messages.map(m => {
        if (m.id === messageId && m.detectedMeals) {
          const nextMeals = [...m.detectedMeals];
          nextMeals[mealIndex] = { ...nextMeals[mealIndex], applied: true };
          return { ...m, detectedMeals: nextMeals };
        }
        return m;
      });

      setMessages(updated);
      storageService.saveCoachMessages(updated);

      // Show temporary banner & confetti
      setJustAppliedMealName(meal.name);
      setTimeout(() => setJustAppliedMealName(null), 4000);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch {}
    } catch (err: any) {
      console.error('Lỗi lưu bữa ăn từ Coach:', err);
      alert('Không thể lưu bữa ăn: ' + (err?.message || 'Lỗi bộ nhớ'));
    }
  };

  // Apply Single Meal directly to Active Daily Meal Plan
  const handleApplyMealToDailyPlan = (messageId: string, mealIndex: number, meal: DetectedMealItem) => {
    try {
      const res = storageService.applyDetectedMealToPlan(meal);
      if (!res) {
        alert('Chưa có thực đơn hôm nay để thay thế. Vui lòng tạo thực đơn trong mục Ăn uống trước!');
        return;
      }

      // Mark appliedToPlan in messages
      const updated = messages.map(m => {
        if (m.id === messageId && m.detectedMeals) {
          const nextMeals = [...m.detectedMeals];
          nextMeals[mealIndex] = { ...nextMeals[mealIndex], appliedToPlan: true };
          return { ...m, detectedMeals: nextMeals };
        }
        return m;
      });

      setMessages(updated);
      storageService.saveCoachMessages(updated);

      const mealLabel = meal.mealType === 'breakfast' ? 'Sáng' : meal.mealType === 'lunch' ? 'Trưa' : meal.mealType === 'dinner' ? 'Tối' : 'Phụ';
      setJustAppliedMealName(`Đã thay thế bữa ${mealLabel} bằng món "${meal.name}" trong Thực Đơn Hàng Ngày!`);
      setTimeout(() => setJustAppliedMealName(null), 4500);

      try {
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.8 } });
      } catch {}
    } catch (err: any) {
      console.error('Lỗi thay thế món vào thực đơn:', err);
      alert('Không thể cập nhật thực đơn: ' + err?.message);
    }
  };

  // Apply Full Suggested Meal Plan to Active Daily Plan
  const handleApplySuggestedMealPlan = (messageId: string, plan: DailyMealPlan) => {
    try {
      storageService.saveDailyMealPlan(plan);

      // Mark suggestedPlanApplied in messages
      const updated = messages.map(m => {
        if (m.id === messageId) {
          return { ...m, suggestedPlanApplied: true };
        }
        return m;
      });

      setMessages(updated);
      storageService.saveCoachMessages(updated);

      setJustAppliedMealName(`Đã áp dụng toàn bộ thực đơn 4 bữa (~${plan.totalCalories} kcal) từ Coach Max!`);
      setTimeout(() => setJustAppliedMealName(null), 5000);

      try {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.7 } });
      } catch {}
    } catch (err: any) {
      console.error('Lỗi áp dụng thực đơn từ Coach:', err);
      alert('Không thể lưu thực đơn: ' + err?.message);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Bạn có muốn xóa toàn bộ lịch sử trò chuyện với Coach không?')) {
      storageService.clearCoachMessages();
      setMessages([
        {
          id: 'msg_reset',
          sender: 'coach',
          timestamp: Date.now(),
          text: 'Cuộc trò chuyện đã được làm mới. Tôi sẵn sàng giải đáp bất kỳ câu hỏi nào về ăn uống, siết mỡ và Looksmaxxing của bạn!'
        }
      ]);
    }
  };

  const QUICK_QUESTIONS = [
    'Lên cho tao thực đơn 4 bữa hôm nay ngân sách dưới 70k!',
    'Trưa nay tao ngán ức gà, đổi món Việt khác cùng calo/macro giùm tao!',
    'Hôm nay tao ăn 1 bát phở bò tái nạm 1 trứng chần, log vào tracker giùm tao!',
    'Gợi ý mâm cơm xả nước mặt (Debloat) giá sinh viên <50k',
    'Tối ưu chiều cao ở tuổi của tôi cần những gì?'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-175px)] sm:h-[calc(100vh-190px)] w-full relative">
      
      {/* Coach Header Bar */}
      <div className="liquid-glass-card rounded-[26px] p-3.5 sm:p-4 mb-3 flex items-center justify-between shadow-2xl backdrop-blur-2xl border border-white/12 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/25">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-950 rounded-full animate-pulse shadow-sm shadow-emerald-400/50"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white">Coach Max (AI Personal Trainer)</h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full liquid-glass-cyan text-cyan-300 font-bold border border-cyan-500/30">
                Gemini Vision & TTS
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300/80">Tư vấn ăn uống, tính calo, bài tập & áp dụng bữa ăn vào Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCallOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition shadow-lg shadow-cyan-500/25 active:scale-95"
            title="Gọi thoại trực tiếp với Coach Max"
          >
            <PhoneCall className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Gọi Coach</span>
            <span className="sm:hidden">Gọi</span>
          </button>

          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-400 liquid-glass-btn transition"
            title="Xóa lịch sử trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast Notification when Meal is Applied */}
      {justAppliedMealName && (
        <div className="mb-2 p-3 rounded-2xl liquid-glass-emerald border border-emerald-500/50 flex items-center justify-between text-xs sm:text-sm text-emerald-200 animate-liquid-message shadow-lg shrink-0">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span>Đã thêm <strong>{justAppliedMealName}</strong> vào Tracker thành công!</span>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('food')}
              className="text-cyan-300 hover:text-white underline font-bold flex items-center gap-1 ml-2 shrink-0"
            >
              Mở Tracker <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 sm:p-4 rounded-3xl pr-1.5 scroll-smooth">
        
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 sm:gap-3.5 animate-liquid-message ${
                isUser ? 'flex-row-reverse max-w-[88%] sm:max-w-[80%] ml-auto' : 'flex-row w-full max-w-full sm:max-w-[96%]'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-md ${
                  isUser
                    ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/20'
                    : 'bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950 shadow-cyan-500/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4 stroke-[2.5]" /> : <Bot className="w-5 h-5 stroke-[2.5]" />}
              </div>

              {/* Message Bubble Container */}
              <div className={isUser ? 'space-y-2' : 'flex-1 space-y-3 min-w-0'}>
                
                <div
                  className={`rounded-[24px] px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-[15px] leading-relaxed sm:leading-7 shadow-xl ${
                    isUser
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-semibold rounded-tr-md shadow-emerald-500/20 whitespace-pre-wrap'
                      : 'liquid-glass-card rounded-tl-md border border-white/12 text-slate-100 backdrop-blur-2xl'
                  }`}
                >
                  {/* Attached Image Preview if Sent by User */}
                  {m.imageUrl && (
                    <div className="mb-3 overflow-hidden rounded-2xl border border-white/20 shadow-md">
                      <img
                        src={m.imageUrl}
                        alt="Đính kèm"
                        className="max-h-60 sm:max-h-80 w-auto object-cover rounded-2xl"
                      />
                    </div>
                  )}

                  {isUser ? (
                    m.text
                  ) : (
                    <div className="coach-markdown space-y-2.5">
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => (
                            <h1 className="text-base sm:text-lg font-black text-white mt-3.5 mb-2 border-b border-white/10 pb-1.5 flex items-center gap-2" {...props} />
                          ),
                          h2: ({node, ...props}) => (
                            <h2 className="text-sm sm:text-base font-extrabold text-cyan-300 mt-3 mb-1.5 flex items-center gap-1.5" {...props} />
                          ),
                          h3: ({node, ...props}) => (
                            <h3 className="text-xs sm:text-sm font-bold text-emerald-300 mt-2.5 mb-1" {...props} />
                          ),
                          p: ({node, ...props}) => (
                            <p className="leading-relaxed sm:leading-7 text-slate-200 my-1.5 text-sm sm:text-[15px]" {...props} />
                          ),
                          ul: ({node, ...props}) => (
                            <ul className="space-y-2 my-2 ml-5 list-disc text-slate-200 text-sm sm:text-[15px]" {...props} />
                          ),
                          ol: ({node, ...props}) => (
                            <ol className="space-y-2 my-2 ml-5 list-decimal text-slate-200 text-sm sm:text-[15px]" {...props} />
                          ),
                          li: ({node, ...props}) => (
                            <li className="leading-relaxed sm:leading-7 pl-0.5" {...props} />
                          ),
                          strong: ({node, ...props}) => (
                            <strong className="font-extrabold text-white bg-white/10 px-1.5 py-0.5 rounded-md border border-white/10" {...props} />
                          ),
                          em: ({node, ...props}) => (
                            <em className="italic text-cyan-200 font-normal" {...props} />
                          ),
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-3 border-emerald-400 pl-3.5 my-2.5 text-slate-300 italic bg-white/[0.03] py-2 rounded-r-xl text-xs sm:text-sm" {...props} />
                          ),
                          code: ({node, ...props}) => (
                            <code className="bg-slate-950 px-2 py-0.5 rounded-md font-mono text-xs text-cyan-300 border border-slate-800" {...props} />
                          )
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Detected Meals from Conversation / Image -> Apply to Tracker */}
                {/* Full Suggested Meal Plan from Coach Max */}
                {!isUser && m.suggestedMealPlan && (
                  <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border-2 border-emerald-500/50 rounded-2xl p-4 space-y-3 shadow-2xl animate-fade-in">
                    <div className="flex justify-between items-start gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          <ChefHat className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                            THỰC ĐƠN COACH MAX ĐỀ XUẤT CHO BẠN
                          </div>
                          <div className="text-xs font-bold text-white flex items-center gap-2 mt-0.5">
                            <span>4 bữa (~{m.suggestedMealPlan.totalCalories} kcal)</span>
                            <span className="text-amber-400 font-semibold">• ~{(m.suggestedMealPlan.totalEstimatedCostVnd || 80000).toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                        K:Na {m.suggestedMealPlan.debloatRatio}:1
                      </span>
                    </div>

                    {/* Meals preview list */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {m.suggestedMealPlan.meals.map((sMeal) => (
                        <div key={sMeal.id} className="liquid-glass p-2.5 rounded-xl border border-white/10">
                          <div className="text-[10px] text-slate-300 uppercase font-black">
                            {sMeal.mealType === 'breakfast' ? 'Sáng' : sMeal.mealType === 'lunch' ? 'Trưa' : sMeal.mealType === 'dinner' ? 'Tối' : 'Phụ'} • <span className="text-emerald-300">{sMeal.calories} kcal</span>
                          </div>
                          <div className="font-bold text-white truncate text-xs mt-1">{sMeal.name}</div>
                          <div className="text-[10px] text-amber-300 font-mono mt-0.5">~{(sMeal.estimatedCostVnd || 20000).toLocaleString('vi-VN')} đ</div>
                        </div>
                      ))}
                    </div>

                    {/* Apply Full Plan Button */}
                    <div className="pt-1">
                      {m.suggestedPlanApplied ? (
                        <div className="w-full flex items-center justify-between p-2 bg-emerald-950/50 rounded-xl border border-emerald-500/40 text-xs text-emerald-400 font-bold">
                          <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Đã áp dụng vào Thực Đơn Hàng Ngày!</span>
                          {onNavigateToTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateToTab('food')}
                              className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 font-bold underline"
                            >
                              Xem thực đơn
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplySuggestedMealPlan(m.id, m.suggestedMealPlan!)}
                          className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
                        >
                          <Utensils className="w-4 h-4 stroke-[2.5]" />
                          <span>⚡ ÁP DỤNG TOÀN BỘ VÀO THỰC ĐƠN HÔM NAY</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Detected / Recommended Meals from Conversation / Image */}
                {!isUser && m.detectedMeals && m.detectedMeals.length > 0 && (
                  <div className="space-y-2 pt-1 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 px-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>MÓN ĂN ĐỀ XUẤT (ÁP DỤNG VÀO THỰC ĐƠN HOẶC TRACKER):</span>
                    </div>

                    {m.detectedMeals.map((meal, idx) => {
                      const isApplied = meal.applied;
                      const isAppliedToPlan = meal.appliedToPlan;
                      const mealLabel = meal.mealType === 'breakfast' ? 'Sáng' : meal.mealType === 'lunch' ? 'Trưa' : meal.mealType === 'dinner' ? 'Tối' : 'Phụ';

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition shadow-xl ${
                            isApplied || isAppliedToPlan
                              ? 'bg-emerald-950/40 border-emerald-500/50'
                              : 'bg-slate-900/95 border-emerald-500/30 hover:border-emerald-500/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                                🍱
                              </div>
                              <div>
                                <h4 className="font-extrabold text-white text-xs sm:text-sm">
                                  {meal.name}
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span className="uppercase font-semibold text-emerald-400">Bữa {mealLabel}</span>
                                  {meal.servingSize && <span>• {meal.servingSize}</span>}
                                  <span className="text-amber-400 font-semibold">• ~{(meal.estimatedCostVnd || 25000).toLocaleString('vi-VN')} đ</span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className="px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 font-black text-xs">
                                🔥 {meal.calories} kcal
                              </span>
                            </div>
                          </div>

                          {/* Quick Macros Chips */}
                          <div className="grid grid-cols-4 gap-1.5 my-2 text-[10px] sm:text-[11px] font-medium text-center">
                            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[9px]">Protein</span>
                              <span className="text-emerald-400 font-bold">{meal.nutrients?.protein || 0}g</span>
                            </div>
                            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[9px]">Carbs</span>
                              <span className="text-cyan-400 font-bold">{meal.nutrients?.carbs || 0}g</span>
                            </div>
                            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[9px]">Fat</span>
                              <span className="text-amber-400 font-bold">{meal.nutrients?.fat || 0}g</span>
                            </div>
                            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[9px]">Natri</span>
                              <span className="text-rose-400 font-bold">{meal.nutrients?.sodium || 0}mg</span>
                            </div>
                          </div>

                          {meal.aiNotes && (
                            <p className="text-[11px] text-slate-300 italic bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 mb-2.5">
                              💡 {meal.aiNotes}
                            </p>
                          )}

                          {/* Dual Action Buttons: Apply to Tracker OR Apply to Daily Meal Plan */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {/* Button A: Apply to Tracker */}
                            {isApplied ? (
                              <div className="p-2 bg-emerald-950/50 rounded-xl border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5" /> Đã lưu vào Tracker
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApplyMeal(m.id, idx, meal)}
                                className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Lưu vào Nhật Ký Calo</span>
                              </button>
                            )}

                            {/* Button B: Apply to Daily Meal Plan */}
                            {isAppliedToPlan ? (
                              <div className="p-2 bg-emerald-950/50 rounded-xl border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5" /> Đã đổi vào Thực Đơn
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApplyMealToDailyPlan(m.id, idx, meal)}
                                className="py-2 px-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
                              >
                                <Utensils className="w-3.5 h-3.5" />
                                <span>Thay Bữa {mealLabel} Thực Đơn</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Loading Thinking Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 rounded-tl-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Coach Max đang phân tích món ăn & dữ liệu...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Thumbnail Preview before sending */}
      {selectedImage && (
        <div className="mb-2 p-2 bg-slate-900/90 border border-cyan-500/40 rounded-2xl flex items-center justify-between shrink-0 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <img
              src={selectedImage}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-xl border border-slate-700"
            />
            <div>
              <span className="text-xs font-bold text-white block">Ảnh sẵn sàng gửi</span>
              <span className="text-[11px] text-cyan-400">Coach sẽ phân tích món ăn / vóc dáng qua ảnh</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition"
            title="Hủy ảnh"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Suggestion Pills */}
      <div className="py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="text-xs whitespace-nowrap px-4 py-2 liquid-glass hover:bg-white/[0.08] text-slate-200 hover:text-emerald-300 border border-white/10 rounded-2xl transition shrink-0 font-medium active:scale-95 shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Input Form Bar with Photo Upload & Roomy Auto-Expanding Textarea */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="liquid-glass-dock rounded-[28px] p-2 sm:p-2.5 flex items-end gap-2 sm:gap-2.5 border border-white/15 shadow-2xl shrink-0"
      >
        {/* Hidden File Input for Camera/Gallery */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        {/* Photo Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`p-3 rounded-2xl border transition shrink-0 flex items-center justify-center ${
            selectedImage
              ? 'liquid-glass-cyan text-cyan-300 border-cyan-400/50 shadow-md shadow-cyan-500/20'
              : 'liquid-glass-btn text-slate-300 hover:text-white'
          }`}
          title="Chụp hoặc tải ảnh món ăn / thể hình"
        >
          <Camera className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Multi-line Auto-Expanding Textarea */}
        <textarea
          rows={1}
          placeholder="Nhập món ăn, bài tập hoặc hỏi Coach Max... (Nhấn Enter để gửi)"
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading}
          className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-white placeholder:text-slate-400 focus:outline-none resize-none max-h-32 font-medium leading-relaxed"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
          className="p-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none text-slate-950 font-black rounded-2xl transition shadow-xl shadow-emerald-500/25 shrink-0 active:scale-95"
          title="Gửi tin nhắn"
        >
          <Send className="w-5 h-5 stroke-[2.5]" />
        </button>
      </form>

      {/* Voice Call Modal */}
      <CoachCallModal
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        userProfile={userProfile}
        currentPlan={currentPlan}
        todayFoodItems={todayFoodItems}
        onMessagesUpdated={(newMsgs) => setMessages(newMsgs)}
      />

    </div>
  );
};
