import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, SmartPlan, FoodItem, CoachMessage } from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Bot, 
  User, 
  Sparkles, 
  MessageSquare,
  Activity,
  Send,
  X
} from 'lucide-react';

interface CoachCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  currentPlan: SmartPlan | null;
  todayFoodItems: FoodItem[];
  onMessagesUpdated?: (messages: CoachMessage[]) => void;
}

export const CoachCallModal: React.FC<CoachCallModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  currentPlan,
  todayFoodItems,
  onMessagesUpdated
}) => {
  const [duration, setDuration] = useState<number>(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted'>('connecting');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [coachResponse, setCoachResponse] = useState<string>('Chào bạn! Coach Max đang nghe máy đây. Hôm nay tiến độ ăn uống và tập luyện của bạn thế nào rồi?');
  const [history, setHistory] = useState<{ sender: 'user' | 'coach'; text: string }[]>([]);
  const [manualText, setManualText] = useState<string>('');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [voiceMode, setVoiceMode] = useState<'gemini_puck' | 'gemini_fenrir' | 'gemini_aoede' | 'subtitles_only'>('gemini_puck');

  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isCallActiveRef = useRef<boolean>(false);

  // Format call duration MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Complete teardown of all voice recognition, speech synthesis, and timers
  const stopAllAudioAndRecognition = () => {
    isCallActiveRef.current = false;
    isSpeakingRef.current = false;

    // 1. Clear any pending silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // 2. Stop HTML5 audio immediately
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = '';
      } catch {}
      currentAudioRef.current = null;
    }

    // 3. Cancel browser speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    // 4. Force abort SpeechRecognition, wipe callbacks so 'onend' cannot restart it
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.onstart = null;
        rec.abort();
      } catch {}
    }
  };

  // Studio-grade AI Voice via Gemini 3.8 Flash TTS + Silent Subtitle Mode
  const speakText = async (text: string) => {
    if (!isCallActiveRef.current || isSpeakerMuted || voiceMode === 'subtitles_only') {
      if (isCallActiveRef.current) {
        setCallStatus(isMicMuted ? 'muted' : 'listening');
      }
      return;
    }

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      } catch {}
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    const cleanText = text
      .replace(/[*#_`~>]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Map voice selection to Gemini voice name
    const geminiVoice = voiceMode === 'gemini_fenrir' ? 'Fenrir' : voiceMode === 'gemini_aoede' ? 'Aoede' : 'Puck';

    try {
      const audioBase64 = await geminiService.generateSpeechWithGemini(cleanText, geminiVoice);
      if (!isCallActiveRef.current) return;

      if (audioBase64) {
        const audio = new Audio('data:audio/wav;base64,' + audioBase64);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          if (!isCallActiveRef.current) {
            audio.pause();
            return;
          }
          isSpeakingRef.current = true;
          setCallStatus('speaking');
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
          }
        };

        audio.onended = () => {
          isSpeakingRef.current = false;
          if (!isCallActiveRef.current) return;
          setCallStatus(isMicMuted ? 'muted' : 'listening');
          if (!isMicMuted && recognitionRef.current && isCallActiveRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        };

        audio.onerror = () => {
          isSpeakingRef.current = false;
          if (!isCallActiveRef.current) return;
          setCallStatus(isMicMuted ? 'muted' : 'listening');
        };

        if (isCallActiveRef.current) {
          await audio.play();
        }
        return;
      }
    } catch {
      // Audio generation failed
    }

    if (!isCallActiveRef.current) return;

    // Smooth subtitle display
    isSpeakingRef.current = true;
    setCallStatus('speaking');
    const readingTime = Math.min(Math.max(cleanText.length * 35, 1200), 4500);
    setTimeout(() => {
      if (!isCallActiveRef.current) return;
      isSpeakingRef.current = false;
      setCallStatus(isMicMuted ? 'muted' : 'listening');
      if (!isMicMuted && recognitionRef.current && isCallActiveRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    }, readingTime);
  };

  // Send question to Gemini AI
  const handleProcessSpeech = async (speechText: string) => {
    if (!isCallActiveRef.current) return;
    const cleaned = speechText.trim();
    if (!cleaned) return;

    setCallStatus('thinking');
    setUserTranscript('');

    const newHistory = [...history, { sender: 'user' as const, text: cleaned }];
    setHistory(newHistory);

    try {
      // Format conversation history for Gemini
      const latestLooksmax = storageService.getLatestLooksmax();
      const geminiHistory = newHistory.slice(-8).map(h => ({
        role: h.sender === 'user' ? ('user' as const) : ('model' as const),
        text: h.text
      }));

      // Call Gemini Coach with voice prompt
      const promptForVoice = `${cleaned}\n(LƯU Ý: Đây là cuộc gọi đàm thoại giọng nói trực tiếp qua điện thoại. Hãy trả lời thật cô đọng, tự nhiên, xưng hô thân thiện như một huấn luyện viên cá nhân đang nói chuyện qua loa, tối đa 2 đến 3 câu súc tích để người nghe dễ tiếp thu).`;

      const result = await geminiService.chatWithCoach(
        geminiHistory,
        promptForVoice,
        {
          userProfile,
          currentPlan,
          todayFoodItems,
          latestLooksmax
        }
      );

      // If user hung up while Gemini was processing, discard immediately
      if (!isCallActiveRef.current) return;

      const responseText = result.text;
      setCoachResponse(responseText);
      const updatedHistory = [...newHistory, { sender: 'coach' as const, text: responseText }];
      setHistory(updatedHistory);

      // Speak aloud only if call is active
      if (isCallActiveRef.current) {
        speakText(responseText);
      }

      // Persist to storage
      const savedMessages = storageService.getCoachMessages();
      const newItems: CoachMessage[] = [
        { id: 'call_u_' + Date.now(), sender: 'user', text: `📞 [Cuộc gọi thoại]: ${cleaned}`, timestamp: Date.now() },
        { 
          id: 'call_c_' + Date.now(), 
          sender: 'coach', 
          text: responseText, 
          timestamp: Date.now() + 1,
          detectedMeals: result.detectedMeals 
        }
      ];
      const allUpdated = [...savedMessages, ...newItems];
      storageService.saveCoachMessages(allUpdated);
      if (onMessagesUpdated) {
        onMessagesUpdated(allUpdated);
      }
    } catch (err: any) {
      if (!isCallActiveRef.current) return;
      console.error(err);
      const errMsg = 'Tín hiệu vừa bị gián đoạn một chút. Bạn có thể nói lại câu vừa rồi được không?';
      setCoachResponse(errMsg);
      speakText(errMsg);
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      stopAllAudioAndRecognition();
      return;
    }

    isCallActiveRef.current = true;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setCallStatus('listening');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      if (!isCallActiveRef.current || isSpeakingRef.current) return;

      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }

      setUserTranscript(currentTranscript);

      // Clear previous silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // If user pauses speaking for 1.8 seconds, treat as complete sentence and send
      silenceTimerRef.current = setTimeout(() => {
        if (isCallActiveRef.current && currentTranscript.trim() && !isSpeakingRef.current) {
          handleProcessSpeech(currentTranscript);
        }
      }, 1800);
    };

    recognition.onerror = (e: any) => {
      if (!isCallActiveRef.current) return;
      if (e.error !== 'no-speech') {
        console.warn('Speech recognition error:', e.error);
      }
      if (e.error === 'not-allowed') {
        setSpeechSupported(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart ONLY if call is still active and not speaking or muted
      if (isCallActiveRef.current && !isSpeakingRef.current && !isMicMuted && recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignored
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setCallStatus('listening');
    } catch {
      // Ignored
    }

    // Greet user on call start
    const timer = setTimeout(() => {
      if (isCallActiveRef.current) {
        speakText('Chào bạn! Coach Max đang nghe máy đây. Hôm nay ăn uống và tập luyện của bạn thế nào rồi?');
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      stopAllAudioAndRecognition();
    };
  }, [isOpen]);

  // Timer interval for call duration
  useEffect(() => {
    if (!isOpen) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Clean-up on unmount / close
  const handleEndCall = () => {
    stopAllAudioAndRecognition();
    onClose();
  };

  // Toggle mic
  const handleToggleMic = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      setCallStatus('listening');
      if (recognitionRef.current && isCallActiveRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    } else {
      setIsMicMuted(true);
      setCallStatus('muted');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }
  };

  // Toggle speaker
  const handleToggleSpeaker = () => {
    if (!isSpeakerMuted) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakerMuted(true);
    } else {
      setIsSpeakerMuted(false);
    }
  };

  // Manual text question during call
  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    const q = manualText;
    setManualText('');
    handleProcessSpeech(q);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#04060a] border border-cyan-500/30 rounded-3xl shadow-2xl p-6 relative flex flex-col justify-between min-h-[580px] max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Top Header: Calling Status & Timer */}
        <div className="flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              CUỘC GỌI TRỰC TIẾP (LIVE CALL)
            </span>
          </div>

          <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 font-mono text-xs font-bold text-slate-200">
            {formatTime(duration)}
          </div>
        </div>

        {/* Center: Coach Avatar & Waveform Animation */}
        <div className="flex flex-col items-center justify-center py-6 z-10 space-y-5">
          <div className="relative">
            {/* Animated Pulsing Rings */}
            {callStatus === 'speaking' && (
              <>
                <div className="absolute -inset-4 rounded-full bg-cyan-500/20 animate-ping"></div>
                <div className="absolute -inset-8 rounded-full bg-emerald-500/10 animate-pulse"></div>
              </>
            )}
            {callStatus === 'listening' && (
              <div className="absolute -inset-3 rounded-full bg-emerald-500/25 animate-pulse"></div>
            )}

            {/* Coach Portrait */}
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-600 via-emerald-500 to-teal-400 p-1 shadow-2xl shadow-cyan-500/30 relative z-10 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center">
                <Bot className="w-12 h-12 text-cyan-400 stroke-[2.2]" />
              </div>
            </div>

            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-950 rounded-full flex items-center justify-center z-20">
              <Sparkles className="w-2.5 h-2.5 text-slate-950" />
            </span>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-white tracking-wide">Coach Max</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
              {callStatus === 'speaking' && (
                <span className="text-cyan-400 flex items-center gap-1 animate-pulse">
                  <Activity className="w-3.5 h-3.5" /> Coach đang giải đáp...
                </span>
              )}
              {callStatus === 'listening' && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Đang lắng nghe bạn nói...
                </span>
              )}
              {callStatus === 'thinking' && (
                <span className="text-purple-400 flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" /> Coach đang phân tích số liệu...
                </span>
              )}
              {callStatus === 'muted' && (
                <span className="text-rose-400 flex items-center gap-1">
                  <MicOff className="w-3.5 h-3.5" /> Micro đang tắt
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Audio Visualizer Bars */}
          <div className="flex items-center gap-1 h-8">
            {[40, 70, 95, 60, 85, 100, 75, 90, 65, 80, 50, 85, 45].map((val, idx) => {
              const active = callStatus === 'speaking' || (callStatus === 'listening' && userTranscript.length > 0);
              return (
                <div
                  key={idx}
                  className="w-1 bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-full transition-all duration-150"
                  style={{
                    height: active ? `${Math.max(15, (val * (Math.sin(idx + duration * 2) + 1.2)) / 2)}%` : '15%',
                    opacity: active ? 1 : 0.25
                  }}
                ></div>
              );
            })}
          </div>
        </div>

        {/* Live Subtitle / Caption Box */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-2 z-10 max-h-36 overflow-y-auto shadow-inner text-xs">
          {userTranscript && (
            <div className="flex items-start gap-2 text-emerald-300">
              <User className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p className="italic">"{userTranscript}"</p>
            </div>
          )}

          {coachResponse && (
            <div className="flex items-start gap-2 text-slate-200">
              <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{coachResponse}</p>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips (Voice Prompts) */}
        <div className="py-2 overflow-x-auto no-scrollbar flex gap-1.5 z-10">
          {[
            'Hôm nay ăn gì để debloat?',
            'Cách tập hàm không mỏi?',
            'Gợi ý bữa tối giàu Kali'
          ].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleProcessSpeech(prompt)}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[10px] text-slate-300 transition"
            >
              💬 {prompt}
            </button>
          ))}
        </div>

        {/* Fallback Text Input in Call */}
        {!speechSupported && (
          <form onSubmit={handleSendManual} className="flex gap-2 z-10 mb-2">
            <input
              type="text"
              placeholder="Micro chưa hỗ trợ, nhập câu hỏi tại đây..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
            />
            <button
              type="submit"
              className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Voice Selector Bar */}
        <div className="bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 flex items-center justify-between text-[11px] z-10 gap-1">
          <button
            type="button"
            onClick={() => setVoiceMode('gemini_puck')}
            className={`flex-1 py-1 px-1.5 rounded-xl text-center font-medium transition truncate ${
              voiceMode === 'gemini_puck'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎙️ Puck (Gym Coach)
          </button>
          <button
            type="button"
            onClick={() => setVoiceMode('gemini_fenrir')}
            className={`flex-1 py-1 px-1.5 rounded-xl text-center font-medium transition truncate ${
              voiceMode === 'gemini_fenrir'
                ? 'bg-purple-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎙️ Fenrir (Trầm)
          </button>
          <button
            type="button"
            onClick={() => setVoiceMode('subtitles_only')}
            className={`flex-1 py-1 px-1.5 rounded-xl text-center font-medium transition truncate ${
              voiceMode === 'subtitles_only'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔇 Chỉ đọc phụ đề
          </button>
        </div>

        {/* Bottom Call Action Controls */}
        <div className="flex items-center justify-around pt-2 border-t border-slate-800/80 z-10">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg ${
              isMicMuted
                ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
            }`}
            title={isMicMuted ? 'Bật Mic' : 'Tắt Mic'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 transition transform hover:scale-105 active:scale-95"
            title="Kết thúc cuộc gọi"
          >
            <PhoneOff className="w-7 h-7 stroke-[2.5]" />
          </button>

          {/* Mute Speaker */}
          <button
            type="button"
            onClick={handleToggleSpeaker}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg ${
              isSpeakerMuted
                ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
            }`}
            title={isSpeakerMuted ? 'Bật Loa' : 'Tắt Loa'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

      </div>
    </div>
  );
};
