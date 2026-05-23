import { useState } from "react";
import { Task, TaskStatus } from "../types";
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  RotateCcw, 
  Video, 
  Phone, 
  Mail, 
  Calendar, 
  Trash2, 
  Edit3, 
  Search,
  Filter,
  Check,
  AlertTriangle,
  Music
} from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskList({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Filtering logic
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && (t.status === "inprogress" || t.status === "paused")) ||
      filterStatus === t.status;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "idle":
        return <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border border-white/10 uppercase tracking-wider">Idle</span>;
      case "inprogress":
        return (
          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(59,130,246,0.2)] animate-pulse">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
            In Progress
          </span>
        );
      case "paused":
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Paused</span>;
      case "completed":
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Completed</span>;
      case "overdue":
        return (
          <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  const handleDeleteWithConfirm = (task: Task) => {
    const calendarMsg = task.eventId 
      ? " This will also remove the corresponding event from your active Google Calendar."
      : "";
    const confirmed = window.confirm(
      `Are you sure you want to delete the task "${task.title}"?${calendarMsg} This action cannot be undone.`
    );
    if (confirmed) {
      onDelete(task.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search tasks by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 transition-all font-light"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 self-end sm:self-auto">
          {["all", "idle", "inprogress", "paused", "completed", "overdue"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold select-none cursor-pointer transition-all ${
                filterStatus === st
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold"
                  : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              {st === "inprogress" ? "In Progress" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-dashed border-white/10 p-12 text-center text-slate-400">
            <span className="text-sm font-medium block mb-1 text-slate-200">No tasks scheduled in this filter</span>
            <span className="text-xs">Create or voice-prompt a task to begin your productive day.</span>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isCodeTask = t.title.toLowerCase().match(/(code|coding|study|write|programmer|program|refactor|debug|learn)/);
            return (
              <div
                key={t.id}
                className={`p-5 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl hover:bg-white/10 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  t.status === "completed" ? "opacity-60" : ""
                }`}
              >
                {/* Checkbox and Text Content */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <button
                    onClick={() => onStatusChange(t.id, t.status === "completed" ? "idle" : "completed")}
                    className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
                      t.status === "completed"
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "border-white/20 hover:border-blue-400 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h4
                        className={`font-semibold text-white text-xs sm:text-sm tracking-tight truncate ${
                          t.status === "completed" ? "line-through text-slate-500" : ""
                        }`}
                      >
                        {t.title}
                      </h4>
                      {getStatusBadge(t.status)}
                    </div>
                    {t.description && (
                      <p className="text-xs text-slate-400 font-light mb-2.5 line-clamp-2 max-w-2xl leading-relaxed">
                        {t.description}
                      </p>
                    )}

                    {/* Meta capsules: Calendar Sync, Meet, Contact, Spotify */}
                    <div className="flex flex-wrap gap-1.5">
                      {t.deadline && (
                        <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          Till: {new Date(t.deadline).toLocaleDateString()} {new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}

                      {t.eventId && (
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          Synced to Google Calendar
                        </span>
                      )}

                      {isCodeTask && (
                        <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm font-semibold">
                          <Music className="w-3.5 h-3.5 text-green-400" />
                          Lofi-Linked Focus Task
                        </span>
                      )}

                      {t.contactName && (
                        <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-semibold shadow-sm">
                          <span>👤 {t.contactName}</span>
                          {t.contactPhone && (
                            <a
                              href={`tel:${t.contactPhone}`}
                              title={`Call ${t.contactName} at ${t.contactPhone}`}
                              className="p-1 hover:bg-purple-500/20 text-purple-200 hover:text-white rounded-md transition-all cursor-pointer"
                            >
                              <Phone className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {t.contactEmail && (
                            <a
                              href={`mailto:${t.contactEmail}`}
                              title={`Mail ${t.contactName} at ${t.contactEmail}`}
                              className="p-1 hover:bg-purple-500/20 text-purple-200 hover:text-white rounded-md transition-all cursor-pointer"
                            >
                              <Mail className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operations & actions panel */}
                <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-0 pt-3 md:pt-0 border-white/5">
                  {/* Status Toggle Actions */}
                  <div className="flex gap-1">
                    {t.status === "idle" && (
                      <button
                        onClick={() => onStatusChange(t.id, "inprogress")}
                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-[11px] font-bold rounded-xl flex items-center gap-1 select-none cursor-pointer transition-all shadow-md"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                    )}

                    {t.status === "inprogress" && (
                      <>
                        <button
                          onClick={() => onStatusChange(t.id, "paused")}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-xl flex items-center gap-1 select-none cursor-pointer transition-all shadow-md"
                        >
                          <Pause className="w-3 h-3" />
                          Pause
                        </button>
                        <button
                          onClick={() => onStatusChange(t.id, "completed")}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-xl flex items-center gap-1 select-none cursor-pointer transition-all shadow-md"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Finish
                        </button>
                      </>
                    )}

                    {t.status === "paused" && (
                      <>
                        <button
                          onClick={() => onStatusChange(t.id, "inprogress")}
                          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-[11px] font-bold rounded-xl flex items-center gap-1 select-none cursor-pointer transition-all shadow-md"
                        >
                          <Play className="w-3 h-3" />
                          Resume
                        </button>
                        <button
                          onClick={() => onStatusChange(t.id, "completed")}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-xl flex items-center gap-1 select-none cursor-pointer transition-all shadow-md"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Finish
                        </button>
                      </>
                    )}

                    {(t.status === "completed" || t.status === "overdue") && (
                      <button
                        onClick={() => onStatusChange(t.id, "idle")}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-bold rounded-xl flex items-center gap-1 select-none cursor-pointer transition-all shadow-md"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restart
                      </button>
                    )}

                    {t.meetLink && (
                      <a
                        href={t.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-[11px] font-bold rounded-xl text-white flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition-all"
                      >
                        <Video className="w-3 h-3" />
                        Join Meet
                      </a>
                    )}
                  </div>

                  {/* Edit/Delete Utils */}
                  <div className="flex gap-1 border-l border-white/10 pl-2">
                    <button
                      onClick={() => onEdit(t)}
                      title="Edit task settings"
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWithConfirm(t)}
                      title="Delete task"
                      className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
