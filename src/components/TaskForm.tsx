import React, { useState, useEffect } from "react";
import { Task, GoogleContact } from "../types";
import { Calendar, Video, UserPlus, Music, Trash2, X, PlusCircle } from "lucide-react";

interface TaskSavePayload {
  title: string;
  description: string;
  deadline: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface TaskFormProps {
  taskToEdit?: Task | null;
  googleContacts: GoogleContact[];
  onSave: (task: TaskSavePayload, createCalendarSync: boolean, createMeetLink: boolean) => void;
  onCancel: () => void;
  isAuthenticated: boolean;
  onGoogleSignIn: () => void;
}

export default function TaskForm({
  taskToEdit,
  googleContacts,
  onSave,
  onCancel,
  isAuthenticated,
  onGoogleSignIn,
}: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [syncCalendar, setSyncCalendar] = useState(false);
  const [createMeet, setCreateMeet] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>("");

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      
      // Format ISO offset back to locale "YYYY-MM-DDTHH:MM"
      if (taskToEdit.deadline) {
        try {
          const d = new Date(taskToEdit.deadline);
          const offset = d.getTimezoneOffset();
          const localDate = new Date(d.getTime() - (offset * 60 * 1000));
          setDeadline(localDate.toISOString().slice(0, 16));
        } catch (_) {
          setDeadline("");
        }
      } else {
        setDeadline("");
      }

      setSyncCalendar(!!taskToEdit.eventId);
      setCreateMeet(!!taskToEdit.meetLink);

      // Match contact details
      if (taskToEdit.contactName) {
        const found = googleContacts.find(c => c.name === taskToEdit.contactName);
        if (found) {
          setSelectedContact(JSON.stringify(found));
        } else {
          setSelectedContact(JSON.stringify({
            id: "temp",
            name: taskToEdit.contactName,
            phone: taskToEdit.contactPhone,
            email: taskToEdit.contactEmail
          }));
        }
      } else {
        setSelectedContact("");
      }
    } else {
      setTitle("");
      setDescription("");
      // Default to tomorrow local time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setDeadline(tomorrow.toISOString().substring(0, 16));
      setSyncCalendar(isAuthenticated);
      setCreateMeet(false);
      setSelectedContact("");
    }
  }, [taskToEdit, isAuthenticated, googleContacts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let contactName: string | undefined;
    let contactPhone: string | undefined;
    let contactEmail: string | undefined;

    if (selectedContact) {
      try {
        const c: GoogleContact = JSON.parse(selectedContact);
        contactName = c.name;
        contactPhone = c.phone;
        contactEmail = c.email;
      } catch (_) {}
    }

    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        deadline,
        contactName,
        contactPhone,
        contactEmail,
      },
      syncCalendar,
      createMeet
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <h3 className="font-semibold text-white text-xs sm:text-sm tracking-tight font-sans">
          {taskToEdit ? "🔧 UPDATE SCHEDULED PROTOCOL" : "✨ SCHEDULE NEW PROTOCOLS"}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Title */}
        <div>
          <label className="block text-slate-400 font-bold tracking-wider uppercase text-[10px] mb-1.5 font-mono">Task Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Write core algorithm / Study chemistry"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 font-light"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-slate-400 font-bold tracking-wider uppercase text-[10px] mb-1.5 font-mono">Detailed Description (Optional)</label>
          <textarea
            placeholder="Outline objectives, steps, or prerequisites..."
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 font-light resize-none leading-relaxed"
          />
        </div>

        {/* Deadline and Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 font-bold tracking-wider uppercase text-[10px] mb-1.5 font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date & Deadline
            </label>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 font-light cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold tracking-wider uppercase text-[10px] mb-1.5 font-mono flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-slate-400" /> Link Google Contact
            </label>
            {isAuthenticated ? (
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 cursor-pointer font-medium"
              >
                <option value="" className="bg-slate-950 text-white">-- Assign Contact --</option>
                {googleContacts.map((contact) => (
                  <option key={contact.id} value={JSON.stringify(contact)} className="bg-slate-950 text-white">
                    {contact.name} {contact.phone ? `(${contact.phone})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2 border border-white/10 rounded-2xl bg-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-light">Sign in with Google needed</span>
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="px-2.5 py-1 text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold rounded-xl border border-blue-500/20 transition-colors"
                >
                  Link Google
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Settings */}
        <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-2.5">
          <span className="font-bold text-slate-400 tracking-wider uppercase block text-[10px] font-mono">
            Google Workspace Features
          </span>
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAuthenticated}
                checked={syncCalendar && isAuthenticated}
                onChange={(e) => {
                  setSyncCalendar(e.target.checked);
                  if (!e.target.checked) setCreateMeet(false);
                }}
                className="rounded text-blue-500 focus:ring-blue-500 w-4 h-4 border-white/10 bg-white/5 cursor-pointer"
              />
              <span className={`text-xs font-light ${isAuthenticated ? "text-slate-300" : "text-slate-500"}`}>
                Add / sync task event to my Google Calendar
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer pl-6">
              <input
                type="checkbox"
                disabled={!syncCalendar || !isAuthenticated}
                checked={createMeet && syncCalendar && isAuthenticated}
                onChange={(e) => setCreateMeet(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500 w-4 h-4 border-white/10 bg-white/5 cursor-pointer disabled:opacity-50"
              />
              <span
                className={`text-xs flex items-center gap-1.5 font-light ${
                  syncCalendar && isAuthenticated ? "text-slate-300" : "text-slate-500"
                }`}
              >
                <Video className="w-3.5 h-3.5 text-purple-400" />
                Generate an automatic Google Meet conference link
              </span>
            </label>
          </div>
          {!isAuthenticated && (
            <p className="text-[10px] text-slate-500 font-light pt-1 font-mono">
              💡 Enable sign-in to sync events directly to your personal calendar in real time.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 font-bold text-slate-300 cursor-pointer text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 cursor-pointer text-xs transition-all"
          >
            {taskToEdit ? "Upgrade Task" : "Schedule Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
