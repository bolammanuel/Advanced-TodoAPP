export type TaskStatus = 'idle' | 'inprogress' | 'paused' | 'completed' | 'overdue';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  deadline: string; // ISO string YYYY-MM-DDTHH:MM
  meetLink: string | null;
  eventId: string | null; // Calendar Event ID
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  spotifyPlaylistUrl?: string; // e.g. embedded playlist
  isSyncing?: boolean;
}

export interface GoogleContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface StreakStats {
  completedCount: number;
  pausedCount: number;
  overdueCount: number;
  streak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
}

export interface LocalPreferences {
  voiceEnabled: boolean;
  voiceName: string; // 'Kore' | 'Zephyr' | 'Fenrir'
  spotifyConnected: boolean;
}
