import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Watermark from './Watermark';
import { cn } from '../../lib/utils';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const CustomVideoPlayer = forwardRef(function CustomVideoPlayer(
  {
    src,
    user,
    initialProgress = 0,
    onProgressUpdate,
    onVideoEnd,
    title = '',
  },
  ref
) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0 });

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [error, setError] = useState(null);

  // Volume state
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('player_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(false);

  // Settings menus
  const [speed, setSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 is Auto
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('main'); // 'main' | 'speed' | 'quality'

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [seekHoverTime, setSeekHoverTime] = useState(null);
  const [seekHoverPos, setSeekHoverPos] = useState(0);
  const [ripple, setRipple] = useState(null); // { type: 'left' | 'right', text: '-5s' | '+5s' }

  // Expose player methods to parent component (e.g. jumping from Q&A timestamp)
  useImperativeHandle(ref, () => ({
    seekTo: (timeInSeconds) => {
      if (videoRef.current) {
        videoRef.current.currentTime = timeInSeconds;
        videoRef.current.play().catch(() => {});
      }
    },
    getCurrentTime: () => (videoRef.current ? videoRef.current.currentTime : 0),
  }));

  // Auto-hide controls after 3 seconds of inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 3000);
    }
  }, [isPlaying]);

  // ── Initialize HLS.js or Native Video ──────────────────────────────
  const loadSource = useCallback(() => {
    if (!src || !videoRef.current) return;
    setError(null);
    setIsBuffering(true);

    const isHls = src.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = true; // Include auth cookie
        },
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsBuffering(false);
        const levels = data.levels.map((lvl, index) => ({
          index,
          height: lvl.height,
          name: `${lvl.height}p`,
          bitrate: lvl.bitrate,
        }));
        setQualityLevels(levels);

        // Restore preferred quality
        const savedQuality = localStorage.getItem('player_preferred_quality');
        if (savedQuality && savedQuality !== 'auto') {
          const matched = levels.find((l) => l.name === savedQuality);
          if (matched) {
            hls.currentLevel = matched.index;
            setCurrentQuality(matched.index);
          }
        }

        // Resume playback position
        if (initialProgress > 0 && videoRef.current) {
          videoRef.current.currentTime = initialProgress;
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentQuality(hls.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error while loading video. Please check connection.');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error occurred. Attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              setError('Failed to load video stream.');
              hls.destroy();
              break;
          }
        }
      });
    } else {
      // Direct authenticated stream with HTTP 206 Range seeking
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      videoRef.current.src = src;
      setIsBuffering(false);
      if (initialProgress > 0) {
        videoRef.current.currentTime = initialProgress;
      }
    }
  }, [src, initialProgress]);

  useEffect(() => {
    loadSource();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [loadSource]);

  // ── Sync Volume & Speed ───────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
    localStorage.setItem('player_volume', volume.toString());
  }, [volume, isMuted]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // ── Save Progress Interval (every 10s) ─────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (videoRef.current && onProgressUpdate) {
        const curr = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        const completed = dur > 0 && curr >= dur - 15;
        onProgressUpdate(Math.round(curr), completed);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPlaying, onProgressUpdate]);

  // ── Play / Pause Toggle ───────────────────────────────────────────
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
    resetControlsTimer();
  };

  // ── Skip ±5 seconds ───────────────────────────────────────────────
  const skip = (deltaSeconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + deltaSeconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    resetControlsTimer();
  };

  // ── Double Tap for Mobile Skip ────────────────────────────────────
  const handleTouchEnd = (e) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const width = rect.width;
    const timeDelta = now - lastTapRef.current.time;
    const distDelta = Math.abs(x - lastTapRef.current.x);

    if (timeDelta < 320 && distDelta < 50) {
      // Double tap recognized!
      if (x < width * 0.4) {
        // Left side -> -5s
        skip(-5);
        setRipple({ type: 'left', text: '-5s' });
        setTimeout(() => setRipple(null), 600);
      } else if (x > width * 0.6) {
        // Right side -> +5s
        skip(5);
        setRipple({ type: 'right', text: '+5s' });
        setTimeout(() => setRipple(null), 600);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      // Single tap -> toggle controls
      lastTapRef.current = { time: now, x };
      setShowControls((prev) => !prev);
    }
  };

  // ── Fullscreen & Orientation Lock ─────────────────────────────────
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }

        setIsFullscreen(true);
        // Try orientation lock for phones
        try {
          if (window.screen?.orientation?.lock) {
            await window.screen.orientation.lock('landscape');
          }
        } catch {}
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
        try {
          if (window.screen?.orientation?.unlock) {
            window.screen.orientation.unlock();
          }
        } catch {}
      }
    } catch {
      // iOS fallback pseudo-fullscreen
      setIsPseudoFullscreen((prev) => !prev);
    }
  };

  // Listen to native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-fullscreen on rotating phone to landscape while playing
  useEffect(() => {
    const handleOrientationChange = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobile = window.innerWidth < 900;
      if (isMobile && isLandscape && isPlaying && !document.fullscreenElement) {
        toggleFullscreen().catch(() => {});
      }
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isPlaying]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input/textarea
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((v) => Math.min(1, parseFloat((v + 0.1).toFixed(2))));
          setIsMuted(false);
          resetControlsTimer();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((v) => Math.max(0, parseFloat((v - 0.1).toFixed(2))));
          resetControlsTimer();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted((prev) => !prev);
          resetControlsTimer();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, resetControlsTimer]);

  // ── Seek Bar Handlers ─────────────────────────────────────────────
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleSeekMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSeekHoverPos(e.clientX - rect.left);
    setSeekHoverTime(pos * duration);
  };

  // ── Change Quality ────────────────────────────────────────────────
  const handleSelectQuality = (index, label) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQuality(index);
      localStorage.setItem('player_preferred_quality', label);
    }
    setShowSettings(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={cn(
        'group relative w-full overflow-hidden bg-black select-none font-sans',
        isFullscreen || isPseudoFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen'
          : 'aspect-video rounded-2xl shadow-2xl'
      )}
    >
      {/* Dynamic Watermark */}
      <Watermark user={user} />

      {/* HTML5 Video Element with security locks */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="use-credentials"
        controls={false}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onTouchEnd={handleTouchEnd}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={() => {
          setIsBuffering(false);
          setError('Failed to load video stream. Please check connection or retry.');
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            // Buffered range
            const buf = videoRef.current.buffered;
            if (buf.length > 0) {
              setBufferedEnd(buf.end(buf.length - 1));
            }
          }
        }}
        onDurationChange={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (onVideoEnd) onVideoEnd();
        }}
        className="h-full w-full object-contain cursor-pointer"
      />

      {/* Double Tap Ripple Indicators */}
      {ripple && (
        <div
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/20 p-6 backdrop-blur-sm animate-ping',
            ripple.type === 'left' ? 'left-12' : 'right-12'
          )}
        >
          <span className="text-xl font-bold text-white tracking-widest">{ripple.text}</span>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
        </div>
      )}

      {/* Big Center Play/Pause Overlay Button (shown on pause or hover) */}
      {!isPlaying && !isBuffering && !error && (
        <button
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600/90 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 active:scale-95"
          aria-label="Play video"
        >
          <Play className="ml-1 h-9 w-9 fill-white" />
        </button>
      )}

      {/* Error State with Retry Button */}
      {error && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center text-white">
          <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
          <p className="max-w-md text-sm font-medium text-slate-300 mb-4">{error}</p>
          <button
            onClick={loadSource}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Retry Playback
          </button>
        </div>
      )}

      {/* Controls Bar Overlay */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300',
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Seek Bar with Hover Preview */}
        <div
          onMouseMove={handleSeekMouseMove}
          onMouseLeave={() => setSeekHoverTime(null)}
          onClick={handleSeek}
          className="group/seek relative mb-3.5 h-2 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-3"
        >
          {/* Buffered Progress */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/35 transition-all"
            style={{ width: `${duration > 0 ? (bufferedEnd / duration) * 100 : 0}%` }}
          />

          {/* Played Progress */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />

          {/* Seek Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity"
            style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 7px)` }}
          />

          {/* Hover Time Tooltip */}
          {seekHoverTime !== null && (
            <div
              className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-black/85 px-2 py-0.5 text-[11px] font-mono text-white shadow-md"
              style={{ left: `${seekHoverPos}px` }}
            >
              {formatTime(seekHoverTime)}
            </div>
          )}
        </div>

        {/* Bottom Control Buttons */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls: Play, Skip, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white hover:bg-white/15 transition active:scale-95"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="ml-0.5 h-5 w-5 fill-white" />}
            </button>

            <button
              onClick={() => skip(-5)}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition active:scale-95"
              title="Rewind 5 seconds"
              aria-label="Rewind 5 seconds"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={() => skip(5)}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition active:scale-95"
              title="Forward 5 seconds"
              aria-label="Forward 5 seconds"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Volume Control */}
            <div className="group/vol flex items-center">
              <button
                onClick={() => setIsMuted((m) => !m)}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="hidden sm:block h-1.5 w-16 cursor-pointer accent-indigo-500 rounded-lg bg-white/25 transition-all"
              />
            </div>

            {/* Current / Duration Time */}
            <div className="text-xs font-mono font-medium text-slate-300 ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-slate-500">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Settings (Speed + Quality), Fullscreen */}
          <div className="relative flex items-center gap-2">
            {/* Settings Button */}
            <button
              onClick={() => {
                setShowSettings((prev) => !prev);
                setSettingsTab('main');
              }}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen || isPseudoFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>

            {/* Settings Popup Menu */}
            {showSettings && (
              <div className="absolute right-0 bottom-14 z-50 w-52 rounded-xl bg-slate-900/95 p-2 text-xs text-white shadow-2xl backdrop-blur-md border border-slate-700/80">
                {settingsTab === 'main' && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setSettingsTab('speed')}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/10 transition"
                    >
                      <span className="text-slate-300">Playback Speed</span>
                      <span className="font-semibold text-indigo-400">{speed}x</span>
                    </button>
                    <button
                      onClick={() => setSettingsTab('quality')}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/10 transition"
                    >
                      <span className="text-slate-300">Quality</span>
                      <span className="font-semibold text-indigo-400">
                        {currentQuality === -1
                          ? 'Auto'
                          : qualityLevels.find((q) => q.index === currentQuality)?.name || 'Auto'}
                      </span>
                    </button>
                  </div>
                )}

                {settingsTab === 'speed' && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 font-semibold text-slate-400 border-b border-slate-800">
                      Playback Speed
                    </div>
                    {SPEED_OPTIONS.map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          setSpeed(val);
                          setShowSettings(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 transition"
                      >
                        <span>{val}x</span>
                        {speed === val && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                )}

                {settingsTab === 'quality' && (
                  <div className="space-y-1">
                    <div className="px-3 py-1 font-semibold text-slate-400 border-b border-slate-800">
                      Quality
                    </div>
                    <button
                      onClick={() => handleSelectQuality(-1, 'auto')}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 transition"
                    >
                      <span>Auto</span>
                      {currentQuality === -1 && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                    </button>
                    {qualityLevels.map((lvl) => (
                      <button
                        key={lvl.index}
                        onClick={() => handleSelectQuality(lvl.index, lvl.name)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 transition"
                      >
                        <span>{lvl.name}</span>
                        {currentQuality === lvl.index && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default CustomVideoPlayer;
