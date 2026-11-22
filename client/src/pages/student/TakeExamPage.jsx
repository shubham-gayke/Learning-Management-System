import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getExamById, startExam, submitExam, terminateExam } from '../../api/exams';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import {
  FileCheck,
  Clock,
  Award,
  AlertTriangle,
  ShieldAlert,
  Camera,
  CameraOff,
  Maximize2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Send,
  Sparkles,
  Smartphone,
  Eye,
  Info,
  Grid,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Native Web Audio API alert sound generator
function playAlertBeep(isSevere = false) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSevere) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
}

export default function TakeExamPage() {
  const { id: examId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Phase: 'gate' | 'testing' | 'submitted' | 'terminated'
  const [phase, setPhase] = useState('gate');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreedToRules, setAgreedToRules] = useState(false);

  // Video and Camera Stream Management
  const streamRef = useRef(null);
  const gateVideoRef = useRef(null);
  const desktopVideoRef = useRef(null);
  const mobileVideoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // AI Proctoring Model
  const cocoModelRef = useRef(null);
  const [aiModelLoading, setAiModelLoading] = useState(false);
  const [aiModelReady, setAiModelReady] = useState(false);
  const [phoneDetectedLive, setPhoneDetectedLive] = useState(false);

  // Exam Progress State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qIdx]: selectedOptionIndex }
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Anti-cheating Telemetry
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [phoneDetectionCount, setPhoneDetectionCount] = useState(0);
  const [violations, setViolations] = useState([]);

  const tabSwitchesRef = useRef(0);
  const phoneWarningsRef = useRef(0);
  const violationsRef = useRef([]);
  const lastTabViolationTimeRef = useRef(0);
  const lastPhoneViolationTimeRef = useRef(0);

  // Modals & Drawers
  const [warningModal, setWarningModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'tab_switch',
  });
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // CAMERA STREAM CONTROLLER (Turn off instantly when submitted/terminated)
  // ─────────────────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    // 1. Explicitly stop and disable all MediaStream tracks immediately
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch {}
        });
      } catch {}
      streamRef.current = null;
    }

    // 2. Clear srcObject and pause all video DOM elements
    [gateVideoRef.current, desktopVideoRef.current, mobileVideoRef.current].forEach((video) => {
      if (video) {
        try {
          if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
            video.srcObject.getTracks().forEach((track) => {
              try {
                track.stop();
                track.enabled = false;
              } catch {}
            });
          }
          video.srcObject = null;
          video.pause();
        } catch {}
      }
    });

    setCameraActive(false);
    setPhoneDetectedLive(false);
  }, []);

  const attachStreamToVideo = useCallback((videoElement) => {
    if (!videoElement || !streamRef.current) return;
    try {
      // Chrome/Edge Autoplay requirement: DOM muted property MUST be true!
      videoElement.muted = true;
      videoElement.defaultMuted = true;
      videoElement.playsInline = true;
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('muted', '');

      if (videoElement.srcObject !== streamRef.current) {
        videoElement.srcObject = streamRef.current;
      }

      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Will re-attempt when metadata is loaded
        });
      }

      videoElement.onloadedmetadata = () => {
        videoElement.play().catch(() => {});
      };
    } catch {}
  }, []);

  const initCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // If a valid live stream is already active, reuse it
      if (
        streamRef.current &&
        streamRef.current.active &&
        streamRef.current.getVideoTracks().some((t) => t.readyState === 'live')
      ) {
        setCameraActive(true);
        if (gateVideoRef.current) attachStreamToVideo(gateVideoRef.current);
        if (desktopVideoRef.current) attachStreamToVideo(desktopVideoRef.current);
        if (mobileVideoRef.current) attachStreamToVideo(mobileVideoRef.current);
        return streamRef.current;
      }

      // Request fresh camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      // Attach to any currently mounted video element
      if (gateVideoRef.current) attachStreamToVideo(gateVideoRef.current);
      if (desktopVideoRef.current) attachStreamToVideo(desktopVideoRef.current);
      if (mobileVideoRef.current) attachStreamToVideo(mobileVideoRef.current);

      return stream;
    } catch (err) {
      const msg = 'Camera access is required for proctoring. Please allow camera permissions in your browser.';
      setCameraError(msg);
      toast.error(msg);
      return null;
    }
  }, [attachStreamToVideo]);

  // Load Exam
  useEffect(() => {
    async function loadExam() {
      try {
        setLoading(true);
        const res = await getExamById(examId);
        const examDoc = res.data?.exam;
        setExam(examDoc);

        if (res.data?.mySubmission && res.data.mySubmission.status !== 'in_progress') {
          setFinalResult(res.data.mySubmission);
          setPhase(res.data.mySubmission.status === 'terminated' ? 'terminated' : 'submitted');
          setLoading(false);
          return;
        }

        setTimeRemaining((examDoc.duration || 30) * 60);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to initialize exam session.');
        navigate('/exams');
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [examId, navigate]);

  // Manage camera for Gate phase
  useEffect(() => {
    if (phase === 'gate') {
      initCamera();
    }
  }, [phase, initCamera]);

  // When phase becomes 'submitted' or 'terminated', instantly stop camera hardware!
  useEffect(() => {
    if (phase === 'submitted' || phase === 'terminated') {
      stopCamera();
    }
  }, [phase, stopCamera]);

  // Cleanup camera on component unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopCamera();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopCamera();
    };
  }, [stopCamera]);

  // When phase transitions to 'testing', attach stream to visible video elements
  useEffect(() => {
    if (phase === 'testing') {
      if (streamRef.current && streamRef.current.active) {
        if (desktopVideoRef.current) attachStreamToVideo(desktopVideoRef.current);
        if (mobileVideoRef.current) attachStreamToVideo(mobileVideoRef.current);
      } else {
        initCamera().then(() => {
          if (desktopVideoRef.current) attachStreamToVideo(desktopVideoRef.current);
          if (mobileVideoRef.current) attachStreamToVideo(mobileVideoRef.current);
        });
      }
    }
  }, [phase, attachStreamToVideo, initCamera]);

  // Load COCO-SSD Object Detection Model
  useEffect(() => {
    let isMounted = true;
    async function loadCocoModel() {
      try {
        setAiModelLoading(true);
        const [tf, cocoSsd] = await Promise.all([
          import('@tensorflow/tfjs'),
          import('@tensorflow-models/coco-ssd'),
        ]);

        await tf.ready();
        const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (isMounted) {
          cocoModelRef.current = model;
          setAiModelReady(true);
        }
      } catch (err) {
        console.warn('AI Proctoring model load notice:', err);
      } finally {
        if (isMounted) setAiModelLoading(false);
      }
    }

    loadCocoModel();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // FORCE TERMINATE EXAM (CHEATING VIOLATION)
  // ─────────────────────────────────────────────────────────────────────────

  const handleTerminateViolation = useCallback(
    async (reason, telemetry = {}) => {
      if (phaseRef.current === 'terminated' || phaseRef.current === 'submitted') return;

      playAlertBeep(true);
      setPhase('terminated');
      stopCamera(); // Turn off camera instantly

      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        const res = await terminateExam(examId, {
          reason,
          tabSwitchCount: telemetry.tabSwitches || tabSwitchesRef.current,
          phoneDetectionCount: telemetry.phoneWarnings || phoneWarningsRef.current,
          violations: violationsRef.current,
          timeSpentSeconds: secondsElapsed,
        });

        setFinalResult(res.data?.submission || { score: 0, passed: false, status: 'terminated' });
        toast.error(reason, { duration: 6000 });
      } catch (err) {
        setFinalResult({
          score: 0,
          passed: false,
          status: 'terminated',
          terminationReason: reason,
        });
      }
    },
    [examId, secondsElapsed, stopCamera]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB SWITCH & WINDOW BLUR LISTENER (Max 5 switches)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'testing') return;

    const recordTabViolation = (details) => {
      const now = Date.now();
      if (now - lastTabViolationTimeRef.current < 1500) return;
      lastTabViolationTimeRef.current = now;

      tabSwitchesRef.current += 1;
      const count = tabSwitchesRef.current;
      setTabSwitchCount(count);

      const viol = {
        type: 'tab_switch',
        warningNumber: count,
        details,
        timestamp: new Date(),
      };
      violationsRef.current.push(viol);
      setViolations([...violationsRef.current]);

      if (count > 5) {
        handleTerminateViolation(
          'Terminated: Exceeded maximum allowed tab switches (5 switches)',
          { tabSwitches: count }
        );
      } else {
        playAlertBeep(false);
        setWarningModal({
          open: true,
          type: 'tab_switch',
          title: `Security Warning #${count} of 5: Tab Switch Detected`,
          message: `You navigated away or minimized your exam window. Tab switches are strictly tracked. You have ${5 - count} warnings remaining before your exam is automatically terminated with 0 marks!`,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordTabViolation('Tab switched or browser minimized');
      }
    };

    const handleWindowBlur = () => {
      recordTabViolation('Window lost focus / application switched');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && phaseRef.current === 'testing') {
        recordTabViolation('Exited fullscreen mode');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [phase, handleTerminateViolation]);

  // Helper to get currently visible active video element for TensorFlow detection
  const getVisibleVideo = useCallback(() => {
    // 1. Try desktop video if visible
    if (
      desktopVideoRef.current &&
      desktopVideoRef.current.offsetParent !== null &&
      desktopVideoRef.current.readyState >= 2
    ) {
      return desktopVideoRef.current;
    }
    // 2. Try mobile video if visible
    if (
      mobileVideoRef.current &&
      mobileVideoRef.current.offsetParent !== null &&
      mobileVideoRef.current.readyState >= 2
    ) {
      return mobileVideoRef.current;
    }
    // 3. Fallback to whichever is ready
    if (desktopVideoRef.current?.readyState >= 2) return desktopVideoRef.current;
    if (mobileVideoRef.current?.readyState >= 2) return mobileVideoRef.current;
    return desktopVideoRef.current || mobileVideoRef.current;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // AI CAMERA PROCTORING LOOP (Mobile Phone Detection, Max 2 Warnings)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'testing' || !cameraActive) return;

    let scanTimer = null;
    let isScanning = false;

    const scanFrame = async () => {
      if (isScanning || !cocoModelRef.current) return;
      const video = getVisibleVideo();
      if (!video) return;

      // Ensure video is actively playing frames
      if (video.readyState < 2 || video.paused || video.ended) {
        if (video.paused && streamRef.current?.active) {
          video.play().catch(() => {});
        }
        return;
      }

      isScanning = true;
      try {
        const predictions = await cocoModelRef.current.detect(video);
        const phone = predictions.find(
          (p) =>
            (p.class === 'cell phone' || p.class === 'remote' || p.class === 'telephone') &&
            p.score >= 0.28
        );

        if (phone) {
          setPhoneDetectedLive(true);
          const now = Date.now();
          if (now - lastPhoneViolationTimeRef.current > 3000) {
            lastPhoneViolationTimeRef.current = now;
            phoneWarningsRef.current += 1;
            const count = phoneWarningsRef.current;
            setPhoneDetectionCount(count);

            const viol = {
              type: 'phone_detected',
              warningNumber: count,
              details: `Mobile device detected in camera frame (Confidence: ${Math.round(phone.score * 100)}%)`,
              timestamp: new Date(),
            };
            violationsRef.current.push(viol);
            setViolations([...violationsRef.current]);

            if (count > 2) {
              handleTerminateViolation(
                'Terminated: Unauthorized mobile phone detected by AI proctoring',
                { phoneWarnings: count }
              );
            } else {
              playAlertBeep(false);
              setWarningModal({
                open: true,
                type: 'phone',
                title: `Security Warning #${count} of 2: Mobile Phone Detected!`,
                message: `The AI proctor detected a mobile phone in your camera frame. Mobile phones are strictly prohibited during the exam. You have ${2 - count} warning(s) remaining before immediate termination with 0 marks!`,
              });
            }
          }
        } else {
          setPhoneDetectedLive(false);
        }
      } catch (err) {
        // Fallback gracefully if frame grab hiccups
      } finally {
        isScanning = false;
      }
    };

    // Scan frame every 800ms
    scanTimer = setInterval(scanFrame, 800);

    return () => {
      if (scanTimer) clearInterval(scanTimer);
    };
  }, [phase, cameraActive, getVisibleVideo, handleTerminateViolation]);

  // Countdown Timer
  useEffect(() => {
    if (phase !== 'testing') return;

    const timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // Start Exam
  const handleStartExam = async () => {
    if (!agreedToRules) {
      toast.error('You must read and check the agreement to the examination rules.');
      return;
    }

    if (!cameraActive || !streamRef.current?.active) {
      const stream = await initCamera();
      if (!stream) {
        toast.error('Active camera connection is mandatory for this proctored examination.');
        return;
      }
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }

      await startExam(examId);
      setPhase('testing');
      toast.success('Exam started. Anti-cheating proctoring active.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start exam session.');
    }
  };

  // Submit Exam (Camera turned off immediately)
  const handleFinalSubmit = async (isAuto = false) => {
    if (isSubmitting || phase === 'submitted' || phase === 'terminated') return;
    setIsSubmitting(true);
    setConfirmSubmitOpen(false);

    // Turn off camera INSTANTLY upon submit click
    stopCamera();

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      const formattedAnswers = Object.entries(answers).map(([qIdx, optIdx]) => ({
        questionIndex: parseInt(qIdx, 10),
        selectedOptionIndex: optIdx,
      }));

      const res = await submitExam(examId, {
        answers: formattedAnswers,
        timeSpentSeconds: secondsElapsed,
        tabSwitchCount: tabSwitchesRef.current,
        phoneDetectionCount: phoneWarningsRef.current,
        violations: violationsRef.current,
      });

      setFinalResult(res.data?.submission);
      setPhase('submitted');
      toast.success(isAuto ? 'Time expired. Exam submitted automatically!' : 'Exam submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOption = (optIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optIndex,
    }));
  };

  const handleClearAnswer = () => {
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[currentQuestionIndex];
      return updated;
    });
  };

  const toggleReview = () => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestionIndex)) next.delete(currentQuestionIndex);
      else next.add(currentQuestionIndex);
      return next;
    });
  };

  // Test simulation trigger
  const simulatePhoneDetection = () => {
    setPhoneDetectedLive(true);
    phoneWarningsRef.current += 1;
    const count = phoneWarningsRef.current;
    setPhoneDetectionCount(count);
    if (count > 2) {
      handleTerminateViolation(
        'Terminated: Unauthorized mobile phone detected by AI proctoring',
        { phoneWarnings: count }
      );
    } else {
      playAlertBeep(false);
      setWarningModal({
        open: true,
        type: 'phone',
        title: `Security Warning #${count} of 2: Mobile Phone Detected!`,
        message: `The AI proctor detected a mobile phone in camera frame. You have ${2 - count} warning(s) remaining!`,
      });
    }
    setTimeout(() => setPhoneDetectedLive(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Skeleton className="h-96 w-full max-w-2xl rounded-3xl" />
      </div>
    );
  }

  if (!exam) return null;

  const questions = exam.questions || [];
  const currentQ = questions[currentQuestionIndex];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTimeCritical = timeRemaining <= 300 && timeRemaining > 0;

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 1: PRE-EXAM VERIFICATION GATE
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'gate') {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-6 px-4 animate-fade-in">
        <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-200">
            <FileCheck className="h-4 w-4 text-cyan-400" />
            <span>Proctored Assessment Gate</span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white">{exam.title}</h1>
          <p className="mt-1 text-xs sm:text-sm text-cyan-200/90">{exam.description || 'Strict AI-proctored examination.'}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-xl border border-cyan-400/20 bg-cyan-950/50 px-3 py-1 font-semibold text-cyan-300">
              ⏱ {exam.duration} Minutes
            </span>
            <span className="rounded-xl border border-cyan-400/20 bg-cyan-950/50 px-3 py-1 font-semibold text-cyan-300">
              📝 {totalQ} Questions ({totalQ} Marks)
            </span>
            <span className="rounded-xl border border-cyan-400/20 bg-cyan-950/50 px-3 py-1 font-semibold text-cyan-300">
              🎯 {exam.passPercentage}% Passing Score
            </span>
          </div>
        </div>

        {/* Regulations Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2 text-rose-500 font-extrabold text-sm">
            <ShieldAlert className="h-5 w-5" />
            <span>Strict Anti-Cheating & Proctoring Regulations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1 text-amber-900 dark:text-amber-200">
              <p className="font-extrabold flex items-center gap-1.5">
                <Maximize2 className="h-4 w-4" /> Fullscreen & Tab Switch Limit
              </p>
              <p className="opacity-90 leading-relaxed">
                Maximum <strong>5 tab switches</strong> allowed on laptop and mobile. Exceeding 5 switches triggers <strong>instant termination with 0 marks</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1 text-rose-900 dark:text-rose-200">
              <p className="font-extrabold flex items-center gap-1.5">
                <Smartphone className="h-4 w-4" /> AI Webcam Phone Detector
              </p>
              <p className="opacity-90 leading-relaxed">
                Webcam must stay active. Using a <strong>mobile phone</strong> gives <strong>only 2 warnings</strong>. On the 3rd detection, the exam terminates immediately with <strong>0 marks</strong>.
              </p>
            </div>
          </div>

          {/* Live Camera Preview */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Webcam Verification Check:
            </label>
            <div className="relative mx-auto flex h-56 w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-cyan-500/40 bg-slate-950 shadow-inner">
              <video
                ref={(el) => {
                  gateVideoRef.current = el;
                  if (el) attachStreamToVideo(el);
                }}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
                className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && (
                <div className="p-4 text-center text-xs text-slate-400 space-y-2">
                  <CameraOff className="mx-auto h-8 w-8 text-rose-400" />
                  <p>{cameraError || 'Requesting camera access...'}</p>
                  <button
                    onClick={initCamera}
                    className="rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                  >
                    Grant Permission
                  </button>
                </div>
              )}
              {cameraActive && (
                <span className="absolute bottom-2 left-2 rounded-full bg-emerald-500/80 px-2.5 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
                  ● Camera Connected
                </span>
              )}
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToRules}
                onChange={(e) => setAgreedToRules(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                I agree to stay in fullscreen mode, keep my camera visible, and understand that exceeding 5 tab switches or 2 phone warnings will terminate my exam with a FAIL (0 marks).
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              to="/exams"
              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to Exam Hub
            </Link>

            <button
              onClick={handleStartExam}
              disabled={!agreedToRules || !cameraActive}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-cyan-600/30 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Enter Fullscreen & Begin Exam</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 2: FINAL RESULTS (SUBMITTED OR TERMINATED)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'submitted' || phase === 'terminated') {
    const isTerm = phase === 'terminated' || finalResult?.status === 'terminated';
    const score = finalResult?.score || 0;
    const maxScore = finalResult?.totalMarks || exam.totalMarks || totalQ;
    const percentage = finalResult?.percentage || 0;
    const isPassed = finalResult?.passed || false;

    return (
      <div className="mx-auto max-w-2xl py-12 px-4 animate-scale-in">
        <div
          className={`overflow-hidden rounded-3xl border bg-white p-6 sm:p-8 text-center shadow-2xl dark:bg-slate-900 ${
            isTerm
              ? 'border-rose-500/50 shadow-rose-950/20'
              : isPassed
              ? 'border-emerald-500/50 shadow-emerald-950/20'
              : 'border-amber-500/50 shadow-amber-950/20'
          }`}
        >
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl text-3xl shadow-xl ${
              isTerm
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : isPassed
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-rose-500 text-white shadow-rose-500/30'
            }`}
          >
            {isTerm ? '🚨' : isPassed ? '🏆' : '❌'}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isTerm
              ? 'Exam Terminated: Security Violation'
              : isPassed
              ? 'Congratulations! You Passed!'
              : 'Assessment Completed'}
          </h2>

          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isTerm
              ? finalResult?.terminationReason || 'Terminated by anti-cheating proctoring system'
              : isPassed
              ? `Great job! You met the passing criteria of ${exam.passPercentage}%.`
              : `You did not meet the passing criteria of ${exam.passPercentage}%.`}
          </p>

          <div className="my-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/60 max-w-sm mx-auto space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Marks Awarded</p>
            <p className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
              {score} <span className="text-2xl text-slate-400 font-semibold">/ {maxScore}</span>
            </p>
            <div className="pt-2">
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold ${
                  isTerm
                    ? 'bg-rose-500/15 text-rose-600'
                    : isPassed
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : 'bg-rose-500/15 text-rose-600'
                }`}
              >
                {isTerm ? 'FAILED (0%)' : `${percentage}% • ${isPassed ? 'PASSED' : 'FAILED'}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs max-w-md mx-auto mb-6 text-slate-600 dark:text-slate-300">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
              <span className="text-slate-400 block text-[10px]">Time Spent</span>
              <strong className="text-slate-900 dark:text-white font-bold">
                {Math.floor(secondsElapsed / 60)}m {secondsElapsed % 60}s
              </strong>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
              <span className="text-slate-400 block text-[10px]">Tab Switches</span>
              <strong className={`font-bold ${tabSwitchCount > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {tabSwitchCount} / 5
              </strong>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/40 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block text-[10px]">Phone Warnings</span>
              <strong className={`font-bold ${phoneDetectionCount > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {phoneDetectionCount} / 2
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/exams"
              className="rounded-2xl bg-cyan-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-cyan-700 transition-colors shadow-sm"
            >
              Return to Exams Hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN 3: ACTIVE PROCTORED EXAM ENVIRONMENT (FULLY RESPONSIVE)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-hidden select-none">
      {/* Header */}
      <header className="flex h-14 sm:h-16 flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 font-black">
            <FileCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-base font-black text-white truncate max-w-[120px] sm:max-w-xs md:max-w-md">
              {exam.title}
            </h2>
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-cyan-400">
              <span>{exam.category || 'Assessment'}</span>
              <span>•</span>
              <span>1 Mark per Question</span>
            </div>
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 rounded-2xl border px-3 sm:px-4 py-1 font-mono text-xs sm:text-base font-black transition-all ${
            isTimeCritical
              ? 'border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse'
              : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-200'
          }`}
        >
          <Clock className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isTimeCritical ? 'text-rose-400' : 'text-cyan-400'}`} />
          <span>{formattedTimer}</span>
        </div>

        {/* Right Badges & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Desktop Badges (hidden on small screen to save space, shown in proctor strip) */}
          <div
            className={`hidden md:flex items-center gap-1 rounded-xl border px-2 py-1 text-xs font-bold ${
              tabSwitchCount === 0
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : tabSwitchCount <= 3
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-rose-500/50 bg-rose-500/20 text-rose-300 animate-pulse'
            }`}
            title="Maximum 5 tab switches allowed"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Switches: {tabSwitchCount}/5</span>
          </div>

          <div
            className={`hidden md:flex items-center gap-1 rounded-xl border px-2 py-1 text-xs font-bold ${
              phoneDetectionCount === 0
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/50 bg-rose-500/20 text-rose-300 animate-pulse'
            }`}
            title="Maximum 2 phone warnings allowed"
          >
            <Smartphone className="h-3 w-3" />
            <span>Phone: {phoneDetectionCount}/2</span>
          </div>

          {/* Submit Exam Button */}
          <button
            onClick={() => setConfirmSubmitOpen(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Submit Exam</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </header>

      {/* ── MOBILE & TABLET PROCTOR STRIP (Visible only on < lg) ── */}
      <div className="lg:hidden flex-shrink-0 border-b border-slate-800 bg-slate-900/95 px-3 py-2 flex items-center justify-between gap-3 shadow-sm">
        {/* Mobile Camera Video Thumbnail */}
        <div className="flex items-center gap-2.5">
          <div
            className={`relative h-12 w-16 sm:h-14 sm:w-20 overflow-hidden rounded-xl border bg-black flex-shrink-0 shadow-inner ${
              phoneDetectedLive
                ? 'border-rose-500 ring-2 ring-rose-500 animate-pulse'
                : 'border-cyan-500/50'
            }`}
          >
            <video
              ref={(el) => {
                mobileVideoRef.current = el;
                if (el) attachStreamToVideo(el);
              }}
              autoPlay
              playsInline
              muted
              style={{ transform: 'scaleX(-1)' }}
              className="h-full w-full object-cover"
            />
            {phoneDetectedLive && (
              <div className="absolute inset-0 bg-rose-500/30 flex items-center justify-center">
                <span className="rounded bg-rose-600 px-1 py-0.5 text-[8px] font-black text-white animate-bounce">
                  PHONE!
                </span>
              </div>
            )}
          </div>

          <div className="text-[10px] space-y-0.5">
            <div className="flex items-center gap-1 font-bold text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI Proctor Live</span>
            </div>
            <div className="text-slate-400 font-semibold flex items-center gap-2">
              <span>
                Switches:{' '}
                <strong className={tabSwitchCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {tabSwitchCount}/5
                </strong>
              </span>
              <span>•</span>
              <span>
                Phone:{' '}
                <strong className={phoneDetectionCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {phoneDetectionCount}/2
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Palette Button */}
        <button
          type="button"
          onClick={() => setMobilePaletteOpen(true)}
          className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer shadow-sm"
        >
          <Grid className="h-3.5 w-3.5 text-cyan-400" />
          <span>{answeredCount}/{totalQ}</span>
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left / Center: Question Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-between">
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-6">
            {/* Question Counter Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-cyan-500/20 px-3 py-1 text-xs font-black text-cyan-300 border border-cyan-400/30">
                  Question {currentQuestionIndex + 1} of {totalQ}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400 font-semibold">
                  (Single Choice • 1 Mark)
                </span>
              </div>

              <button
                onClick={toggleReview}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  markedForReview.has(currentQuestionIndex)
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {markedForReview.has(currentQuestionIndex) ? 'Marked for Review' : 'Mark for Review'}
                </span>
                <span className="sm:hidden">Review</span>
              </button>
            </div>

            {/* Question Prompt */}
            <div className="space-y-3">
              <h3 className="text-sm sm:text-lg font-bold text-white leading-relaxed">
                {currentQ?.questionText}
              </h3>

              {currentQ?.codeSnippet && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:p-4 font-mono text-xs text-cyan-300 overflow-x-auto shadow-inner">
                  <pre>{currentQ.codeSnippet}</pre>
                </div>
              )}
            </div>

            {/* MCQ Options */}
            <div className="space-y-3 pt-1">
              {currentQ?.options?.map((optionText, optIdx) => {
                const isSelected = answers[currentQuestionIndex] === optIdx;
                const letter = String.fromCharCode(65 + optIdx);

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left flex items-center gap-3 sm:gap-4 rounded-2xl border p-3.5 sm:p-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/60 text-white shadow-lg shadow-cyan-500/10'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {letter}
                    </div>
                    <span className="flex-1 leading-relaxed">{optionText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="max-w-3xl mx-auto w-full flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
            <div className="flex items-center gap-2">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((c) => c - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 sm:px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <button
                disabled={currentQuestionIndex === totalQ - 1}
                onClick={() => setCurrentQuestionIndex((c) => c + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 sm:px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {answers[currentQuestionIndex] !== undefined && (
              <button
                onClick={handleClearAnswer}
                className="text-xs text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>
        </main>

        {/* Right Desktop Sidebar (Visible on >= lg) */}
        <aside className="hidden lg:flex w-80 flex-shrink-0 flex-col border-l border-slate-800 bg-slate-900/90 p-4 space-y-4 overflow-y-auto">
          {/* Live Proctored Camera Preview Box */}
          <div
            className={`rounded-2xl border bg-slate-950 p-2.5 space-y-2 shadow-inner transition-all ${
              phoneDetectedLive
                ? 'border-rose-500 shadow-rose-500/20 ring-2 ring-rose-500'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                AI Proctor Active
              </span>
              <span className="text-[10px] text-slate-500">
                {aiModelReady ? 'Phone Detector Live' : aiModelLoading ? 'Loading AI Model...' : 'Ready'}
              </span>
            </div>

            <div className="relative h-44 w-full overflow-hidden rounded-xl border border-slate-800 bg-black">
              <video
                ref={(el) => {
                  desktopVideoRef.current = el;
                  if (el) attachStreamToVideo(el);
                }}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
                className="h-full w-full object-cover"
              />
              {phoneDetectedLive && (
                <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center border-2 border-rose-500">
                  <span className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-black text-white shadow-lg animate-bounce">
                    ⚠️ PHONE DETECTED
                  </span>
                </div>
              )}
            </div>

            {/* Test Simulation trigger */}
            <div className="pt-1">
              <button
                type="button"
                onClick={simulatePhoneDetection}
                className="w-full text-center text-[10px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                title="Simulates camera detecting a mobile device for verification"
              >
                [Test: Simulate Phone Detection]
              </button>
            </div>
          </div>

          {/* Telemetry Status Box */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <p className="text-slate-500 font-medium text-[10px]">Tab Switches</p>
              <p className={`font-black text-sm ${tabSwitchCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {tabSwitchCount} / 5 Max
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
              <p className="text-slate-500 font-medium text-[10px]">Phone Flags</p>
              <p className={`font-black text-sm ${phoneDetectionCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {phoneDetectionCount} / 2 Max
              </p>
            </div>
          </div>

          {/* Question Palette Grid */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Question Palette</span>
              <span>{answeredCount} / {totalQ} Solved</span>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-1">
              {questions.map((_, qIdx) => {
                const isCurrent = qIdx === currentQuestionIndex;
                const isAnswered = answers[qIdx] !== undefined;
                const isReviewed = markedForReview.has(qIdx);

                let bgClass = 'bg-slate-800 text-slate-400 hover:bg-slate-700';
                if (isReviewed) bgClass = 'bg-purple-600 text-white font-black';
                else if (isAnswered) bgClass = 'bg-emerald-600 text-white font-black';

                return (
                  <button
                    key={qIdx}
                    onClick={() => setCurrentQuestionIndex(qIdx)}
                    className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${bgClass} ${
                      isCurrent ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105' : ''
                    }`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-800 text-[10px] space-y-1 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                <span>Marked for Review ({markedForReview.size})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                <span>Unattempted ({totalQ - answeredCount})</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── MOBILE PALETTE BOTTOM SHEET MODAL ── */}
      {mobilePaletteOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm lg:hidden animate-fade-in">
          <div className="rounded-t-3xl border-t border-slate-700 bg-slate-900 p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-white">Question Navigation</h3>
              <button
                onClick={() => setMobilePaletteOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((_, qIdx) => {
                const isCurrent = qIdx === currentQuestionIndex;
                const isAnswered = answers[qIdx] !== undefined;
                const isReviewed = markedForReview.has(qIdx);

                let bgClass = 'bg-slate-800 text-slate-300';
                if (isReviewed) bgClass = 'bg-purple-600 text-white font-bold';
                else if (isAnswered) bgClass = 'bg-emerald-600 text-white font-bold';

                return (
                  <button
                    key={qIdx}
                    onClick={() => {
                      setCurrentQuestionIndex(qIdx);
                      setMobilePaletteOpen(false);
                    }}
                    className={`h-11 rounded-xl text-xs font-black transition-all cursor-pointer ${bgClass} ${
                      isCurrent ? 'ring-2 ring-cyan-400' : ''
                    }`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SECURITY VIOLATION WARNING MODAL ── */}
      <Modal
        isOpen={warningModal.open}
        onClose={() => setWarningModal({ ...warningModal, open: false })}
        title={warningModal.title}
        size="md"
      >
        <div className="space-y-4 text-center p-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
            {warningModal.message}
          </p>
          <div className="pt-2">
            <button
              onClick={() => setWarningModal({ ...warningModal, open: false })}
              className="w-full rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-700 cursor-pointer"
            >
              I Understand & Resume Exam
            </button>
          </div>
        </div>
      </Modal>

      {/* ── SUBMISSION CONFIRMATION MODAL ── */}
      <Modal
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="Submit Examination"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to finish and submit your examination? Once submitted, your camera will turn off immediately and your score will be computed.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 block text-[11px]">Answered</span>
              <strong className="text-emerald-600 text-lg font-black">{answeredCount}</strong>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400 block text-[11px]">Unanswered</span>
              <strong className="text-rose-500 text-lg font-black">{totalQ - answeredCount}</strong>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setConfirmSubmitOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
            >
              Continue Testing
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFinalSubmit(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Finalizing...' : 'Yes, Submit Final Exam'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
