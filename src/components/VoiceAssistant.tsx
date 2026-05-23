import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Sparkles, Volume2, Send, HelpCircle, Loader2 } from "lucide-react";
import { Task } from "../types";

// Standard web speech recognition interface declaration
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

interface VoiceAssistantProps {
  tasks: Task[];
  onActionParsed: (parsedAction: any) => void;
  isAuthenticated: boolean;
}

export default function VoiceAssistant({ tasks, onActionParsed, isAuthenticated }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLogs, setVoiceLogs] = useState<string[]>([]);
  const [voiceName, setVoiceName] = useState("Kore"); // Kore, Zephyr, Fenrir, Puck

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize Web Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setTranscript("Listening for task prompt...");
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleSendPrompt(text);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error", e);
        setIsListening(false);
        if (e.error === "not-allowed") {
          setTranscript("Microphone permission denied. Try typing your command!");
        } else {
          setTranscript("Speech recognition failed. Please try typing!");
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setTranscript("⚠️ Speech Recognition is not supported in this environment/browser. Please type your command inside the text box below!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Clear speak audio if playing
      stopSpeech();
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition modal:", err);
      }
    }
  };

  const stopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    const msg = typedMessage.trim();
    setTranscript(msg);
    setTypedMessage("");
    handleSendPrompt(msg);
  };

  // Convert AI feedback text to high-quality spoken audio using server-side Gemini TTS
  const speakResponseMessage = async (text: string) => {
    try {
      stopSpeech();
      setIsSpeaking(true);

      const res = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceName }),
      });

      if (!res.ok) {
        throw new Error("Gemini Speech synthesis failed");
      }

      const { audio } = await res.json();
      if (!audio) return;

      const audioUrl = `data:audio/wav;base64,${audio}`;
      const audioObj = new Audio(audioUrl);
      audioRef.current = audioObj;
      
      audioObj.onended = () => {
        setIsSpeaking(false);
      };

      await audioObj.play();
    } catch (err) {
      console.error("TTS audio playback failed:", err);
      setIsSpeaking(false);

      // Fallback: Use standard browser Web Synthesis
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          const u = new SpeechSynthesisUtterance(text);
          u.onend = () => setIsSpeaking(false);
          synth.speak(u);
        }
      } catch (_) {}
    }
  };

  const handleSendPrompt = async (promptText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setAiResponse(null);

    try {
      const res = await fetch("/api/gemini/voice-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptText,
          existingTasks: tasks.map(t => ({ id: t.id, title: t.title, description: t.description, status: t.status, deadline: t.deadline })),
        }),
      });

      if (!res.ok) {
        let serverErrorMsg = "Assistant parsing failed";
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            serverErrorMsg = errData.message;
          } else if (errData && errData.error) {
            serverErrorMsg = typeof errData.error === "string" ? errData.error : JSON.stringify(errData.error);
          }
        } catch (_) {}
        throw new Error(serverErrorMsg);
      }

      const actionData = await res.json();
      setAiResponse(actionData.responseMessage);
      
      // Log interaction
      setVoiceLogs((prev) => [
        `You: "${promptText}"`,
        `Agent: "${actionData.responseMessage}"`,
        ...prev.slice(0, 8),
      ]);

      // Speak response message aloud
      await speakResponseMessage(actionData.responseMessage);

      // Relay action up to parent controller (create, update, complete, delete)
      onActionParsed(actionData);

    } catch (error: any) {
      console.error(error);
      const errMsg = error.message || "";
      if (errMsg.includes("leaked") || errMsg.includes("PERMISSION_DENIED")) {
        setAiResponse("⚠️ [API KEY LEAKED] Your GEMINI_API_KEY has been flagged as leaked. Please generate a new API key in Google AI Studio and replace it in the Settings/Secrets menu to restore full voice assistant capabilities.");
      } else {
        setAiResponse(`I encountered an issue: ${errMsg || "Please verify your configuration and try again."}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Decorative pulse glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-2xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-xs sm:text-sm tracking-tight text-white font-sans">AI Voice Assistant</h3>
            <p className="text-[10px] text-slate-400 font-light">Manage tasks & workflow via intelligent speech commands</p>
          </div>
        </div>
        
        {/* Voice selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Voice:</span>
          <select
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl text-[10px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-300 cursor-pointer font-medium"
          >
            <option value="Kore" className="bg-slate-950 text-white">Kore (Vibrant)</option>
            <option value="Zephyr" className="bg-slate-950 text-white">Zephyr (Relaxed)</option>
            <option value="Fenrir" className="bg-slate-950 text-white">Fenrir (Deep)</option>
            <option value="Puck" className="bg-slate-950 text-white">Puck (Cheerful)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Visualizer & Mic section (2 columns) */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5 relative">
          
          {/* Animated rings for audio feedback */}
          <div className="relative flex items-center justify-center w-24 h-24 mb-3">
            {isListening && (
              <>
                <div className="absolute inset-0 w-24 h-24 border border-blue-400/40 rounded-full animate-ping pointer-events-none" />
                <div className="absolute inset-2 w-20 h-20 border border-blue-400/50 rounded-full animate-pulse pointer-events-none" />
              </>
            )}
            {isSpeaking && (
              <div className="absolute inset-1 w-22 h-22 border-2 border-emerald-400/30 rounded-full animate-bounce pointer-events-none" />
            )}

            <button
              onClick={toggleListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 border border-red-400 text-white shadow-lg shadow-red-500/20"
                  : isSpeaking
                  ? "bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white shadow-lg shadow-blue-500/20"
              }`}
            >
              {isListening ? (
                <MicOff className="w-6 h-6 animate-pulse" />
              ) : isSpeaking ? (
                <Volume2 className="w-6 h-6 animate-bounce" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
          </div>

          <p className="text-center text-[11px] font-semibold text-slate-300 max-w-xs">
            {isListening
              ? "Listening closely... Speak now!"
              : isSpeaking
              ? "AI Voice Synthesis Speaking..."
              : "Click micro-orb & say e.g."}
          </p>

          <span className="text-[10px] text-slate-500 mt-1 italic block text-center leading-relaxed">
            {isListening ? "" : '"Create a task to write software tomorrow at 2 PM"'}
          </span>
        </div>

        {/* Command transcripts and results panel (3 columns) */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-3 min-w-0">
          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 flex-1 flex flex-col min-h-[110px] justify-center">
            {transcript ? (
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase block font-mono">Transcript</span>
                  <p className="text-slate-200 text-xs italic font-light leading-relaxed">
                    "{transcript}"
                  </p>
                </div>
                {isProcessing && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-mono">INTELLIGENCE NETWORK PARSING...</span>
                  </div>
                )}
                {aiResponse && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase block font-mono">AI Response</span>
                    <p className="text-slate-100 text-xs leading-relaxed font-normal">
                      {aiResponse}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-slate-500">
                <p className="text-xs">No active voice telemetry recorded.</p>
                <p className="text-[10px] font-light mt-0.5">Microphone and keyboard prompts are synced fallbacks.</p>
              </div>
            )}
          </div>

          {/* Fallback Text Input */}
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Or type a direct intelligence agent request..."
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              disabled={isProcessing}
              className="flex-1 bg-white/5 text-white placeholder-slate-400 border border-white/10 rounded-2xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all font-light"
            />
            <button
              type="submit"
              disabled={isProcessing || !typedMessage.trim()}
              className="px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 text-xs shadow-lg shadow-blue-500/20"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* History/Logs */}
          {voiceLogs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Activity logs</span>
              <div className="text-[10px] space-y-0.5 text-slate-400 font-mono max-h-16 overflow-y-auto leading-relaxed scrollbar-thin">
                {voiceLogs.map((log, i) => (
                  <div key={i} className="truncate select-none border-b border-white/5 pb-0.5">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
