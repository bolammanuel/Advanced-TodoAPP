import { useState, useEffect, useMemo } from "react";
import { Task, GoogleContact, StreakStats, TaskStatus } from "./types";
import { 
  googleSignIn, 
  initAuth, 
  logout, 
  getAccessToken 
} from "./lib/firebase";
import { 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from "./services/calendar";
import { fetchGoogleContacts } from "./services/people";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import TaskStats from "./components/TaskStats";
import VoiceAssistant from "./components/VoiceAssistant";
import SpotifyPlayer from "./components/SpotifyPlayer";
import NotificationManager from "./components/NotificationManager";
import { 
  Calendar as CalendarIcon, 
  User, 
  LogOut, 
  Plus, 
  Sparkles, 
  Clock, 
  AlertCircle,
  VolumeX,
  Volume2
} from "lucide-react";

// Mock/Initial tasks to prep the board immediately on load
const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Code algorithm micro-engine review",
    description: "Refactor core logical statements for low-latency computation.",
    status: "inprogress",
    createdAt: new Date().toISOString(),
    deadline: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16), // Due in 2 hours
    meetLink: null,
    eventId: null,
  },
  {
    id: "task-2",
    title: "Spreadsheet sync layout strategy",
    description: "Align financial coordinates with Google Sheets data matrices.",
    status: "idle",
    createdAt: new Date().toISOString(),
    deadline: new Date(Date.now() + 25 * 3600000).toISOString().slice(0, 16), // Due tomorrow
    meetLink: null,
    eventId: null,
  }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [googleContacts, setGoogleContacts] = useState<GoogleContact[]>([]);
  const [streakStats, setStreakStats] = useState<StreakStats>({
    completedCount: 0,
    pausedCount: 0,
    overdueCount: 0,
    streak: 0,
    lastCompletedDate: null,
  });

  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [spotifyTriggeredTask, setSpotifyTriggeredTask] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState("Kore");

  // Load state from LocalStorage on mount
  useEffect(() => {
    const loadedTasks = localStorage.getItem("productive_tasks");
    if (loadedTasks) {
      setTasks(JSON.parse(loadedTasks));
    } else {
      setTasks(INITIAL_TASKS);
    }

    const loadedStats = localStorage.getItem("productive_stats");
    if (loadedStats) {
      setStreakStats(JSON.parse(loadedStats));
    }

    // Initialize Auth listener
    initAuth(
      async (firebaseUser, token) => {
        setUser(firebaseUser);
        setAccessToken(token);
        setIsAuthenticated(true);
        // Sync contacts
        const contacts = await fetchGoogleContacts(token);
        setGoogleContacts(contacts);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthenticated(false);
      }
    );
  }, []);

  // Save tasks and stats to localStorage when altered
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem("productive_tasks", JSON.stringify(tasks));
    }
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("productive_stats", JSON.stringify(streakStats));
  }, [streakStats]);

  // Periodic checker to flag overdue status
  useEffect(() => {
    const flagOverdue = () => {
      const now = new Date();
      let hasChanges = false;

      const checkedTasks = tasks.map((t) => {
        if (t.status !== "completed" && t.status !== "overdue" && t.deadline) {
          const deadlineDate = new Date(t.deadline);
          if (deadlineDate < now) {
            hasChanges = true;
            return { ...t, status: "overdue" as TaskStatus };
          }
        }
        return t;
      });

      if (hasChanges) {
        setTasks(checkedTasks);
        // Update overdue count
        const overdueNum = checkedTasks.filter(t => t.status === "overdue").length;
        setStreakStats(prev => ({ ...prev, overdueCount: overdueNum }));
      }
    };

    flagOverdue();
    const interval = setInterval(flagOverdue, 15000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Handle Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setIsAuthenticated(true);
        // Load contacts
        const contacts = await fetchGoogleContacts(result.accessToken);
        setGoogleContacts(contacts);
      }
    } catch (error) {
      console.error("Popup credentials blocked or canceled", error);
    }
  };

  // Handle Log Out
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out from Google Workspace services?");
    if (confirmLogout) {
      await logout();
      setUser(null);
      setAccessToken(null);
      setIsAuthenticated(false);
      setGoogleContacts([]);
    }
  };

  // Save / Update task
  const handleSaveTask = async (
    formData: Omit<Task, "id" | "createdAt" | "status">,
    createCalendarSync: boolean,
    createMeetLink: boolean
  ) => {
    let syncedEventId: string | null = null;
    let syncedMeetLink: string | null = null;

    // Execute google synchronization if authenticated & checkmarked
    if (isAuthenticated && accessToken && createCalendarSync) {
      try {
        const dummyRefTask: Task = {
          id: taskToEdit?.id || "temp",
          title: formData.title,
          description: formData.description,
          status: "idle",
          createdAt: new Date().toISOString(),
          deadline: formData.deadline,
          meetLink: taskToEdit?.meetLink || null,
          eventId: taskToEdit?.eventId || null,
        };

        if (taskToEdit?.eventId) {
          // Destructive/Modifying calendar update confirmation
          const confirmUpdate = window.confirm(
            `Update are corresponding Calendar event "${taskToEdit.title}"?`
          );
          if (confirmUpdate) {
            const { meetLink } = await updateCalendarEvent(
              accessToken,
              taskToEdit.eventId,
              dummyRefTask,
              createMeetLink
            );
            syncedEventId = taskToEdit.eventId;
            syncedMeetLink = meetLink;
          } else {
            syncedEventId = taskToEdit.eventId;
            syncedMeetLink = taskToEdit.meetLink;
          }
        } else {
          const { eventId, meetLink } = await createCalendarEvent(
            accessToken,
            dummyRefTask,
            createMeetLink
          );
          syncedEventId = eventId;
          syncedMeetLink = meetLink;
        }
      } catch (err) {
        console.error("Calendar sync bypassed because of integration fault:", err);
      }
    }

    if (taskToEdit) {
      // Modify existing task
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskToEdit.id
            ? {
                ...t,
                ...formData,
                eventId: syncedEventId || t.eventId,
                meetLink: syncedMeetLink || t.meetLink,
              }
            : t
        )
      );
    } else {
      // Create new task
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        status: "idle",
        createdAt: new Date().toISOString(),
        deadline: formData.deadline,
        eventId: syncedEventId,
        meetLink: syncedMeetLink,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
      };
      setTasks((prev) => [newTask, ...prev]);

      // Automatically trigger Spotify focus playlist if title involves code
      if (formData.title.toLowerCase().match(/(code|coding|study|write|programmer|program|refactor|debug|learn)/)) {
        setSpotifyTriggeredTask(formData.title);
      }
    }

    setIsFormOpen(false);
    setTaskToEdit(null);
  };

  // Change task status and calculate daily completion streak
  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    const oldTask = tasks.find((t) => t.id === id);
    const oldStatus = oldTask ? oldTask.status : ("idle" as TaskStatus);

    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, status: newStatus };
      }
      return t;
    });

    setTasks(updated);

    // If starting coding/focus task, trigger Spotify focus ambient music
    if (newStatus === "inprogress") {
      const target = tasks.find(t => t.id === id);
      if (target && target.title.toLowerCase().match(/(code|coding|study|write|programmer|program|refactor|debug|learn)/)) {
        setSpotifyTriggeredTask(target.title);
      }
    }

    // Calculate streaks when status switches to Completed
    if (newStatus === "completed" && oldStatus !== "completed") {
      const todayString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split("T")[0];

      setStreakStats((prev) => {
        let newStreak = prev.streak;

        if (prev.lastCompletedDate === null) {
          newStreak = 1;
        } else if (prev.lastCompletedDate === yesterdayString) {
          newStreak += 1; // Continuous daily completion
        } else if (prev.lastCompletedDate !== todayString) {
          // Break in completion streak
          newStreak = 1;
        }

        return {
          ...prev,
          completedCount: prev.completedCount + 1,
          streak: newStreak,
          lastCompletedDate: todayString,
        };
      });
    }

    // Recalculate stats categories mapping
    const completedNum = updated.filter(t => t.status === "completed").length;
    const pausedNum = updated.filter(t => t.status === "paused").length;
    const overdueNum = updated.filter(t => t.status === "overdue").length;

    setStreakStats(prev => ({
      ...prev,
      completedCount: completedNum,
      pausedCount: pausedNum,
      overdueCount: overdueNum
    }));
  };

  // Delete task cleanly
  const handleDeleteTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    // Workspace sync deletion
    if (isAuthenticated && accessToken && target.eventId) {
      try {
        await deleteCalendarEvent(accessToken, target.eventId);
      } catch (err) {
        console.error("Could not remove google calendar event:", err);
      }
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Parser: Apply actions decoded by the server Gemini Agent Voice transcript
  const handleVoiceActionParsed = async (parsed: any) => {
    const { action, taskTitle, taskDescription, taskDeadline, targetTaskId, spotifyTrigger } = parsed;
    
    // Auto-trigger Spotify Focus Feed
    if (spotifyTrigger) {
      setSpotifyTriggeredTask(taskTitle || "Voice Assigned Flow");
    }

    if (action === "create" && taskTitle) {
      // Form date default to today + 2 hours if Gemini doesn't capture it
      let finalDeadline = taskDeadline;
      if (!finalDeadline) {
        const d = new Date();
        d.setHours(d.getHours() + 2);
        finalDeadline = d.toISOString().slice(0, 16);
      }

      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: taskTitle,
        description: taskDescription || "Created via Speech Assistant",
        status: "idle",
        createdAt: new Date().toISOString(),
        deadline: finalDeadline,
        eventId: null,
        meetLink: null,
      };

      // If user is Google authenticated, we can automatically insert into Calendar!
      if (isAuthenticated && accessToken) {
        try {
          const { eventId, meetLink } = await createCalendarEvent(accessToken, newTask, false);
          newTask.eventId = eventId;
          newTask.meetLink = meetLink;
        } catch (err) {
          console.error("Auto Calendar voice insertion error", err);
        }
      }

      setTasks((prev) => [newTask, ...prev]);

    } else if (action === "complete") {
      // Find matching item
      let match = targetTaskId ? tasks.find(t => t.id === targetTaskId) : null;
      if (!match && taskTitle) {
        match = tasks.find(t => t.title.toLowerCase().includes(taskTitle.toLowerCase()));
      }

      if (match) {
        handleStatusChange(match.id, "completed");
      }

    } else if (action === "update") {
      let match = targetTaskId ? tasks.find(t => t.id === targetTaskId) : null;
      if (!match && taskTitle) {
        match = tasks.find(t => t.title.toLowerCase().includes(taskTitle.toLowerCase()));
      }

      if (match) {
        setTasks(prev =>
          prev.map(t => t.id === match!.id ? {
            ...t,
            title: taskTitle || t.title,
            description: taskDescription || t.description,
            deadline: taskDeadline || t.deadline,
          } : t)
        );
      }

    } else if (action === "delete") {
      let match = targetTaskId ? tasks.find(t => t.id === targetTaskId) : null;
      if (!match && taskTitle) {
        match = tasks.find(t => t.title.toLowerCase().includes(taskTitle.toLowerCase()));
      }

      if (match) {
        handleDeleteTask(match.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 pb-20 font-sans antialiased selection:bg-blue-500 selection:text-white relative overflow-hidden">
      {/* Corner Blurry Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Premium Dashboard Header */}
      <header className="bg-[#050608]/85 backdrop-blur-md border-b border-white/5 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-2xl shadow-lg">
              <CalendarIcon className="w-5 h-5 shadow-[0_0_10px_rgba(59,130,246,0.2)]" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm sm:text-base tracking-tight leading-none font-sans">FocusSync Workspace</h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-light mt-0.5 sm:mt-1 font-sans">Google Workspace Companion Dashboard</p>
            </div>
          </div>

          {/* Sign In / Sign out layout */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-1.5 rounded-2xl shadow-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-xl object-cover shadow-sm border border-white/10"
                  />
                ) : (
                  <div className="w-7 h-7 bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl flex items-center justify-center font-bold text-xs">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <div className="hidden sm:block text-left pr-2">
                  <p className="text-xs font-semibold text-slate-200 leading-none">{user.displayName}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-light font-mono">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Disconnect Google account"
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="gsi-material-button text-xs select-none cursor-pointer scale-95 origin-right hover:scale-100 transition-all"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: "block" }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-semibold">Sign in with Google</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout block */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Columns (5 spans out of 12): System Integrations & Mic Controllers */}
          <div className="lg:col-span-5 space-y-6">
            <VoiceAssistant 
              tasks={tasks}
              onActionParsed={handleVoiceActionParsed}
              isAuthenticated={isAuthenticated}
            />

            <SpotifyPlayer 
              autoTriggeredTaskTitle={spotifyTriggeredTask}
              onClearTrigger={() => setSpotifyTriggeredTask(null)}
            />
          </div>

          {/* Right Columns (7 spans out of 12): Stats scorecards and Task Scheduler */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Breakdowns & Graph */}
            <TaskStats tasks={tasks} streakStats={streakStats} />

            {/* Subheader: Tasks Section with "Add" option */}
            <div className="flex items-center justify-between border-t border-white/5 pt-5">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5 font-sans uppercase">
                  📁 Active Workspace Backlog
                </h2>
                <p className="text-[10px] text-slate-400 font-mono">Total backlog count: {tasks.length} active protocols</p>
              </div>
              
              {!isFormOpen && (
                <button
                  onClick={() => {
                    setTaskToEdit(null);
                    setIsFormOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create Task
                </button>
              )}
            </div>

            {/* Conditionally rendering Create / Edit Task Box */}
            {isFormOpen && (
              <TaskForm
                taskToEdit={taskToEdit}
                googleContacts={googleContacts}
                onSave={handleSaveTask}
                onCancel={() => {
                  setIsFormOpen(false);
                  setTaskToEdit(null);
                }}
                isAuthenticated={isAuthenticated}
                onGoogleSignIn={handleGoogleSignIn}
              />
            )}

            {/* Interactive Task list grid */}
            <TaskList
              tasks={tasks}
              onStatusChange={handleStatusChange}
              onEdit={(task) => {
                setTaskToEdit(task);
                setIsFormOpen(true);
              }}
              onDelete={handleDeleteTask}
            />
          </div>
        </div>
      </main>

      {/* Persistent Deadline Micro-Daemon Alarms */}
      <NotificationManager tasks={tasks} voiceName={voiceName} />
    </div>
  );
}
