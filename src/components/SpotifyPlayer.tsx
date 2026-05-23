import React, { useState, useEffect } from "react";
import { Music, Radio, ChevronRight, Play, ExternalLink, Link2, HelpCircle } from "lucide-react";

interface PlaylistOption {
  name: string;
  genre: string;
  embedUrl: string;
  description: string;
}

const SPOTIFY_PLAYLISTS: PlaylistOption[] = [
  {
    name: "Lofi Beats Focus",
    genre: "Lofi",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0EXPn?utm_source=generator",
    description: "Gentle hip hop rhythms for coding or study.",
  },
  {
    name: "Deep Focus Ambient",
    genre: "Ambient",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKFB6uUiCY?utm_source=generator",
    description: "Atmospheric, lyric-less synthesizer washes for raw flow.",
  },
  {
    name: "Synthwave Productivity",
    genre: "Retro-Synth",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8g970gU6vIu?utm_source=generator",
    description: "Uptempo electronic synthesizer scores to speed up the keys.",
  },
  {
    name: "Classic flow state",
    genre: "Classical/Piano",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wL68?utm_source=generator",
    description: "Peaceful grand piano arrangements for writing and logic.",
  },
];

interface SpotifyPlayerProps {
  autoTriggeredTaskTitle: string | null;
  onClearTrigger: () => void;
}

export default function SpotifyPlayer({ autoTriggeredTaskTitle, onClearTrigger }: SpotifyPlayerProps) {
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistOption>(SPOTIFY_PLAYLISTS[0]);
  const [customPlaylistUrl, setCustomPlaylistUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string>(SPOTIFY_PLAYLISTS[0].embedUrl);
  const [messageNotification, setMessageNotification] = useState<string | null>(null);

  // Handle auto-triggered tasks (e.g., user started a coding task)
  useEffect(() => {
    if (autoTriggeredTaskTitle) {
      // Pick a random playlist for coding or keep the current one
      const focusPlaylist = SPOTIFY_PLAYLISTS[0]; // Default to Lofi Focus
      setSelectedPlaylist(focusPlaylist);
      setEmbedUrl(focusPlaylist.embedUrl);
      setMessageNotification(`🎶 Coding flow detected in "${autoTriggeredTaskTitle}"! Activating focus ambient playlist...`);
      
      const timer = setTimeout(() => {
        setMessageNotification(null);
        onClearTrigger();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [autoTriggeredTaskTitle, onClearTrigger]);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPlaylistUrl) return;

    // Convert standard Spotify URL to embed URL
    try {
      const matchPlaylist = customPlaylistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      const matchTrack = customPlaylistUrl.match(/track\/([a-zA-Z0-9]+)/);
      const matchAlbum = customPlaylistUrl.match(/album\/([a-zA-Z0-9]+)/);

      let targetUrl = "";
      if (matchPlaylist) {
        targetUrl = `https://open.spotify.com/embed/playlist/${matchPlaylist[1]}?utm_source=generator`;
      } else if (matchTrack) {
        targetUrl = `https://open.spotify.com/embed/track/${matchTrack[1]}?utm_source=generator`;
      } else if (matchAlbum) {
        targetUrl = `https://open.spotify.com/embed/album/${matchAlbum[1]}?utm_source=generator`;
      } else {
        setMessageNotification("⚠️ Please paste a valid Spotify link containing /playlist/, /track/, or /album/");
        setTimeout(() => setMessageNotification(null), 5000);
        return;
      }

      setEmbedUrl(targetUrl);
      setSelectedPlaylist({
        name: "My Custom Playlist",
        genre: "Custom",
        embedUrl: targetUrl,
        description: "Your connected Spotify music feed.",
      });
      setCustomPlaylistUrl("");
      setMessageNotification("🎶 Custom music link synced successfully!");
      setTimeout(() => setMessageNotification(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-2xl">
            <Music className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-xs sm:text-sm tracking-tight">Audio Protocol Linked</h3>
            <p className="text-xs text-slate-400 font-light">Spotify ambient streams synced to productivity tasks</p>
          </div>
        </div>
        <Radio className="w-4 h-4 text-emerald-400 animate-ping" />
      </div>

      {messageNotification && (
        <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-300 text-xs flex items-center justify-between animate-pulse">
          <span>{messageNotification}</span>
        </div>
      )}

      {/* Grid: Player & Selector */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Preset Selector */}
        <div className="md:col-span-2 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">Focus Presets</span>
            <div className="space-y-1.5">
              {SPOTIFY_PLAYLISTS.map((pl) => (
                <button
                  key={pl.name}
                  onClick={() => {
                    setSelectedPlaylist(pl);
                    setEmbedUrl(pl.embedUrl);
                  }}
                  className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex flex-col cursor-pointer ${
                    selectedPlaylist.name === pl.name
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/5 font-medium"
                      : "bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{pl.name}</span>
                    <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-slate-400 font-bold font-mono">
                      {pl.genre}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-light mt-0.5 max-w-xs truncate leading-relaxed">
                    {pl.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Connect Custom Playlist */}
          <form onSubmit={handleApplyCustom} className="space-y-2 pt-2 border-t border-white/5">
            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-400" />
              Connect Custom Spotify Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPlaylistUrl}
                onChange={(e) => setCustomPlaylistUrl(e.target.value)}
                placeholder="Paste playlist, track, or album URL"
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-400 transition-all font-light"
              />
              <button
                type="submit"
                className="px-4.5 bg-emerald-600 text-white font-bold hover:bg-emerald-500 active:scale-95 rounded-2xl text-xs flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Link
              </button>
            </div>
          </form>
        </div>

        {/* Embedded Iframe Player */}
        <div className="md:col-span-3 bg-white/5 rounded-2xl overflow-hidden aspect-video flex flex-col justify-center items-center relative border border-white/10 h-[220px]">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen={false}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="w-full h-full rounded-2xl"
            id="spotify-iframe-widget"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
