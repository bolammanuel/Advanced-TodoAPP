import { useEffect, useState, useRef } from "react";
import { Task } from "../types";
import { BellRing, AlertCircle, X, Volume2 } from "lucide-react";

interface NotificationManagerProps {
  tasks: Task[];
  voiceName: string; // Kore, Zephyr, Fenrir
}

interface ActiveAlert {
  id: string;
  taskTitle: string;
  deadlineDisplay: string;
  minutesRemaining: number;
}

export default function NotificationManager({ tasks, voiceName }: NotificationManagerProps) {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const warnedTaskIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const checkDeadlines = async () => {
      const now = new Date();

      for (const t of tasks) {
        if (!t.deadline || t.status === "completed") {
          continue;
        }

        const deadlineDate = new Date(t.deadline);
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        // Notify if task is within 15 minutes of deadline and hasn't been warned yet
        if (diffMins >= 0 && diffMins <= 15 && !warnedTaskIds.current.has(t.id)) {
          warnedTaskIds.current.add(t.id);

          const timeStr = deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const textToSpeak = `Heads up! Your task "${t.title}" is nearing its deadline. It is coming up at ${timeStr}. Please stay on schedule.`;

          // Display visual Alert
          setActiveAlert({
            id: t.id,
            taskTitle: t.title,
            deadlineDisplay: timeStr,
            minutesRemaining: diffMins,
          });

          // Play Audio Warning Voice (synthesized via server Gemini TTS)
          try {
            const res = await fetch("/api/gemini/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: textToSpeak, voice: voiceName }),
            });

            if (res.ok) {
              const { audio } = await res.json();
              if (audio) {
                const audioUrl = `data:audio/wav;base64,${audio}`;
                if (audioRef.current) {
                  audioRef.current.pause();
                }
                const audioObj = new Audio(audioUrl);
                audioRef.current = audioObj;
                await audioObj.play();
              }
            } else {
              throw new Error("Gemini TTS Failed");
            }
          } catch (err) {
            console.warn("Notification speech fallback to browser Synthesis on error", err);
            try {
              const synth = window.speechSynthesis;
              if (synth) {
                const u = new SpeechSynthesisUtterance(textToSpeak);
                synth.speak(u);
              }
            } catch (_) {}
          }
        }
      }
    };

    // Run check upon mount and every 30 seconds
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 30000);
    return () => clearInterval(interval);
  }, [tasks, voiceName]);

  if (!activeAlert) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#050608]/95 backdrop-blur-md text-white rounded-3xl p-5 shadow-2xl border border-rose-500/40 max-w-sm flex items-start gap-3.5 animate-bounce">
      <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl mt-0.5 text-rose-400">
        <BellRing className="w-5 h-5 text-rose-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase font-mono">Deadline Warning Protocol</span>
          <button
            onClick={() => setActiveAlert(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="font-semibold text-xs sm:text-sm mt-1.5 mb-0.5 truncate text-white">
          "{activeAlert.taskTitle}"
        </p>
        <p className="text-[11px] text-slate-400 font-light leading-relaxed">
          Due in <span className="font-bold text-rose-400">{activeAlert.minutesRemaining} mins</span> at {activeAlert.deadlineDisplay}.
        </p>
      </div>
    </div>
  );
}
