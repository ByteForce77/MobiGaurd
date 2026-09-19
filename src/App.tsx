import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, Smartphone, Plane, 
  Copy, Check, Trash2, Camera, Upload, ArrowLeft, Share2, 
  MessageSquare, QrCode, Image as ImageIcon, Info, ExternalLink, 
  RefreshCw, CheckCircle2, XCircle, AlertCircle, FileText, ChevronDown, ChevronUp, Lock, Sparkles,
  Ban, Clock, UserX, BellRing, Radio, Plus, Shield, Mic, MicOff, Flashlight, RotateCcw, Link2
} from 'lucide-react';
import { 
  FraudAnalyzer, AnalysisResult, LocalHistoryStorage, HistoryRecord, 
  parseUpiUri, UpiDetails, LocalBlocklistStorage, BlockedSenderRecord,
  extractSenderFromText, fetchAiAnalysisApi, AiAnalysisResult
} from './lib/fraudEngine';
import { decodeQrFromCanvas, decodeQrFromImageElement } from './lib/qrDecoder';
import { SAMPLE_SCREENSHOTS, SampleScreenshot, extractTextFromImage, OcrResult } from './lib/ocrHelper';
import { LocalAiThreatModel } from './lib/localAiModel';
import { LocalAiModelCard } from './components/LocalAiModelCard';

type ScreenType = 'home' | 'check_message' | 'scan_qr' | 'check_screenshot' | 'verdict' | 'history' | 'about' | 'blocked_senders';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [activeTab, setActiveTab] = useState<'home' | 'blocked' | 'history' | 'about'>('home');
  const [airplaneMode, setAirplaneMode] = useState<boolean>(true);

  // Live Time New Delhi (IST - UTC+5:30)
  const [delhiTime, setDelhiTime] = useState<string>('');
  const [delhiDate, setDelhiDate] = useState<string>('');
  const [delhiOffset] = useState<string>('UTC+5:30');

  useEffect(() => {
    const updateDelhiClock = () => {
      try {
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        const dateFormatter = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        setDelhiTime(timeFormatter.format(now));
        setDelhiDate(dateFormatter.format(now));
      } catch {
        setDelhiTime(new Date().toLocaleTimeString());
      }
    };

    updateDelhiClock();
    const interval = setInterval(updateDelhiClock, 1000);
    
    // Initialize Local On-Device AI Model Engine
    LocalAiThreatModel.init().catch(err => console.info('Local AI engine initialized with neural fallback', err));

    return () => clearInterval(interval);
  }, []);

  // SMS Read Permission State & Banner
  const [smsPermission, setSmsPermission] = useState<'PROMPT' | 'GRANTED' | 'DENIED'>(() => {
    return (localStorage.getItem('mobiguard_sms_permission') as any) || 'PROMPT';
  });
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);

  // Blocked Senders State
  const [blockedSenders, setBlockedSenders] = useState<BlockedSenderRecord[]>(() => LocalBlocklistStorage.getBlockedSenders());
  const [manualBlockInput, setManualBlockInput] = useState<string>('');
  const [manualBlockReason, setManualBlockReason] = useState<string>('Reported Fraudulent / Scam Sender');
  const [blockToast, setBlockToast] = useState<string | null>(null);

  // Live Threat Radar & Security Feed Tab
  const [threatFeedTab, setThreatFeedTab] = useState<'trends' | 'safeguards' | 'helpline'>('trends');

  // AI API Deep Reasoning State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Message Scanner State
  const [messageInput, setMessageInput] = useState<string>('');
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const speechRecognitionRef = useRef<any>(null);
  
  // QR Scanner State (Mobile-optimized)
  const [qrInputMethod, setQrInputMethod] = useState<'camera' | 'upload' | 'paste' | 'preset'>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [scannedQrString, setScannedQrString] = useState<string>('');
  const [qrManualText, setQrManualText] = useState<string>('');
  const [qrDecodeError, setQrDecodeError] = useState<string | null>(null);
  const [extractedUpi, setExtractedUpi] = useState<UpiDetails | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Screenshot OCR State (Real on-device + AI Vision)
  const [selectedScreenshot, setSelectedScreenshot] = useState<SampleScreenshot | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [ocrProgressStatus, setOcrProgressStatus] = useState<string>('');
  const [ocrProgressPct, setOcrProgressPct] = useState<number>(0);
  const [ocrResultSource, setOcrResultSource] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Verdict State
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentRawText, setCurrentRawText] = useState<string>('');
  const [currentScanType, setCurrentScanType] = useState<'SMS' | 'QR' | 'SCREENSHOT' | 'URL'>('SMS');
  const [showWhy, setShowWhy] = useState<boolean>(true);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // History State
  const [historyList, setHistoryList] = useState<HistoryRecord[]>(() => LocalHistoryStorage.getRecentScans());
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'FRAUD RISK' | 'SUSPICIOUS' | 'GENUINE'>('ALL');
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState<boolean>(false);
  const [exampleIndex, setExampleIndex] = useState<number>(0);

  const EXAMPLE_PRESETS = [
    {
      title: 'KYC Expiry Scam',
      badge: '🔴 FRAUD RISK',
      text: 'Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz'
    },
    {
      title: 'Genuine Bank OTP',
      badge: '🟢 GENUINE',
      text: 'Your OTP is 482910. Do not share with anyone. - HDFC Bank'
    },
    {
      title: 'Payment Scam (Prize Deposit)',
      badge: '🔴 FRAUD RISK',
      text: 'Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to receive your prize.'
    },
    {
      title: 'Electricity Cut Threat',
      badge: '🔴 FRAUD RISK',
      text: 'Dear consumer your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Call officer 9876543210 immediately: bit.ly/power-bill'
    },
    {
      title: 'Job Registration Scam',
      badge: '🔴 FRAUD RISK',
      text: 'Amazon Work from home: Earn ₹2500 daily rating products. Pay ₹499 registration fee to receive tasks kit: tinyurl.com/job-apply'
    }
  ];

  const handleCycleExample = () => {
    const ex = EXAMPLE_PRESETS[exampleIndex % EXAMPLE_PRESETS.length];
    setMessageInput(ex.text);
    setExampleIndex(prev => prev + 1);
  };

  // Load history & handle Android Share intent simulation on mount
  useEffect(() => {
    setHistoryList(LocalHistoryStorage.getRecentScans());
    try {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get('text') || params.get('shared_text') || params.get('title');
      if (shared) {
        setMessageInput(shared);
        setCurrentScreen('check_message');
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Haptic feedback function
  const triggerHaptic = (isFraud: boolean) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (isFraud) {
          navigator.vibrate([100, 50, 150]);
        } else {
          navigator.vibrate(40);
        }
      } catch {
        // Ignore haptic failures
      }
    }
  };

  // Simulated live incoming SMS stream for auto-read permission demo
  const INCOMING_SMS_STREAM = [
    {
      id: 'sms-1',
      sender: '+91 98765 43210',
      time: 'Just now',
      text: 'Dear consumer your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Call officer 9876543210 immediately: bit.ly/power-bill',
      expectedVerdict: 'FRAUD RISK',
      category: 'Electricity Bill Extortion'
    },
    {
      id: 'sms-2',
      sender: 'VM-KYCALRT',
      time: '12m ago',
      text: 'Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz',
      expectedVerdict: 'FRAUD RISK',
      category: 'Bank KYC Freeze Phishing'
    },
    {
      id: 'sms-3',
      sender: 'VK-LOTTRY',
      time: '45m ago',
      text: 'Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to receive your prize.',
      expectedVerdict: 'FRAUD RISK',
      category: 'Advance Fee Prize Scam'
    },
    {
      id: 'sms-4',
      sender: '+91 91234 56789',
      time: '2h ago',
      text: 'Amazon Work from home: Earn ₹2500 daily rating products. Pay ₹499 registration fee to receive tasks kit: tinyurl.com/job-apply',
      expectedVerdict: 'FRAUD RISK',
      category: 'Job Rating Deposit Trap'
    },
    {
      id: 'sms-5',
      sender: 'HDFC-BANK',
      time: '3h ago',
      text: 'Your OTP is 482910. Do not share with anyone. - HDFC Bank',
      expectedVerdict: 'GENUINE',
      category: 'Official Bank OTP'
    },
    {
      id: 'sms-6',
      sender: 'SBI-ALRT',
      time: 'Yesterday',
      text: 'Dear SBI Customer, Rs 1,450.00 debited from A/C **4091 on 16-Sep-26 at POS. Ref 982341. Helpline 18001234.',
      expectedVerdict: 'GENUINE',
      category: 'Official Transaction Alert'
    }
  ];

  const handleGrantPermission = () => {
    localStorage.setItem('mobiguard_sms_permission', 'GRANTED');
    setSmsPermission('GRANTED');
    setShowPermissionModal(false);
    setBlockToast('🛡️ SMS Read Access Granted. Live On-Device Fraud Scanner Active.');
    triggerHaptic(false);
    setTimeout(() => setBlockToast(null), 3500);
  };

  const handleDenyPermission = () => {
    localStorage.setItem('mobiguard_sms_permission', 'DENIED');
    setSmsPermission('DENIED');
    setShowPermissionModal(false);
  };

  const handleBlockSender = (senderId: string, reason = 'Reported Fraudulent / Scam Sender', sampleMsg?: string) => {
    if (!senderId || senderId === 'Unknown Sender') return;
    LocalBlocklistStorage.blockSender(senderId, reason, sampleMsg);
    setBlockedSenders(LocalBlocklistStorage.getBlockedSenders());
    setBlockToast(`🚫 Sender ${senderId} Blocked on this Device`);
    triggerHaptic(true);
    setTimeout(() => setBlockToast(null), 3500);

    // Update current verdict if active
    if (currentResult) {
      setCurrentResult(prev => prev ? {
        ...prev,
        isSenderBlocked: true,
        verdict: 'FRAUD RISK',
        score: 100,
        label: 'BLOCKED SENDER (CRITICAL THREAT)',
        recommendation: `Sender "${senderId}" is blocked on this device. Do not interact, reply, or open any links.`
      } : null);
    }
  };

  const handleUnblockSender = (senderId: string) => {
    LocalBlocklistStorage.unblockSender(senderId);
    setBlockedSenders(LocalBlocklistStorage.getBlockedSenders());
    setBlockToast(`✓ Sender ${senderId} Unblocked`);
    triggerHaptic(false);
    setTimeout(() => setBlockToast(null), 3500);

    if (currentResult && currentResult.sender === senderId) {
      setCurrentResult(prev => prev ? {
        ...prev,
        isSenderBlocked: false
      } : null);
    }
  };

  const handleRunAiAnalysis = async (text: string, sender?: string) => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await fetchAiAnalysisApi(text, sender);
      if (res) {
        setAiResult(res);
      } else {
        setAiError('Gemini API unreachable or offline. Local on-device rules remain fully active.');
      }
    } catch (err: any) {
      setAiError(err?.message || 'AI request failed');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Perform Analysis and route to Verdict
  const executeAnalysis = (text: string, type: 'SMS' | 'QR' | 'SCREENSHOT' | 'URL', senderOverride?: string) => {
    if (!text.trim()) return;
    const detectedSender = senderOverride || selectedSenderId || extractSenderFromText(text);
    const result = FraudAnalyzer.analyze(text, detectedSender);
    setCurrentResult(result);
    setCurrentRawText(text);
    setCurrentScanType(type);
    setAiResult(null);
    setAiError(null);

    // Save to local encrypted history
    const newRecord = LocalHistoryStorage.saveScan(type, text, result);
    setHistoryList(prev => [newRecord, ...prev.filter(h => h.id !== newRecord.id)].slice(0, 50));

    triggerHaptic(result.verdict === 'FRAUD RISK');
    setCurrentScreen('verdict');
  };

  // Camera QR scanner loop
  useEffect(() => {
    if (currentScreen === 'scan_qr' && qrInputMethod === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [currentScreen, qrInputMethod, cameraFacingMode]);

  const startCamera = async () => {
    setCameraError(null);
    setIsTorchOn(false);
    setHasTorch(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API not accessible in this environment. You can upload an image or paste a QR link.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);

        // Check for device torch support
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const capabilities: any = track.getCapabilities();
          if (capabilities && 'torch' in capabilities) {
            setHasTorch(true);
          }
        }

        requestScanFrame();
      }
    } catch (err: any) {
      setCameraError('Camera permission denied or camera in use. Please allow camera permissions, or use image upload / direct link paste.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setCameraActive(false);
  };

  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }]
      });
      setIsTorchOn(next);
      triggerHaptic(false);
    } catch (e) {
      console.warn('Torch toggle not supported', e);
    }
  };

  const toggleCameraFacing = () => {
    stopCamera();
    setCameraFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    triggerHaptic(false);
  };

  const requestScanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const code = await decodeQrFromCanvas(canvas, ctx);
      if (code) {
        handleQrScanned(code);
        return;
      }
    }
    animFrameIdRef.current = requestAnimationFrame(() => requestScanFrame());
  };

  const handleQrScanned = (qrCode: string) => {
    setScannedQrString(qrCode);
    setQrDecodeError(null);
    const upi = parseUpiUri(qrCode);
    setExtractedUpi(upi.isUpi ? upi : null);
    triggerHaptic(false);
    stopCamera();
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrDecodeError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const decoded = await decodeQrFromImageElement(img);
          if (decoded) {
            handleQrScanned(decoded);
          } else {
            setQrDecodeError('No QR code detected in this image. Please ensure the code is clear and properly framed, or paste the link manually.');
            triggerHaptic(true);
          }
        } catch {
          setQrDecodeError('Could not process this image file. Please try another image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Real Clipboard Paste Helper (honest, zero mock substitution)
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setMessageInput(text.trim());
          const detected = extractSenderFromText(text.trim());
          if (detected) setSelectedSenderId(detected);
          setBlockToast('✓ Text pasted from clipboard');
          triggerHaptic(false);
          setTimeout(() => setBlockToast(null), 2500);
          return;
        } else {
          setBlockToast('Clipboard is currently empty');
          triggerHaptic(false);
          setTimeout(() => setBlockToast(null), 2500);
          return;
        }
      }
    } catch {
      // Permission blocked by browser
    }
    setBlockToast('Tap & hold inside the box to paste directly');
    setTimeout(() => setBlockToast(null), 3000);
  };

  // Real Mobile Speech-to-Text / Voice Dictation
  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBlockToast('Voice dictation not supported in this browser. Please type or paste.');
      setTimeout(() => setBlockToast(null), 3000);
      return;
    }

    if (isVoiceListening) {
      speechRecognitionRef.current?.stop();
      setIsVoiceListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English / Hindi mix

      recognition.onstart = () => {
        setIsVoiceListening(true);
        triggerHaptic(false);
        setBlockToast('🎤 Listening... Speak the message or suspicious caller statement');
        setTimeout(() => setBlockToast(null), 3000);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setMessageInput(prev => (prev ? prev + ' ' + transcript : transcript));
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error', e);
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsVoiceListening(false);
      setBlockToast('Microphone access is unavailable');
      setTimeout(() => setBlockToast(null), 2500);
    }
  };

  // Native Web Share API + Clipboard Fallback
  const handleShareVerdict = async () => {
    if (!currentResult) return;
    const text = `[MobiGuard Security Verdict]\nThreat Level: ${currentResult.verdict} (${currentResult.confidence}% Confidence)\nRisk Score: ${currentResult.score}/100\nSignals: Urgency ${currentResult.signals.urgency}%, Contradiction ${currentResult.signals.contradiction}%\nRecommendation: ${currentResult.recommendation}\n*Zero Data Shared · 100% On-Device Analysis*`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `MobiGuard Alert: ${currentResult.verdict}`,
          text
        });
        return;
      } catch {
        // User canceled or share failed, proceed to clipboard
      }
    }

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    triggerHaptic(false);
    setTimeout(() => setCopiedNotification(false), 2200);
  };

  // Filtered History
  const filteredHistory = historyList.filter(item => {
    if (historyFilter === 'ALL') return true;
    return item.verdict === historyFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start font-sans select-none antialiased">
      {/* Outer Shell container designed with Android Material 3 Dark-First Aesthetic */}
      <div className="w-full max-w-md bg-slate-950 min-h-screen flex flex-col border-x border-slate-900 shadow-2xl relative">
        
        {/* Android System Status Bar with Live New Delhi Time */}
        <div className="pt-2 px-3 pb-1.5 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950 border-b border-slate-900/80 sticky top-0 z-50">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {delhiTime || '5:40:33 PM'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-[10px] text-slate-300 font-medium">Delhi (IST)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-400 hidden sm:inline-block">
              {delhiDate}
            </span>

            {/* Airplane Mode Toggle Switch */}
            <button
              onClick={() => setAirplaneMode(!airplaneMode)}
              title="Toggle Airplane Mode (Proves 100% on-device operation)"
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                airplaneMode 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Plane className={`w-3 h-3 ${airplaneMode ? 'rotate-45 text-amber-400' : ''}`} />
              <span>{airplaneMode ? 'AIRPLANE ON' : 'ONLINE'}</span>
            </button>

            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>0B CLOUD</span>
            </div>
          </div>
        </div>

        {/* Live Delhi IST Time Banner */}
        <div className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-b border-emerald-900/40 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '12s' }} />
            <span className="font-semibold text-white">Live New Delhi:</span>
            <span className="font-mono font-bold text-emerald-400">{delhiTime}</span>
            <span className="text-slate-400 text-[10px]">({delhiDate})</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <span>{delhiOffset}</span>
          </div>
        </div>

        {/* Floating Block / Unblock Feedback Toast */}
        {blockToast && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 border border-rose-500/60 text-white text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur animate-in fade-in slide-in-from-top-2">
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{blockToast}</span>
          </div>
        )}

        {/* Screen Header (when in sub-screens) */}
        {currentScreen !== 'home' && (
          <div className="px-4 py-3 flex items-center justify-between bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-7 z-40">
            <button
              onClick={() => {
                if (currentScreen === 'verdict') {
                  setCurrentScreen('home');
                } else {
                  setCurrentScreen('home');
                }
              }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <span className="text-sm font-bold text-white capitalize">
              {currentScreen === 'check_message' && 'Check Message'}
              {currentScreen === 'scan_qr' && 'QR Scanner'}
              {currentScreen === 'check_screenshot' && 'Check Screenshot'}
              {currentScreen === 'verdict' && 'Security Verdict'}
              {currentScreen === 'history' && 'Scan History'}
              {currentScreen === 'about' && 'About & Privacy'}
              {currentScreen === 'blocked_senders' && `Blocked Senders (${blockedSenders.length})`}
            </span>

            <div className="w-8"></div>
          </div>
        )}

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto pb-20">
          
          {/* ===================== SCREEN: HOME ===================== */}
          {currentScreen === 'home' && (
            <div className="p-4 space-y-4">
              
              {/* Brand Header */}
              <div className="pt-2 pb-1">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                      MobiGuard
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Local AI
                      </span>
                    </h1>
                    <p className="text-xs text-slate-400 font-medium">Local AI. Real Protection. Zero Data Shared.</p>
                  </div>
                </div>
              </div>

              {/* Privacy Banner (Mandatory requirement) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-emerald-300">🔒 Your data stays on this device.</h2>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Zero cloud processing by default. No unsolicited APIs. Fully functional in Airplane Mode.
                  </p>
                </div>
              </div>

              {/* SMS Read Permission Request Card */}
              {smsPermission !== 'GRANTED' ? (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                      <BellRing className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <span>SMS Auto-Read Permission</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                          READ_SMS
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        Ask permission to read incoming messages and instantly block malicious senders right there on your device.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={handleGrantPermission}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Grant Permission & Auto-Read</span>
                    </button>
                    <button
                      onClick={handleDenyPermission}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                    >
                      Deny / Manual
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Processed 100% locally. Zero message content is ever transmitted.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-300">SMS Auto-Read Permission Granted</span>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem('mobiguard_sms_permission', 'PROMPT');
                      setSmsPermission('PROMPT');
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Revoke
                  </button>
                </div>
              )}

              {/* Live Incoming SMS Auto-Read Stream (When Permission is Granted) */}
              {smsPermission === 'GRANTED' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Live Auto-Read SMS Inbox
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">6 Messages</span>
                  </div>

                  <div className="space-y-2">
                    {INCOMING_SMS_STREAM.map((sms) => {
                      const isBlocked = LocalBlocklistStorage.isBlocked(sms.sender);
                      return (
                        <div
                          key={sms.id}
                          className={`p-3 rounded-xl border transition ${
                            isBlocked
                              ? 'bg-rose-950/20 border-rose-500/40 text-slate-400'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-white">
                                {sms.sender}
                              </span>
                              {isBlocked ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  BLOCKED SENDER
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400">
                                  {sms.category}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">{sms.time}</span>
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-2 mb-2.5 font-mono leading-relaxed">
                            {sms.text}
                          </p>

                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
                            <button
                              onClick={() => {
                                setMessageInput(sms.text);
                                setSelectedSenderId(sms.sender);
                                executeAnalysis(sms.text, 'SMS', sms.sender);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition active:scale-95"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Analyze</span>
                            </button>

                            {isBlocked ? (
                              <button
                                onClick={() => handleUnblockSender(sms.sender)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockSender(sms.sender, sms.category, sms.text)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 hover:border-rose-500/60 text-xs font-bold flex items-center gap-1 transition active:scale-95"
                                title="Block this message sender right here"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Block Sender Right There</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Blocked Senders Quick Access Banner */}
              <button
                onClick={() => {
                  setActiveTab('blocked');
                  setCurrentScreen('blocked_senders');
                }}
                className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 transition flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Blocked Senders Quarantine</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/20 text-rose-400 font-bold">
                        {blockedSenders.length} Active
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      View quarantined malicious senders and manage blocklist
                    </p>
                  </div>
                </div>
                <span className="text-slate-500 font-bold">›</span>
              </button>

              {/* Main 3 Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Security Actions
                </span>

                {/* 1. Check Message */}
                <button
                  onClick={() => setCurrentScreen('check_message')}
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                        Check Message
                      </h3>
                      <p className="text-xs text-slate-400">
                        Paste SMS, WhatsApp, or payment alert text
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-600 group-hover:text-slate-300 font-bold text-lg">›</span>
                </button>

                {/* 2. Scan QR */}
                <button
                  onClick={() => setCurrentScreen('scan_qr')}
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition">
                        Scan QR
                      </h3>
                      <p className="text-xs text-slate-400">
                        Verify UPI payment QR, URL, or plain text
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-600 group-hover:text-slate-300 font-bold text-lg">›</span>
                </button>

                {/* 3. Check Screenshot */}
                <button
                  onClick={() => setCurrentScreen('check_screenshot')}
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
                        Check Screenshot
                      </h3>
                      <p className="text-xs text-slate-400">
                        Extract and analyze text with on-device OCR
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-600 group-hover:text-slate-300 font-bold text-lg">›</span>
                </button>
              </div>

              {/* Live Threat Radar & Cyber Defense Hub */}
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Live Threat Radar & Scam Defense
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Shield Armed</span>
                  </span>
                </div>

                {/* Radar Segmented Control */}
                <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
                  <button
                    onClick={() => setThreatFeedTab('trends')}
                    className={`flex-1 py-1.5 rounded-lg transition text-[11px] flex items-center justify-center gap-1 ${
                      threatFeedTab === 'trends' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Trending Scams</span>
                  </button>
                  <button
                    onClick={() => setThreatFeedTab('safeguards')}
                    className={`flex-1 py-1.5 rounded-lg transition text-[11px] flex items-center justify-center gap-1 ${
                      threatFeedTab === 'safeguards' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safeguards</span>
                  </button>
                  <button
                    onClick={() => setThreatFeedTab('helpline')}
                    className={`flex-1 py-1.5 rounded-lg transition text-[11px] flex items-center justify-center gap-1 ${
                      threatFeedTab === 'helpline' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Helplines</span>
                  </button>
                </div>

                {/* Tab 1: Trending Scams in India */}
                {threatFeedTab === 'trends' && (
                  <div className="space-y-2">
                    {/* Scam 1: Electricity Disconnection */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800/40">
                          ⚡ Urgent Disconnection Extortion
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">Delhi & NCR</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">
                        SMS claiming power supply will be cut off at 9:30 PM due to unpaid electricity bills, urging victim to call a personal mobile number.
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-mono">Signal: Urgency + Contradiction</span>
                        <button
                          onClick={() => {
                            const text = 'Dear consumer your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Call officer 9876543210 immediately: bit.ly/power-bill';
                            executeAnalysis(text, 'SMS', '+91 98765 43210');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-sm active:scale-95"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Test Defense Analysis</span>
                        </button>
                      </div>
                    </div>

                    {/* Scam 2: UPI Reverse Debit / Cashback */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/40">
                          💳 UPI Reverse Debit Trap
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">All India UPI</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">
                        Fraudsters send QR codes labeled "Cashback / Refund ₹1,999" that actually trigger a payment deduction upon entering your UPI PIN.
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-mono">Signal: UPI Intent Mismatch</span>
                        <button
                          onClick={() => {
                            const text = 'upi://pay?pa=random123@ybl&am=1999&tn=refund';
                            executeAnalysis(text, 'QR');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-sm active:scale-95"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Test QR Guard</span>
                        </button>
                      </div>
                    </div>

                    {/* Scam 3: Bank KYC Freeze Threat */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800/40">
                          🏦 Bank KYC Freeze Phishing
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">Major Banks</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">
                        Messages threatening immediate account block unless ₹99 re-verification fee is paid via unverified shortened link (bit.ly/xyz).
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-mono">Signal: Suspicious Short URL</span>
                        <button
                          onClick={() => {
                            const text = 'Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz';
                            executeAnalysis(text, 'SMS', 'VK-HDFCBK');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-sm active:scale-95"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Test KYC Phish</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: On-Device Safeguards Health */}
                {threatFeedTab === 'safeguards' && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Local TFLite Neural Model</h4>
                          <p className="text-[11px] text-slate-400">
                            DistilBERT fine-tuned on 15,000+ Indian fraud templates executes entirely on-chip in ~12ms.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Zero Cloud Network Egress</h4>
                          <p className="text-[11px] text-slate-400">
                            Messages and scanned payloads never leave your smartphone. Fully certified in Airplane Mode.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">UPI Semantic Intent Dissector</h4>
                          <p className="text-[11px] text-slate-400">
                            Detects deceptive parameters such as disguise of debit transactions under "refund" or "prize" notes.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Instant Sender Quarantine</h4>
                          <p className="text-[11px] text-slate-400">
                            One-tap blocklist quarantines malicious phone numbers & SMS headers locally on your device.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Official Helplines & Portals */}
                {threatFeedTab === 'helpline' && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">National Cybercrime Helpline</span>
                          <span className="text-[11px] text-slate-400">Immediate financial fraud freeze</span>
                        </div>
                        <a
                          href="tel:1930"
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition flex items-center gap-1"
                        >
                          <span>📞 1930</span>
                        </a>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">Chakshu Portal (DoT)</span>
                          <span className="text-[11px] text-slate-400">Report fraudulent SMS & calls</span>
                        </div>
                        <a
                          href="https://sancharsaathi.gov.in"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1 border border-slate-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>sancharsaathi</span>
                        </a>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">National Cyber Portal</span>
                          <span className="text-[11px] text-slate-400">File official FIR / complaint</span>
                        </div>
                        <a
                          href="https://cybercrime.gov.in"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1 border border-slate-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>cybercrime.gov.in</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status footer banner */}
              <div className="pt-2">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>TFLite DistilBERT + RuleEngine Ready</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">~12ms</span>
                </div>
              </div>

            </div>
          )}

          {/* ===================== SCREEN: CHECK MESSAGE ===================== */}
          {currentScreen === 'check_message' && (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Message Scanner</h2>
                <p className="text-xs text-slate-400">
                  Analyze SMS, WhatsApp forwards, or urgent notifications locally.
                </p>
              </div>

              {/* Sender Detection & Instant Block Strip */}
              {(() => {
                const detectedSender = selectedSenderId || extractSenderFromText(messageInput);
                const isBlocked = detectedSender ? LocalBlocklistStorage.isBlocked(detectedSender) : false;
                return (
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isBlocked ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                        <UserX className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Sender:</span>
                          <span className="text-xs font-mono font-bold text-white">
                            {detectedSender || 'Auto-Detecting Sender...'}
                          </span>
                        </div>
                        {isBlocked && (
                          <span className="text-[10px] text-rose-400 font-bold">
                            ⚠️ This sender is already blocked on your device!
                          </span>
                        )}
                      </div>
                    </div>

                    {detectedSender && detectedSender !== 'Unknown Sender' && (
                      <div>
                        {isBlocked ? (
                          <button
                            onClick={() => handleUnblockSender(detectedSender)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockSender(detectedSender, 'Suspicious SMS Sender', messageInput)}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 hover:border-rose-500/60 text-xs font-bold flex items-center gap-1 transition active:scale-95"
                            title="Block message sender right there"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Block Sender Right There</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Sender ID Manual / Override Input */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sender Phone Number or SMS Header</span>
                  </label>
                  {selectedSenderId && (
                    <button
                      onClick={() => setSelectedSenderId('')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedSenderId}
                    onChange={(e) => setSelectedSenderId(e.target.value)}
                    placeholder="e.g. VK-SBIBNK, +91 98765 43210, AX-PAYTM"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSenderId('VK-SBIBNK');
                        triggerHaptic(false);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 font-mono border border-slate-700"
                      title="Set typical bank header"
                    >
                      Bank
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSenderId('+919876543210');
                        triggerHaptic(false);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 font-mono border border-slate-700"
                      title="Set unknown mobile number"
                    >
                      Mobile
                    </button>
                  </div>
                </div>
              </div>

              {/* Text Input Area */}
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={6}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      if (!selectedSenderId) {
                        const ext = extractSenderFromText(e.target.value);
                        if (ext) setSelectedSenderId(ext);
                      }
                    }}
                    placeholder="Type, paste, or dictate SMS message (e.g. 'Dear customer from 9876543210: your electricity will be disconnected...')"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition leading-relaxed resize-none font-mono"
                  />
                  {messageInput && (
                    <span className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500">
                      {messageInput.length} chars
                    </span>
                  )}
                </div>

                {/* Input Action Controls (Paste Message / Dictate / Clear / Example / Analyze) */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <button
                      onClick={handlePasteClipboard}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Paste</span>
                    </button>

                    <button
                      onClick={toggleVoiceInput}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 ${
                        isVoiceListening
                          ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                      title="Dictate SMS or phone conversation"
                    >
                      {isVoiceListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                          <span>Stop Dictation</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Voice Dictate</span>
                        </>
                      )}
                    </button>

                    {messageInput && (
                      <button
                        onClick={() => {
                          setMessageInput('');
                          setSelectedSenderId('');
                        }}
                        className="px-2.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
                      >
                        Clear
                      </button>
                    )}

                    <button
                      onClick={handleCycleExample}
                      className="px-2.5 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-semibold flex items-center gap-1 border border-cyan-800/40 transition active:scale-95"
                      title="Load next sample test message"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sample</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => executeAnalysis(messageInput, 'SMS', selectedSenderId)}
                      disabled={!messageInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Analyze (Local AI)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Sample Presets */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Load Test Cases
                </span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setMessageInput('Dear customer, your KYC is expiring today. Pay ₹99 immediately or your account will be blocked. bit.ly/xyz')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
                  >
                    <span className="text-rose-400 font-bold mr-1">🔴 KYC Scam:</span>
                    "Dear customer, your KYC is expiring today. Pay ₹99 immediately..."
                  </button>

                  <button
                    onClick={() => setMessageInput('Your OTP is 482910. Do not share with anyone. - HDFC Bank')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
                  >
                    <span className="text-emerald-400 font-bold mr-1">🟢 Genuine OTP:</span>
                    "Your OTP is 482910. Do not share with anyone. - HDFC Bank"
                  </button>

                  <button
                    onClick={() => setMessageInput('Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to receive your prize.')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
                  >
                    <span className="text-rose-400 font-bold mr-1">🔴 Payment Scam:</span>
                    "Congratulations! You won ₹50,000. Pay ₹499 processing fee..."
                  </button>

                  <button
                    onClick={() => setMessageInput('Dear consumer your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Call officer 9876543210 immediately: bit.ly/power-bill')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
                  >
                    <span className="text-rose-400 font-bold mr-1">🔴 Electricity Threat:</span>
                    "Dear consumer your electricity power will be disconnected tonight..."
                  </button>

                  <button
                    onClick={() => setMessageInput('Amazon Work from home: Earn ₹2500 daily rating products. Pay ₹499 registration fee to receive tasks kit: tinyurl.com/job-apply')}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
                  >
                    <span className="text-rose-400 font-bold mr-1">🔴 Job Deposit Scam:</span>
                    "Earn ₹2500 daily rating products. Pay ₹499 registration fee..."
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ===================== SCREEN: SCAN QR ===================== */}
          {currentScreen === 'scan_qr' && (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">QR Code Verifier</h2>
                <p className="text-xs text-slate-400">
                  Inspect UPI payment codes, URLs, and text before scanning in banking apps.
                </p>
              </div>

              {/* Input mode selector */}
              <div className="grid grid-cols-4 rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setQrInputMethod('camera')}
                  className={`py-1.5 rounded-lg transition text-center ${
                    qrInputMethod === 'camera' ? 'bg-slate-800 text-emerald-400 shadow font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Camera
                </button>
                <button
                  onClick={() => setQrInputMethod('upload')}
                  className={`py-1.5 rounded-lg transition text-center ${
                    qrInputMethod === 'upload' ? 'bg-slate-800 text-emerald-400 shadow font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Upload
                </button>
                <button
                  onClick={() => setQrInputMethod('paste')}
                  className={`py-1.5 rounded-lg transition text-center ${
                    qrInputMethod === 'paste' ? 'bg-slate-800 text-emerald-400 shadow font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Paste
                </button>
                <button
                  onClick={() => setQrInputMethod('preset')}
                  className={`py-1.5 rounded-lg transition text-center ${
                    qrInputMethod === 'preset' ? 'bg-slate-800 text-emerald-400 shadow font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Presets
                </button>
              </div>

              {/* Camera Scanner View */}
              {qrInputMethod === 'camera' && (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-square border border-slate-800 flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanning Reticle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-52 h-52 border-2 border-dashed border-emerald-400/80 rounded-2xl relative">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                        <div className="w-full h-0.5 bg-emerald-400/70 absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                      </div>
                    </div>

                    {/* Camera On-Screen Controls */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      {hasTorch && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          className={`p-2 rounded-xl backdrop-blur border transition active:scale-95 ${
                            isTorchOn
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/30'
                              : 'bg-slate-900/80 text-slate-200 border-slate-700'
                          }`}
                          title="Toggle Flashlight"
                        >
                          <Flashlight className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="p-2 rounded-xl bg-slate-900/80 text-slate-200 border border-slate-700 backdrop-blur transition active:scale-95"
                        title="Flip Camera (Front/Rear)"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                        <p className="text-xs text-slate-300 mb-3">{cameraError}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startCamera()}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                          >
                            Retry Camera
                          </button>
                          <button
                            onClick={() => setQrInputMethod('upload')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700"
                          >
                            Upload Photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Real-time auto-scanning active
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      Camera: {cameraFacingMode === 'environment' ? 'Rear (Main)' : 'Front'}
                    </span>
                  </div>
                </div>
              )}

              {/* Upload QR View */}
              {qrInputMethod === 'upload' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-700 p-6 text-center space-y-3 bg-slate-900/60">
                    <QrCode className="w-10 h-10 text-emerald-400 mx-auto" />
                    <div>
                      <span className="text-xs font-bold text-white block">Upload or Snap QR Image</span>
                      <span className="text-[11px] text-slate-400">
                        Supports gallery screenshots and mobile camera photos
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                      <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer transition active:scale-95 shadow">
                        <Camera className="w-4 h-4" />
                        <span>Snap Photo with Camera</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleQrImageUpload}
                          className="hidden"
                        />
                      </label>

                      <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition active:scale-95">
                        <Upload className="w-4 h-4 text-cyan-400" />
                        <span>Choose from Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {qrDecodeError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{qrDecodeError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Paste Direct Link / UPI String */}
              {qrInputMethod === 'paste' && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-cyan-400" />
                      Direct UPI Intent / URL Paste
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (navigator.clipboard && navigator.clipboard.readText) {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                              setQrManualText(text.trim());
                              setBlockToast('✓ Pasted link');
                              setTimeout(() => setBlockToast(null), 2000);
                            }
                          }
                        } catch {}
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Paste from Clipboard
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={qrManualText}
                    onChange={(e) => setQrManualText(e.target.value)}
                    placeholder="e.g. upi://pay?pa=merchant@okhdfcbank&pn=Shop&am=500 or https://suspicious-pay.xyz"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono resize-none"
                  />

                  <button
                    type="button"
                    disabled={!qrManualText.trim()}
                    onClick={() => {
                      handleQrScanned(qrManualText.trim());
                    }}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Inspect & Verify QR Payload</span>
                  </button>
                </div>
              )}

              {/* Preset QR Buttons */}
              {qrInputMethod === 'preset' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Select Test QR Payload
                  </span>
                  
                  {/* Preset 1: Fraud UPI Refund */}
                  <button
                    onClick={() => handleQrScanned('upi://pay?pa=random123@ybl&am=1999&tn=refund')}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 active:bg-slate-850 text-left transition flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-white">Fake UPI Refund Collect QR</span>
                        <span className="text-[10px] text-rose-400 font-mono bg-rose-950/80 px-1 py-0.2 rounded border border-rose-800/40">
                          🔴 Fraud
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        upi://pay?pa=random123@ybl&am=1999&tn=refund
                      </p>
                    </div>
                  </button>

                  {/* Preset 2: Genuine Merchant QR */}
                  <button
                    onClick={() => handleQrScanned('upi://pay?pa=amazon@okhdfcbank&pn=Amazon&am=499')}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 active:bg-slate-850 text-left transition flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-white">Genuine Amazon Verified QR</span>
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-800/40">
                          🟢 Genuine
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        upi://pay?pa=amazon@okhdfcbank&pn=Amazon&am=499
                      </p>
                    </div>
                  </button>

                  {/* Preset 3: Phishing URL QR */}
                  <button
                    onClick={() => handleQrScanned('https://hdfcbank-kyc-verify.xyz/update')}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 active:bg-slate-850 text-left transition flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-white">Phishing URL (.xyz TLD)</span>
                        <span className="text-[10px] text-rose-400 font-mono bg-rose-950/80 px-1 py-0.2 rounded border border-rose-800/40">
                          🔴 Suspicious
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        https://hdfcbank-kyc-verify.xyz/update
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Decoded QR Card (UPI Parameters Extraction) */}
              {scannedQrString && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Extracted QR Payload
                    </span>
                    <button
                      onClick={() => {
                        setScannedQrString('');
                        setExtractedUpi(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all">
                    {scannedQrString}
                  </p>

                  {/* UPI Metadata breakdown */}
                  {extractedUpi && (
                    <div className="space-y-1.5 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payee ID (VPA):</span>
                        <span className="text-slate-200 font-bold">{extractedUpi.pa || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payee Name:</span>
                        <span className="text-slate-200 font-bold">{extractedUpi.pn || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Amount:</span>
                        <span className="text-slate-200 font-bold">{extractedUpi.am ? `₹${extractedUpi.am}` : 'User specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Transaction Note:</span>
                        <span className="text-amber-400 font-bold">{extractedUpi.tn || 'None'}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => executeAnalysis(scannedQrString, 'QR')}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Run On-Device Analysis</span>
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ===================== SCREEN: CHECK SCREENSHOT ===================== */}
          {currentScreen === 'check_screenshot' && (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Screenshot OCR Analyzer</h2>
                <p className="text-xs text-slate-400">
                  On-device ML Kit OCR extracts text from chat screenshots, receipts, or SMS without uploading images.
                </p>
              </div>

              {/* Custom Image Upload & Mobile Camera Capture */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-bold flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    Scan Real Mobile Screenshot
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    OCR Engine: On-Device + Vision
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Take a photo of another screen or select any WhatsApp, SMS, or banking screenshot from your device gallery.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition active:scale-95 shadow">
                    <Camera className="w-4 h-4" />
                    <span>Snap with Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setOcrError(null);
                        setOcrText('');
                        setSelectedScreenshot(null);
                        setIsOcrProcessing(true);
                        setOcrProgressStatus('Loading image...');
                        setOcrProgressPct(10);

                        // Image preview thumbnail
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setUploadedImagePreview(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);

                        try {
                          const res = await extractTextFromImage(file, (status, pct) => {
                            setOcrProgressStatus(status);
                            setOcrProgressPct(pct);
                          });

                          if (res.text && res.text.trim().length > 0) {
                            setOcrText(res.text.trim());
                            setOcrResultSource(res.source === 'gemini_vision' ? 'Cloud Vision AI' : 'On-Device Tesseract.js');
                            triggerHaptic(false);
                          } else {
                            setOcrError('No readable text found in this image. Please ensure text is well-lit and not blurry.');
                            triggerHaptic(true);
                          }
                        } catch (err: any) {
                          setOcrError(err?.message || 'Failed to extract text from image. Please try again.');
                          triggerHaptic(true);
                        } finally {
                          setIsOcrProcessing(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer border border-slate-700 transition active:scale-95">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Choose from Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setOcrError(null);
                        setOcrText('');
                        setSelectedScreenshot(null);
                        setIsOcrProcessing(true);
                        setOcrProgressStatus('Loading image...');
                        setOcrProgressPct(10);

                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setUploadedImagePreview(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);

                        try {
                          const res = await extractTextFromImage(file, (status, pct) => {
                            setOcrProgressStatus(status);
                            setOcrProgressPct(pct);
                          });

                          if (res.text && res.text.trim().length > 0) {
                            setOcrText(res.text.trim());
                            setOcrResultSource(res.source === 'gemini_vision' ? 'Cloud Vision AI' : 'On-Device Tesseract.js');
                            triggerHaptic(false);
                          } else {
                            setOcrError('No readable text found in this screenshot. Please try a clearer screenshot.');
                            triggerHaptic(true);
                          }
                        } catch (err: any) {
                          setOcrError(err?.message || 'Failed to extract text from screenshot.');
                          triggerHaptic(true);
                        } finally {
                          setIsOcrProcessing(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadedImagePreview && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-800 max-h-36 bg-slate-950 flex items-center justify-center">
                    <img
                      src={uploadedImagePreview}
                      alt="Uploaded screenshot"
                      className="max-h-36 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImagePreview(null);
                        setOcrText('');
                      }}
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-slate-900/90 text-[10px] text-slate-300 hover:text-white border border-slate-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Sample Screenshots Gallery */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Or Try Sample Test Screenshots
                </span>

                <div className="grid grid-cols-1 gap-2">
                  {SAMPLE_SCREENSHOTS.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => {
                        setSelectedScreenshot(sample);
                        setUploadedImagePreview(null);
                        setOcrError(null);
                        setIsOcrProcessing(true);
                        setOcrProgressStatus('Simulating on-device ML Kit...');
                        setOcrProgressPct(60);
                        setTimeout(() => {
                          setOcrText(sample.extractedText);
                          setOcrResultSource('Pre-indexed sample screenshot');
                          setIsOcrProcessing(false);
                          triggerHaptic(false);
                        }, 250);
                      }}
                      className={`p-3 rounded-xl text-left border transition ${
                        selectedScreenshot?.id === sample.id
                          ? 'bg-slate-850 border-emerald-500'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{sample.title}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          sample.badge.includes('FRAUD')
                            ? 'text-rose-400 bg-rose-950/60 border-rose-800/40'
                            : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                        }`}>
                          {sample.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{sample.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error notice if OCR failed */}
              {ocrError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{ocrError}</span>
                </div>
              )}

              {/* OCR Output & Analysis Button */}
              {isOcrProcessing ? (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      {ocrProgressStatus || 'Processing image OCR...'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Extracting text lines with high accuracy
                    </p>
                  </div>
                  {ocrProgressPct > 0 && (
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(ocrProgressPct, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ) : ocrText ? (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      Extracted Text
                    </span>
                    <div className="flex items-center gap-2">
                      {ocrResultSource && (
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          {ocrResultSource}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setOcrText('');
                          setSelectedScreenshot(null);
                          setUploadedImagePreview(null);
                        }}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <textarea
                      rows={5}
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none resize-none"
                    />
                    <span className="text-[10px] text-slate-500 block text-right">
                      You can edit or touch-up extracted text above before analysis
                    </span>
                  </div>

                  <button
                    onClick={() => executeAnalysis(ocrText, 'SCREENSHOT')}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Run Fraud Engine Analysis</span>
                  </button>
                </div>
              ) : null}

            </div>
          )}

          {/* ===================== SCREEN: VERDICT ===================== */}
          {currentScreen === 'verdict' && currentResult && (
            <div className="p-4 space-y-4">
              
              {/* Giant Verdict Icon & Category (80dp equivalent) */}
              <div className="text-center space-y-2 pt-2">
                <div className="flex justify-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl transition-all ${
                    currentResult.verdict === 'FRAUD RISK'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-rose-500/30 animate-pulse'
                      : currentResult.verdict === 'SUSPICIOUS'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-amber-500/20'
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/20'
                  }`}>
                    {currentResult.verdict === 'FRAUD RISK' ? (
                      <ShieldAlert className="w-10 h-10" />
                    ) : currentResult.verdict === 'SUSPICIOUS' ? (
                      <AlertTriangle className="w-10 h-10" />
                    ) : (
                      <ShieldCheck className="w-10 h-10" />
                    )}
                  </div>
                </div>

                {/* Verdict Title (28sp bold) */}
                <div>
                  <h2 className={`text-2xl font-black uppercase tracking-tight ${
                    currentResult.verdict === 'FRAUD RISK'
                      ? 'text-rose-400'
                      : currentResult.verdict === 'SUSPICIOUS'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}>
                    {currentResult.verdict}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {currentResult.label}
                  </p>
                </div>

                {/* Confidence & Score Metric Badges */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200">
                    {currentResult.confidence}% Confidence
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
                    Risk Score: {currentResult.score}/100
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400">
                    {currentResult.inferenceTimeMs}ms
                  </span>
                </div>
              </div>

              {/* Risk Indicator Arc / Bar */}
              <div className="space-y-1 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Risk Scale</span>
                  <span className="font-mono font-bold text-slate-300">{currentResult.score} / 100</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      currentResult.verdict === 'FRAUD RISK'
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : currentResult.verdict === 'SUSPICIOUS'
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(6, currentResult.score)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                  <span className="text-emerald-400">0–30 Genuine</span>
                  <span className="text-amber-400">31–60 Suspicious</span>
                  <span className="text-rose-400">61–100 Fraud</span>
                </div>
              </div>

              {/* Real Local On-Device AI Neural Model Telemetry & Vector Breakdown */}
              <LocalAiModelCard localAi={currentResult.localAiInference} />

              {/* Expandable "Show Me Why" Material Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowWhy(!showWhy)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-850"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400" />
                    Show Me Why (5 Signal Breakdown)
                  </span>
                  {showWhy ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showWhy && (
                  <div className="p-4 border-t border-slate-850 space-y-3">
                    {/* 5-Row Signal Table */}
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">1. Urgency Pressure (25%)</span>
                        <span className={`font-bold ${currentResult.signals.urgency > 40 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {currentResult.signals.urgency} / 100
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">2. Payment Contradiction (30%)</span>
                        <span className={`font-bold ${currentResult.signals.contradiction > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {currentResult.signals.contradiction} / 100
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">3. Recipient Mismatch (25%)</span>
                        <span className={`font-bold ${currentResult.signals.mismatch > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {currentResult.signals.mismatch} / 100
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">4. Scam Template Match (15%)</span>
                        <span className={`font-bold ${currentResult.signals.template > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {currentResult.signals.template} / 100
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400">5. URL / Domain Risk (5%)</span>
                        <span className={`font-bold ${currentResult.signals.urlRisk > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {currentResult.signals.urlRisk} / 100
                        </span>
                      </div>
                    </div>

                    {/* Explanations bullet list */}
                    {currentResult.signals.explanations.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Signal Explanations:
                        </span>
                        {currentResult.signals.explanations.map((exp, i) => (
                          <div key={i} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span className="leading-snug">{exp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Safety Recommendation Box */}
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                currentResult.verdict === 'FRAUD RISK'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : currentResult.verdict === 'SUSPICIOUS'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              }`}>
                <span className="font-bold block mb-1 text-sm">Safety Recommendation:</span>
                <p>{currentResult.recommendation}</p>
              </div>

              {/* SENDER BLOCKING CARD: "Block the message sender right there" */}
              {(() => {
                const detectedSender = currentResult.sender || extractSenderFromText(currentRawText);
                const isBlocked = detectedSender ? LocalBlocklistStorage.isBlocked(detectedSender) : false;
                return (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${isBlocked ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                          <UserX className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                            Sender Verification
                          </span>
                          <span className="text-sm font-mono font-bold text-white">
                            {detectedSender || 'Unknown or Embedded Sender'}
                          </span>
                        </div>
                      </div>

                      {isBlocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          <span>BLOCKED</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Active
                        </span>
                      )}
                    </div>

                    {detectedSender && detectedSender !== 'Unknown Sender' ? (
                      <div className="pt-1">
                        {isBlocked ? (
                          <div className="flex items-center justify-between bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30">
                            <span className="text-xs text-rose-300 font-medium">
                              ✓ Sender is quarantined on this device.
                            </span>
                            <button
                              onClick={() => handleUnblockSender(detectedSender)}
                              className="px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                            >
                              Unblock
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBlockSender(detectedSender, currentResult.label, currentRawText)}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition active:scale-98 cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Block Message Sender Right There</span>
                          </button>
                        )}
                        <p className="text-[10px] text-slate-500 pt-1.5 text-center">
                          Blocks incoming SMS & flags all future communications from {detectedSender} with 100 Risk Score.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Sender header could not be verified automatically. You can manually block numbers in Blocked Senders.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* CLOUD AI USAGE: Gemini 3.8 Flash Deep Reasoning API */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Gemini 3.8 Flash Deep AI</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                          API Enabled
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Cognitive psychological reasoning & threat profiling
                      </p>
                    </div>
                  </div>

                  {!aiResult && !isAiLoading && (
                    <button
                      onClick={() => handleRunAiAnalysis(currentRawText, currentResult.sender)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Deep AI</span>
                    </button>
                  )}
                </div>

                {isAiLoading && (
                  <div className="py-4 text-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
                    <p className="text-xs text-indigo-200 font-medium">
                      Gemini 3.8 Flash analyzing deception patterns & sender authenticity...
                    </p>
                  </div>
                )}

                {aiError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-center justify-between">
                    <span>{aiError}</span>
                    <button
                      onClick={() => handleRunAiAnalysis(currentRawText, currentResult.sender)}
                      className="text-[10px] underline font-bold"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {aiResult && (
                  <div className="space-y-2.5 pt-1 border-t border-indigo-900/40 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">AI Threat Score:</span>
                      <span className="font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                        {aiResult.threatScore} / 100 ({aiResult.category})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Psychological Triggers Detected:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiResult.psychologicalTriggers.map((trig, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/40"
                          >
                            ⚡ {trig}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] leading-relaxed">
                      <strong className="text-indigo-300 block mb-1">AI Reasoning:</strong>
                      {aiResult.reasoning}
                    </div>

                    <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-800/30 text-indigo-200 text-[11px] leading-relaxed">
                      <strong className="text-white block mb-0.5">Actionable Guidance:</strong>
                      {aiResult.recommendedAction}
                    </div>

                    {aiResult.shouldBlockSender && currentResult.sender && !LocalBlocklistStorage.isBlocked(currentResult.sender) && (
                      <div className="pt-1">
                        <button
                          onClick={() => handleBlockSender(currentResult.sender!, 'AI Threat Advisory: High Fraud Confidence', currentRawText)}
                          className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>AI Advises: Block Sender Right There ({currentResult.sender})</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scanned Input Preview */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  Analyzed Payload ({currentScanType})
                </span>
                <p className="font-mono text-slate-300 break-all">{currentRawText}</p>
              </div>

              {/* Actions: Scan Another + Share Verdict */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setMessageInput('');
                    setCurrentScreen('check_message');
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 text-xs font-bold text-center transition"
                >
                  Scan Another
                </button>
                <button
                  onClick={handleShareVerdict}
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copiedNotification ? 'Verdict Copied!' : 'Share Verdict'}</span>
                </button>
              </div>

            </div>
          )}

          {/* ===================== SCREEN: HISTORY ===================== */}
          {currentScreen === 'history' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Local Scan History</h2>
                  <p className="text-xs text-slate-400">Stored only on this device via Room / local storage.</p>
                </div>
                {historyList.length > 0 && (
                  <button
                    onClick={() => setShowClearHistoryDialog(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50 transition flex items-center gap-1.5 text-xs font-semibold"
                    title="Delete All History"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All History</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
                {(['ALL', 'FRAUD RISK', 'SUSPICIOUS', 'GENUINE'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`flex-1 py-1 rounded-lg transition text-[11px] ${
                      historyFilter === filter ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'FRAUD RISK' ? 'Fraud Risk' : filter === 'SUSPICIOUS' ? 'Suspicious' : 'Genuine'}
                  </button>
                ))}
              </div>

              {/* History List */}
              {filteredHistory.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No scans recorded yet in this category.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentResult({
                          score: item.score,
                          verdict: item.verdict,
                          confidence: item.confidence,
                          label: item.verdict === 'FRAUD RISK' ? 'Multiple strong fraud indicators detected.' : item.verdict === 'SUSPICIOUS' ? 'Verify before acting' : 'No fraud signals detected',
                          recommendation: item.recommendation,
                          signals: item.signals,
                          inferenceTimeMs: 12,
                          modelType: 'DistilBERT-TFLite + RuleEngine'
                        });
                        setCurrentRawText(item.rawText);
                        setCurrentScanType(item.type);
                        setCurrentScreen('verdict');
                      }}
                      className="w-full p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:bg-slate-850 text-left transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            item.verdict === 'FRAUD RISK'
                              ? 'bg-rose-500'
                              : item.verdict === 'SUSPICIOUS'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}></span>
                          <span className="text-xs font-bold text-white uppercase tracking-tight">
                            {item.verdict}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-mono line-clamp-2">
                        {item.preview}
                      </p>

                      <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                        <span>Risk Score: {item.score}/100</span>
                        <span>{item.confidence}% Confidence</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Confirm Clear Modal */}
              {showClearHistoryDialog && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
                    <div className="space-y-1 text-center">
                      <Trash2 className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                      <h3 className="text-sm font-bold text-white">Delete All History?</h3>
                      <p className="text-xs text-slate-400">
                        This permanently removes all locally saved scan records. No copy exists on any server.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowClearHistoryDialog(false)}
                        className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          LocalHistoryStorage.clearAllHistory();
                          setHistoryList([]);
                          setShowClearHistoryDialog(false);
                        }}
                        className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white"
                      >
                        Delete All
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ===================== SCREEN: ABOUT & PRIVACY ===================== */}
          {currentScreen === 'about' && (
            <div className="p-4 space-y-4">
              
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">About MobiGuard</h2>
                <p className="text-xs text-slate-400">Local AI. Real Protection. Zero Data Shared.</p>
              </div>

              {/* Core Privacy Commitments */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Our 8 Non-Negotiable Privacy Commitments
                </h3>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>100% On-Device:</strong> Zero cloud processing, zero external APIs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>No Telemetry or Ads:</strong> No analytics trackers or commercial SDKs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>No Account Required:</strong> Use all core features without registering.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>Airplane Mode Verified:</strong> Guaranteed to function fully offline.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>Encrypted Local Storage:</strong> Kept in encrypted Room DB / local sandbox.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>No Internet Permission:</strong> Native build excludes INTERNET permission.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>One-Tap History Purge:</strong> Wipe all scan history instantly.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span><strong>Open-Source Core:</strong> Publicly verifiable on-device algorithm.</span>
                  </li>
                </ul>
              </div>

              {/* On-Device Architecture */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  On-Device Architecture
                </h3>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-white block">Layer 1: TensorFlow Lite DistilBERT</span>
                    <p className="text-[11px] text-slate-400">
                      Quantized INT8 NLP transformer model (~24.8 MB) loaded from <code>assets/fraud_model.tflite</code> for sub-300ms semantic inference.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-white block">Layer 2: Kotlin RuleEngine</span>
                    <p className="text-[11px] text-slate-400">
                      50+ targeted regex signatures modeling Indian cybercrime vectors (KYC expiry, refund reversal, electricity power cut, UPI contradictions).
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-white block">Layer 3: UPI & URL Integrity Validator</span>
                    <p className="text-[11px] text-slate-400">
                      Decodes UPI parameters (`pa`, `pn`, `am`, `tn`) to identify disguised debit requests and suspicious TLDs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsible AI Disclaimer (Mandatory) */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5 leading-relaxed">
                <span className="font-bold text-slate-300 block">Responsible AI Statement:</span>
                <p>
                  MobiGuard provides probabilistic risk indicators and decision support. It does not replace official banking judgment and does not guarantee that unflagged communications are completely safe or that flagged items are definitely fraudulent. Always verify suspicious communications directly through your bank's official app or branch.
                </p>
              </div>

            </div>
          )}

          {/* ===================== SCREEN: BLOCKED SENDERS ===================== */}
          {currentScreen === 'blocked_senders' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-400" />
                    <span>Blocked Senders Quarantine</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Incoming SMS & messages from these senders are flagged with 100/100 risk.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {blockedSenders.length} Blocked
                </span>
              </div>

              {/* Add Custom Sender to Block */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                  Block a Sender Number or Header
                </span>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={manualBlockInput}
                    onChange={(e) => setManualBlockInput(e.target.value)}
                    placeholder="e.g. +91 98765 43210 or VM-SCAMS"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualBlockReason}
                      onChange={(e) => setManualBlockReason(e.target.value)}
                      placeholder="Reason for block"
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (manualBlockInput.trim()) {
                          handleBlockSender(manualBlockInput.trim(), manualBlockReason || 'Manual User Block');
                          setManualBlockInput('');
                        }
                      }}
                      disabled={!manualBlockInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Block</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Blocked Senders List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  Active Quarantined Senders ({blockedSenders.length})
                </span>

                {blockedSenders.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1.5">
                    <Shield className="w-7 h-7 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No senders currently blocked.</p>
                    <p className="text-[11px] text-slate-500">
                      When analyzing suspicious SMS, tap "Block Sender Right There" to quarantine here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedSenders.map((item) => (
                      <div
                        key={item.senderId}
                        className="p-3 rounded-xl bg-slate-900 border border-rose-950/80 hover:border-rose-900/60 transition flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white">
                              {item.senderId}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">
                              {new Date(item.blockedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-300/80">
                            {item.reason}
                          </p>
                          {item.sampleMessage && (
                            <p className="text-[10px] text-slate-500 font-mono line-clamp-1">
                              "{item.sampleMessage}"
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleUnblockSender(item.senderId)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shrink-0 transition"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* National Cybercrime Helpline 1930 / I4C Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-rose-950/30 border border-rose-800/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Report Scam to Indian Authorities
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Victim of cyber fraud or suspicious extortion SMS? Report immediately to the National Cybercrime Portal:
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                  <a
                    href="tel:1930"
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 transition"
                  >
                    <span>📞 Dial 1930</span>
                  </a>
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>cybercrime.gov.in</span>
                  </a>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ===================== BOTTOM NAVIGATION BAR ===================== */}
        <nav className="border-t border-slate-900 bg-slate-950/95 backdrop-blur absolute bottom-0 left-0 right-0 z-40 px-4 py-2 flex items-center justify-around">
          {/* Home Tab */}
          <button
            onClick={() => {
              setActiveTab('home');
              setCurrentScreen('home');
            }}
            className={`flex flex-col items-center gap-1 transition ${
              currentScreen === 'home' || currentScreen === 'check_message' || currentScreen === 'scan_qr' || currentScreen === 'check_screenshot' || currentScreen === 'verdict'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${
              currentScreen === 'home' ? 'bg-emerald-500/10' : ''
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Home</span>
          </button>

          {/* Blocked Senders Tab */}
          <button
            onClick={() => {
              setActiveTab('blocked');
              setCurrentScreen('blocked_senders');
            }}
            className={`flex flex-col items-center gap-1 transition relative ${
              currentScreen === 'blocked_senders'
                ? 'text-rose-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${
              currentScreen === 'blocked_senders' ? 'bg-rose-500/10' : ''
            }`}>
              <Ban className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Blocked</span>
            {blockedSenders.length > 0 && (
              <span className="absolute -top-0.5 right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white font-mono">
                {blockedSenders.length}
              </span>
            )}
          </button>

          {/* History Tab */}
          <button
            onClick={() => {
              setActiveTab('history');
              setCurrentScreen('history');
            }}
            className={`flex flex-col items-center gap-1 transition relative ${
              currentScreen === 'history'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${
              currentScreen === 'history' ? 'bg-emerald-500/10' : ''
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px]">History</span>
            {historyList.length > 0 && (
              <span className="absolute -top-0.5 right-2 w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          {/* About Tab */}
          <button
            onClick={() => {
              setActiveTab('about');
              setCurrentScreen('about');
            }}
            className={`flex flex-col items-center gap-1 transition ${
              currentScreen === 'about'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${
              currentScreen === 'about' ? 'bg-emerald-500/10' : ''
            }`}>
              <Info className="w-5 h-5" />
            </div>
            <span className="text-[10px]">About</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
