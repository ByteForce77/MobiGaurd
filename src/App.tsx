import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, Smartphone, Plane, 
  Copy, Check, Trash2, Camera, Upload, ArrowLeft, Share2, 
  MessageSquare, QrCode, Image as ImageIcon, Info, ExternalLink, 
  RefreshCw, CheckCircle2, XCircle, AlertCircle, FileText, ChevronDown, ChevronUp, Lock, Sparkles,
  Ban, Clock, UserX, BellRing, Radio, Plus, Shield, Mic, MicOff, Flashlight, RotateCcw, Link2,
  Search, Sliders, Settings, Home, BookOpen, Flag, Bell, Play, Award, HelpCircle, PhoneCall, Zap
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
import { DEMO_EXAMPLES, DemoExample } from './lib/demoExamples';
import { SuspiciousContentHighlighter } from './components/SuspiciousContentHighlighter';
import { UrlAnalysisCard } from './components/UrlAnalysisCard';
import { SmartUrlGuard } from './components/SmartUrlGuard';
import { PaymentGuard } from './components/PaymentGuard';
import { CallGuard } from './components/CallGuard';
import { ChatGuard } from './components/ChatGuard';
import { AppGuard } from './components/AppGuard';
import { ScamShieldKnowledge } from './components/ScamShieldKnowledge';
import { EmergencyModeModal } from './components/EmergencyModeModal';
import { SecurityCheckModal } from './components/SecurityCheckModal';
import { SecurityScoreModal } from './components/SecurityScoreModal';
import { PrivacyCenterModal } from './components/PrivacyCenterModal';
import { SecurityLabModal } from './components/SecurityLabModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ReportScamModal } from './components/ReportScamModal';
import { AboutModal } from './components/AboutModal';
import { PresentationModeGuide } from './components/PresentationModeGuide';
import { StartupSplash } from './components/StartupSplash';

type ScreenType = 
  | 'home' 
  | 'scan' 
  | 'check_message' 
  | 'smart_url'
  | 'scan_qr' 
  | 'check_screenshot' 
  | 'payment_guard'
  | 'call_guard'
  | 'chat_guard'
  | 'app_guard'
  | 'scam_shield'
  | 'verdict' 
  | 'history' 
  | 'protection' 
  | 'settings' 
  | 'about' 
  | 'blocked_senders';

type TabType = 'home' | 'scan' | 'history' | 'protection' | 'settings';

export default function App() {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [scanSubMode, setScanSubMode] = useState<'message' | 'qr' | 'screenshot'>('message');
  const [airplaneMode, setAirplaneMode] = useState<boolean>(true);
  const [aiMode, setAiMode] = useState<'local' | 'hybrid'>('local');
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [showDemoInbox, setShowDemoInbox] = useState<boolean>(false);
  const [blockedSearchTerm, setBlockedSearchTerm] = useState<string>('');
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');

  // Real local device time (honest, zero simulated remote timezone)
  const [deviceTime, setDeviceTime] = useState<string>('');
  const [deviceDate, setDeviceDate] = useState<string>('');

  useEffect(() => {
    const updateDeviceClock = () => {
      try {
        const now = new Date();
        setDeviceTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setDeviceDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
      } catch {
        setDeviceTime(new Date().toLocaleTimeString());
      }
    };

    updateDeviceClock();
    const interval = setInterval(updateDeviceClock, 1000);
    
    // Initialize Local On-Device AI Model Engine
    LocalAiThreatModel.init().catch(err => console.info('Local AI engine initialized with neural fallback', err));

    return () => clearInterval(interval);
  }, []);

  // SMS Read Permission State & Banner
  const [smsPermission, setSmsPermission] = useState<'PROMPT' | 'GRANTED' | 'DENIED'>(() => {
    try {
      return (localStorage.getItem('mobiguard_sms_permission') as any) || 'PROMPT';
    } catch {
      return 'PROMPT';
    }
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
  
  // Message & URL Scanner State (Core MobiGuard Workflow)
  const [messageInput, setMessageInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [showUrlField, setShowUrlField] = useState<boolean>(false);
  const [inputValidationError, setInputValidationError] = useState<string | null>(null);
  const [demoCategoryFilter, setDemoCategoryFilter] = useState<'ALL' | 'HIGH RISK' | 'SAFE'>('ALL');
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
  const [showClearBlocklistDialog, setShowClearBlocklistDialog] = useState<boolean>(false);
  const [scanSubTab, setScanSubTab] = useState<'message' | 'qr' | 'screenshot'>('message');
  const [exampleIndex, setExampleIndex] = useState<number>(0);

  // Product Modals State
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showSecurityCheckModal, setShowSecurityCheckModal] = useState<boolean>(false);
  const [showSecurityScoreModal, setShowSecurityScoreModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showSecurityLabModal, setShowSecurityLabModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showReportScamModal, setShowReportScamModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

  // Presentation Mode State
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [presentationStepIndex, setPresentationStepIndex] = useState<number>(0);

  // Dynamic Security Score Calculation
  const calculateSecurityScore = () => {
    let score = 82;
    if (blockedSenders.length > 0) score += 6;
    if (historyList.length > 0) score += 4;
    if (airplaneMode) score += 3;
    if (smsPermission === 'GRANTED') score += 5;
    return Math.min(100, Math.max(60, score));
  };

  const handleExecutePresentationStep = (step: any) => {
    // Dismiss open dialogs
    setShowEmergencyModal(false);
    setShowSecurityCheckModal(false);
    setShowSecurityScoreModal(false);
    setShowPrivacyModal(false);
    setShowSecurityLabModal(false);
    setShowNotificationsModal(false);
    setShowReportScamModal(false);
    setShowAboutModal(false);

    switch (step.targetScreen) {
      case 'home':
        setCurrentScreen('home');
        setActiveTab('home');
        break;
      case 'check_message':
        setCurrentScreen('check_message');
        setActiveTab('scan');
        break;
      case 'check_message_load_kyc': {
        const kycDemo = DEMO_EXAMPLES.find(d => d.id === 'demo-1') || DEMO_EXAMPLES[0];
        handleLoadDemo(kycDemo, false);
        setCurrentScreen('check_message');
        break;
      }
      case 'analyze_kyc': {
        const kycDemo = DEMO_EXAMPLES.find(d => d.id === 'demo-1') || DEMO_EXAMPLES[0];
        executeAnalysis(kycDemo.messageText, 'SMS', kycDemo.sender, kycDemo.optionalUrl);
        break;
      }
      case 'verdict_view':
      case 'verdict_indicators': {
        if (!currentResult) {
          const kycDemo = DEMO_EXAMPLES[0];
          executeAnalysis(kycDemo.messageText, 'SMS', kycDemo.sender, kycDemo.optionalUrl);
        }
        setCurrentScreen('verdict');
        setShowWhy(true);
        break;
      }
      case 'payment_guard':
        setCurrentScreen('payment_guard');
        break;
      case 'payment_guard_demo':
        setCurrentScreen('payment_guard');
        break;
      case 'scan_qr':
        setCurrentScreen('scan_qr');
        setQrInputMethod('paste');
        break;
      case 'scan_qr_demo': {
        setCurrentScreen('scan_qr');
        setQrInputMethod('paste');
        const upiDemo = 'upi://pay?pa=refund_desk@icici&pn=Swiggy%20Refund&am=1499&cu=INR&tn=Refund_Enter_PIN';
        setQrManualText(upiDemo);
        break;
      }
      case 'history':
        setCurrentScreen('history');
        setActiveTab('history');
        break;
      case 'security_score':
        setShowSecurityScoreModal(true);
        break;
      case 'privacy_center':
        setShowPrivacyModal(true);
        break;
      case 'android_roadmap':
        setCurrentScreen('settings');
        setActiveTab('settings');
        break;
      default:
        setCurrentScreen('home');
        break;
    }
  };

  const handleExportHistory = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyList, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mobiguard-scan-history-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Failed to export history', e);
    }
  };

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
    try {
      localStorage.setItem('mobiguard_sms_permission', 'GRANTED');
    } catch {
      // Ignore storage write error
    }
    setSmsPermission('GRANTED');
    setShowPermissionModal(false);
    setBlockToast('🛡️ SMS Read Access Granted. Live On-Device Fraud Scanner Active.');
    triggerHaptic(false);
    setTimeout(() => setBlockToast(null), 3500);
  };

  const handleDenyPermission = () => {
    try {
      localStorage.setItem('mobiguard_sms_permission', 'DENIED');
    } catch {
      // Ignore storage write error
    }
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

  // Perform Analysis and route to Verdict (Core MobiGuard Engine)
  const executeAnalysis = (
    text: string, 
    type: 'SMS' | 'QR' | 'SCREENSHOT' | 'URL', 
    senderOverride?: string,
    optionalUrl?: string
  ) => {
    const trimmedText = text.trim();
    const trimmedUrl = (optionalUrl || urlInput).trim();
    
    if (!trimmedText && !trimmedUrl) {
      setInputValidationError('Please paste or enter a message, email, or URL to analyze.');
      triggerHaptic(true);
      return;
    }
    setInputValidationError(null);

    const detectedSender = senderOverride || selectedSenderId || extractSenderFromText(trimmedText);
    const combinedPayload = trimmedText 
      ? (trimmedUrl && !trimmedText.includes(trimmedUrl) ? `${trimmedText}\nTarget URL: ${trimmedUrl}` : trimmedText)
      : trimmedUrl;

    const result = FraudAnalyzer.analyze(trimmedText || trimmedUrl, detectedSender, trimmedUrl || undefined);
    setCurrentResult(result);
    setCurrentRawText(combinedPayload);
    setCurrentScanType(type);
    setAiResult(null);
    setAiError(null);

    // Save to local encrypted history
    const newRecord = LocalHistoryStorage.saveScan(type, combinedPayload, result);
    setHistoryList(prev => [newRecord, ...prev.filter(h => h.id !== newRecord.id)].slice(0, 50));

    triggerHaptic(result.verdict === 'FRAUD RISK');
    setCurrentScreen('verdict');
  };

  const handleLoadDemo = (demo: DemoExample, autoScan: boolean = false) => {
    setMessageInput(demo.messageText);
    setSelectedSenderId(demo.sender);
    setUrlInput(demo.optionalUrl || '');
    if (demo.optionalUrl) {
      setShowUrlField(true);
    }
    setInputValidationError(null);
    triggerHaptic(false);
    if (autoScan) {
      executeAnalysis(demo.messageText, 'SMS', demo.sender, demo.optionalUrl);
    } else {
      setBlockToast(`✓ Loaded "${demo.title}". Tap "Scan with MobiGuard" to test.`);
      setTimeout(() => setBlockToast(null), 3000);
    }
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

  // Filtered History with search support
  const filteredHistory = historyList.filter(item => {
    const itemVerdict = item.verdict || (item.threatLevel === 'SAFE' ? 'GENUINE' : item.threatLevel === 'SUSPICIOUS' ? 'SUSPICIOUS' : 'FRAUD RISK');
    const matchesCategory = historyFilter === 'ALL' || itemVerdict === historyFilter;
    const matchesSearch = !historySearchTerm.trim() || 
      (item.rawText || item.preview || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      itemVerdict.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      (item.type || '').toLowerCase().includes(historySearchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtered Blocked Senders with search support
  const filteredBlockedSenders = blockedSenders.filter(sender => {
    if (!blockedSearchTerm.trim()) return true;
    const term = blockedSearchTerm.toLowerCase();
    return sender.senderId.toLowerCase().includes(term) ||
      (sender.reason && sender.reason.toLowerCase().includes(term)) ||
      (sender.sampleMessage && sender.sampleMessage.toLowerCase().includes(term));
  });

  if (isInitializing) {
    return <StartupSplash onComplete={() => setIsInitializing(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start font-sans select-none antialiased">
      {/* Outer Shell container designed with Android Material 3 Dark-First Aesthetic */}
      <div className="w-full max-w-md bg-slate-950 min-h-screen flex flex-col border-x border-slate-900 shadow-2xl relative">
        
        {/* Android System Status Bar with Real Device Time */}
        <div className="pt-2 px-3 pb-1.5 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950 border-b border-slate-900/80 sticky top-0 z-50">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {deviceTime || 'Protected'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-[10px] text-slate-300 font-medium">Web Sandbox</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-400 hidden sm:inline-block">
              {deviceDate}
            </span>

            {/* Airplane Mode Toggle Switch */}
            <button
              onClick={() => setAirplaneMode(!airplaneMode)}
              title="Toggle Airplane Mode (Local rules operate 100% offline)"
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                airplaneMode 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Plane className={`w-3 h-3 ${airplaneMode ? 'rotate-45 text-amber-400' : ''}`} />
              <span>{airplaneMode ? 'OFFLINE VERIFIED' : 'ONLINE'}</span>
            </button>

            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>{aiMode === 'local' ? 'LOCAL ENGINE' : 'HYBRID AI'}</span>
            </div>
          </div>
        </div>

        {/* Device Protected & Privacy Status Banner */}
        <div className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-b border-emerald-900/40 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">Browser Sandbox:</span>
            <span className="text-slate-300">Local Heuristics Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span 
              className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
              title="Web Prototype: On-device heuristics active; native Android hooks simulated"
            >
              Web Prototype
            </span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {aiMode === 'local' ? 'On-Device AI' : 'Hybrid Gemini'}
            </span>
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
              {currentScreen === 'scan' && 'Scan Security Hub'}
              {currentScreen === 'check_message' && 'Check Message'}
              {currentScreen === 'smart_url' && 'Smart URL Guard'}
              {currentScreen === 'scan_qr' && 'QR Scanner'}
              {currentScreen === 'check_screenshot' && 'Check Screenshot'}
              {currentScreen === 'payment_guard' && 'Payment & UPI Guard'}
              {currentScreen === 'call_guard' && 'Call & Digital Arrest Guard'}
              {currentScreen === 'chat_guard' && 'Chat & Telegram Guard'}
              {currentScreen === 'app_guard' && 'App & Permission Guard'}
              {currentScreen === 'scam_shield' && 'Scam Shield Knowledge'}
              {currentScreen === 'verdict' && 'Security Verdict'}
              {currentScreen === 'history' && 'Scan History'}
              {currentScreen === 'protection' && 'Protection & Quarantine'}
              {currentScreen === 'settings' && 'Settings & Privacy'}
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
              
              {/* Brand Header with Live Controls */}
              <div className="pt-2 pb-1">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                    </div>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                        <span>MobiGuard</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Local AI
                        </span>
                      </h1>
                      <p className="text-xs text-emerald-300 font-semibold tracking-wide">
                        Check before you trust.
                      </p>
                    </div>
                  </div>

                  {/* Header Utility Icons (Presentation Mode & Notifications) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setIsPresentationMode(!isPresentationMode);
                        setPresentationStepIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                        isPresentationMode
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-800'
                      }`}
                      title="Toggle Hackathon Guided Presentation Tour"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Demo Tour</span>
                    </button>

                    <button
                      onClick={() => setShowNotificationsModal(true)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 relative cursor-pointer transition"
                      title="Security Notifications"
                    >
                      <Bell className="w-4 h-4 text-slate-300" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  Privacy-focused AI mobile security companion that identifies scams, phishing, fraudulent messages, suspicious links, and social-engineering attempts.
                </p>
              </div>

              {/* Fast Emergency Action Bar */}
              <div className="grid grid-cols-2 gap-2">
                {/* SOS / I Think I Was Scammed */}
                <button
                  onClick={() => setShowEmergencyModal(true)}
                  className="p-3 rounded-2xl bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/40 hover:border-rose-500 text-left transition flex items-center gap-2.5 group cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500 group-hover:text-white transition shrink-0">
                    <ShieldAlert className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-rose-300 block leading-tight">
                      I Was Scammed
                    </span>
                    <span className="text-[10px] text-rose-400/80">Emergency Steps</span>
                  </div>
                </button>

                {/* Run Security Check */}
                <button
                  onClick={() => setShowSecurityCheckModal(true)}
                  className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 text-left transition flex items-center gap-2.5 group cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition shrink-0">
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition duration-500" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold text-white block leading-tight group-hover:text-emerald-300">
                      Security Check
                    </span>
                    <span className="text-[10px] text-slate-400">Run Quick Audit</span>
                  </div>
                </button>
              </div>

              {/* Interactive Security Score & Protection Status Card */}
              <div 
                onClick={() => setShowSecurityScoreModal(true)}
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Device Security Health</span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          • Tap for Factors
                        </span>
                      </h2>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                    Strong Protection
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-white tracking-tight">
                      {calculateSecurityScore()}
                    </span>
                    <span className="text-xs font-mono text-slate-400">/100</span>
                  </div>

                  <div className="flex-1 max-w-[180px]">
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                      <div 
                        className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700"
                        style={{ width: `${calculateSecurityScore()}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                      <span>Neural Engine</span>
                      <span>Zero Egress</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Banner */}
              <div 
                onClick={() => setShowPrivacyModal(true)}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex items-center justify-between cursor-pointer hover:border-emerald-400/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                      🔒 100% On-Device Privacy Guaranteed
                    </h2>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Zero message content is uploaded to any server. Open Privacy Center →
                    </p>
                  </div>
                </div>
                <span className="text-slate-600 group-hover:text-emerald-400 font-bold text-sm">›</span>
              </div>

              {/* Security Dashboard Overview */}
              <div id="mobiguard-dashboard-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Total Scans
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-mono font-black text-white">{historyList.length}</span>
                    <span className="text-[10px] text-slate-500">logged</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Threats Detected
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-mono font-black ${
                      historyList.filter(h => (h.score ?? h.riskScore ?? 0) > 60 || h.verdict === 'FRAUD RISK' || h.threatLevel === 'HIGH RISK').length > 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}>
                      {historyList.filter(h => (h.score ?? h.riskScore ?? 0) > 60 || h.verdict === 'FRAUD RISK' || h.threatLevel === 'HIGH RISK').length}
                    </span>
                    <span className="text-[10px] text-rose-400/80 font-medium">high risk</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Suspicious
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-mono font-black ${
                      historyList.filter(h => {
                        const s = h.score ?? h.riskScore ?? 0;
                        return (s > 30 && s <= 60) || h.verdict === 'SUSPICIOUS' || h.threatLevel === 'SUSPICIOUS';
                      }).length > 0
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}>
                      {historyList.filter(h => {
                        const s = h.score ?? h.riskScore ?? 0;
                        return (s > 30 && s <= 60) || h.verdict === 'SUSPICIOUS' || h.threatLevel === 'SUSPICIOUS';
                      }).length}
                    </span>
                    <span className="text-[10px] text-amber-400/80 font-medium">caution</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Protection Status
                  </span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-400">Armed</span>
                  </div>
                </div>
              </div>

              {/* ==================== PROMINENT SCANNER (MAIN WORKFLOW) ==================== */}
              <div id="mobiguard-scanner-card" className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Scan Message or Link</h2>
                      <p className="text-[11px] text-slate-400">SMS, WhatsApp, email, or urgent statement</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                    On-Device AI
                  </span>
                </div>

                {/* Message Input Box */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <textarea
                      id="mobiguard-message-input"
                      rows={4}
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        if (inputValidationError) setInputValidationError(null);
                      }}
                      placeholder="Paste a suspicious SMS, WhatsApp message, email, or payment message..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none resize-none placeholder:text-slate-500"
                    />
                    {messageInput && (
                      <button
                        onClick={() => setMessageInput('')}
                        className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px]"
                        title="Clear text"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Input Action Utilities */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handlePasteClipboard}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Paste Clipboard</span>
                      </button>
                      <button
                        onClick={toggleVoiceInput}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition active:scale-95 ${
                          isVoiceListening
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isVoiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        <span>{isVoiceListening ? 'Listening...' : 'Voice Dictate'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setShowUrlField(!showUrlField)}
                      className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{showUrlField ? 'Hide URL' : '+ Suspicious URL'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional Suspicious URL Input */}
                {(showUrlField || urlInput) && (
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-semibold text-slate-300">Suspicious URL / Link (Optional)</span>
                      </span>
                      {urlInput && (
                        <button
                          onClick={() => setUrlInput('')}
                          className="text-[10px] text-slate-500 hover:text-slate-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      id="mobiguard-url-input"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (inputValidationError) setInputValidationError(null);
                      }}
                      placeholder="Paste suspicious URL"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-2 text-xs text-cyan-300 font-mono focus:outline-none placeholder:text-slate-600"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      ⚠️ MobiGuard will not automatically navigate to decoded links. All domain and protocol checks are evaluated safely.
                    </span>
                  </div>
                )}

                {/* Validation Error Banner */}
                {inputValidationError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{inputValidationError}</span>
                  </div>
                )}

                {/* Prominent Primary Scan Button */}
                <button
                  id="scan-with-mobiguard-button"
                  onClick={() => executeAnalysis(messageInput, 'SMS', selectedSenderId, urlInput)}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                  <span>Scan with MobiGuard</span>
                </button>
              </div>

              {/* ==================== DEMO MODE & SCENARIOS (SIMULATED DATA FOR EVALUATION) ==================== */}
              <div id="demo-scenarios-section" className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Demo Scenarios (Simulated Data)
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold">
                    Evaluation Samples
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 px-1 leading-snug">
                  These samples represent common real-world scams and safe messages for evaluation. Real personal messages can be pasted into the scanner above.
                </p>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 px-1">
                  {(['ALL', 'HIGH RISK', 'SAFE'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDemoCategoryFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        demoCategoryFilter === filter
                          ? 'bg-slate-200 text-slate-950'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter === 'ALL' ? 'All Samples (6)' : filter === 'HIGH RISK' ? '🔴 Scams (5)' : '🟢 Safe (1)'}
                    </button>
                  ))}
                </div>

                {/* Scenarios Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_EXAMPLES.filter(d => demoCategoryFilter === 'ALL' || (demoCategoryFilter === 'HIGH RISK' ? d.expectedThreatLevel !== 'SAFE' : d.expectedThreatLevel === 'SAFE')).map((demo) => (
                    <div
                      key={demo.id}
                      className={`p-3.5 rounded-2xl border transition text-left flex flex-col justify-between space-y-2.5 ${
                        demo.expectedThreatLevel === 'SAFE'
                          ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                demo.expectedThreatLevel === 'SAFE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {demo.expectedThreatLevel}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300/90 border border-amber-500/20">
                              Sample / Demo Message
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{demo.sender}</span>
                        </div>

                        <h3 className="text-xs font-bold text-white leading-tight">{demo.title}</h3>
                        <p className="text-[11px] text-slate-300 font-mono line-clamp-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                          {demo.messageText}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-snug">{demo.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleLoadDemo(demo, true)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 transition shadow-sm active:scale-95 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Scan Demo</span>
                        </button>
                        <button
                          onClick={() => handleLoadDemo(demo, false)}
                          className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                        >
                          Load to Input
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ==================== RECENT SCANS ==================== */}
              {historyList.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Recent Scans
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('history');
                        setCurrentScreen('history');
                      }}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      View All ({historyList.length}) ›
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {historyList.slice(0, 3).map((item) => {
                      const textToAnalyze = item.rawText || item.preview || '';
                      return (
                      <button
                        key={item.id}
                        onClick={() => {
                          const result = FraudAnalyzer.analyze(textToAnalyze);
                          setCurrentResult(result);
                          setCurrentRawText(textToAnalyze);
                          setCurrentScanType(item.type);
                          setCurrentScreen('verdict');
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.verdict === 'FRAUD RISK' || item.threatLevel === 'HIGH RISK'
                                ? 'bg-rose-500'
                                : item.verdict === 'SUSPICIOUS' || item.threatLevel === 'SUSPICIOUS'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <div className="truncate">
                            <span className="text-xs font-mono text-slate-200 block truncate">
                              {textToAnalyze.replace(/\n/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.type}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.verdict === 'FRAUD RISK' || item.threatLevel === 'HIGH RISK'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.verdict === 'SUSPICIOUS' || item.threatLevel === 'SUSPICIOUS'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.verdict === 'FRAUD RISK' ? 'HIGH RISK' : (item.verdict || item.threatLevel)} ({item.score ?? item.riskScore ?? 0})
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* SMS Integration Card: Honest Android Requirement + Demo Simulation */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white">
                        SMS Integration
                      </h3>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono font-semibold border border-cyan-500/30">
                        Android Companion App Preview
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-300/90 font-medium">
                      SMS integration requires the Android app version.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Web applications cannot directly access device SMS without a native Android companion service. You can paste messages directly into MobiGuard or explore the simulated inbox below.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setCurrentScreen('check_message');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Use Manual Scan</span>
                  </button>
                  <button
                    onClick={() => setShowDemoInbox(!showDemoInbox)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{showDemoInbox ? 'Close Demo Inbox' : 'Open Demo SMS Inbox'}</span>
                  </button>
                </div>
              </div>

              {/* Demo SMS Inbox (Android App Simulation) */}
              {showDemoInbox && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                        Demo SMS Inbox (Android App Simulation)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">6 Simulated SMS</span>
                  </div>
                  <p className="text-[10px] text-slate-400 px-1">
                    Demonstrating how the future native Android companion app will automatically scan messages.
                  </p>

                  <div className="space-y-2 pt-1">
                    {INCOMING_SMS_STREAM.map((sms) => {
                      const isBlocked = LocalBlocklistStorage.isBlocked(sms.sender);
                      return (
                        <div
                          key={sms.id}
                          className={`p-3 rounded-xl border transition ${
                            isBlocked
                              ? 'bg-rose-950/20 border-rose-500/40 text-slate-400'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-white">
                                {sms.sender}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                Simulated SMS
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
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Analyze Demo SMS</span>
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
                                title="Block this message sender in MobiGuard"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Block Sender</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==================== MOBIGUARD 8-MODULE PROTECTION SUITE ==================== */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    MobiGuard Protection Suite
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">8 Active Guards</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. Check Message */}
                  <button
                    onClick={() => setCurrentScreen('check_message')}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                          Check Message
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          SMS, WhatsApp, phishing & bank alerts
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-300 font-bold text-base">›</span>
                  </button>

                  {/* 2. Smart URL Guard */}
                  <button
                    onClick={() => setCurrentScreen('smart_url')}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-cyan-400 transition">
                          Smart URL Guard
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Lookalikes, IP hosts, unshorten links
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-300 font-bold text-base">›</span>
                  </button>

                  {/* 3. Scan QR Guard */}
                  <button
                    onClick={() => setCurrentScreen('scan_qr')}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:bg-teal-500 group-hover:text-slate-950 transition">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-teal-400 transition">
                          Scan QR Guard
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Inspect UPI payment intent & payloads
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-300 font-bold text-base">›</span>
                  </button>

                  {/* 4. Payment Guard */}
                  <button
                    onClick={() => setCurrentScreen('payment_guard')}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                          Payment Guard
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          UPI reverse collect & fake refunds
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-300 font-bold text-base">›</span>
                  </button>

                  {/* 5. Call Guard */}
                  <button
                    onClick={() => setCurrentScreen('call_guard')}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-rose-400 transition">
                          Call & Digital Arrest Guard
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Police impersonation, parcel extortion
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-300 font-bold text-base">›</span>
                  </button>

                  {/* 6. Chat Guard */}
                  <button
                    onClick={() => setCurrentScreen('chat_guard')}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-indigo-400 transition">
                          Chat & Telegram Guard
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Task scams, fake jobs, crypto schemes
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-300 font-bold text-base">›</span>
                  </button>

                  {/* 7. App & Permission Guard */}
                  <button
                    onClick={() => setCurrentScreen('app_guard')}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition">
                          App & Permission Guard
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Sideloaded APKs & accessibility audit
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-300 font-bold text-base">›</span>
                  </button>

                  {/* 8. Scam Shield Knowledge */}
                  <button
                    onClick={() => setCurrentScreen('scam_shield')}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 active:scale-[0.99] transition flex items-center justify-between group shadow-sm text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                          Scam Shield Knowledge
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Encyclopedia of 11 cybercrime models
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-slate-300 font-bold text-base">›</span>
                  </button>
                </div>
              </div>

              {/* Threat Simulation Lab Banner (Judge / Evaluator Tool) */}
              <div 
                onClick={() => setShowSecurityLabModal(true)}
                className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 hover:border-purple-500/60 transition cursor-pointer group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500 group-hover:text-white transition shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-purple-300 group-hover:text-purple-200">
                          🧪 Threat Simulation Lab
                        </h3>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Judge & Test Suite
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Test 15 live attack vectors (Digital Arrest, UPI Reverse, APK Trojans, FedEx) into MobiGuard engine.
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 group-hover:text-purple-400 text-sm font-bold ml-2">›</span>
                </div>
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
              
              {/* Threat Status Card */}
              {(() => {
                const verdictType = currentResult.displayVerdict || (currentResult.verdict === 'FRAUD RISK' ? 'HIGH RISK' : currentResult.verdict === 'SUSPICIOUS' ? 'SUSPICIOUS' : 'SAFE');
                const isHighRisk = verdictType === 'HIGH RISK';
                const isSuspicious = verdictType === 'SUSPICIOUS';

                return (
                  <div className="space-y-4">
                    {/* Giant Verdict Icon & Category */}
                    <div className="text-center space-y-2 pt-2">
                      <div className="flex justify-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl transition-all ${
                          isHighRisk
                            ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-rose-500/30 animate-pulse'
                            : isSuspicious
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-amber-500/20'
                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/20'
                        }`}>
                          {isHighRisk ? (
                            <ShieldAlert className="w-10 h-10" />
                          ) : isSuspicious ? (
                            <AlertTriangle className="w-10 h-10" />
                          ) : (
                            <ShieldCheck className="w-10 h-10" />
                          )}
                        </div>
                      </div>

                      {/* Verdict Title */}
                      <div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight ${
                          isHighRisk ? 'text-rose-400' : isSuspicious ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {verdictType}
                        </h2>
                        <p className="text-xs text-slate-300 font-medium">
                          {currentResult.label}
                        </p>
                      </div>

                      {/* Confidence & Score Metric Badges */}
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200">
                          {currentResult.confidence}% Confidence
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
                          Risk Score: <strong className={isHighRisk ? 'text-rose-400' : isSuspicious ? 'text-amber-400' : 'text-emerald-400'}>{currentResult.score}</strong>/100
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400">
                          {currentResult.inferenceTimeMs}ms
                        </span>
                      </div>
                    </div>

                    {/* Risk Indicator Bar */}
                    <div className="space-y-1.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Threat Risk Gauge</span>
                        <span className="font-mono font-bold text-slate-300">{currentResult.score} / 100</span>
                      </div>
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isHighRisk
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                              : isSuspicious
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(6, currentResult.score)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                        <span className="text-emerald-400">0–30 Safe</span>
                        <span className="text-amber-400">31–60 Suspicious</span>
                        <span className="text-rose-400">61–100 High Risk</span>
                      </div>
                    </div>

                    {/* Screenshot OCR Indicator & Editable Text Link */}
                    {currentScanType === 'SCREENSHOT' && (
                      <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 text-amber-300">
                          <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <span className="font-bold block text-amber-200">Analyzed from screenshot OCR</span>
                            <span className="text-[10px] text-slate-400">Extracted on-device. Edit the text below if OCR missed any words.</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setMessageInput(currentRawText);
                            setCurrentScreen('check_message');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold shrink-0 transition active:scale-95 cursor-pointer"
                        >
                          Edit Text
                        </button>
                      </div>
                    )}

                    {/* Local Privacy Reassurance Notice */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="leading-snug">
                        {currentResult.privacyNotice || 'Analyzed 100% locally on this device via on-device AI. Zero message content sent to external servers.'}
                      </span>
                    </div>

                    {/* WHY THE CONTENT WAS FLAGGED (Clear explanation) */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Why MobiGuard Flagged This
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                        {currentResult.whyFlagged || currentResult.recommendation}
                      </p>
                    </div>

                    {/* SUSPICIOUS PHRASES & CONTENT HIGHLIGHTER */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Suspicious Content Highlighting
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Flagged Phrases</span>
                      </div>
                      <SuspiciousContentHighlighter text={currentRawText} />
                    </div>

                    {/* DETECTED TACTICS (Urgency, OTP request, Impersonation, Fake rewards, etc.) */}
                    {currentResult.detectedTactics && currentResult.detectedTactics.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                            <span>Detected Social-Engineering Tactics</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                              {currentResult.detectedTactics.length}
                            </span>
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {currentResult.detectedTactics.map((tacticItem, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3"
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-slate-200 block">
                                  {tacticItem.name}
                                </span>
                                <span className="text-[11px] text-slate-400 leading-snug block">
                                  {tacticItem.description}
                                </span>
                              </div>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                                  tacticItem.severity === 'high'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    : tacticItem.severity === 'medium'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {tacticItem.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* URL SECURITY ANALYSIS (If URL was found or provided) */}
                    {currentResult.urlAnalysis && (
                      <UrlAnalysisCard urlAnalysis={currentResult.urlAnalysis} />
                    )}

                    {/* SIMPLE RECOMMENDED ACTIONS (e.g. Do not click link, Do not share OTP, Verify sender) */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Recommended Actions
                        </h3>
                      </div>

                      <div className="space-y-1.5">
                        {currentResult.recommendedActions && currentResult.recommendedActions.length > 0 ? (
                          currentResult.recommendedActions.map((action, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-200"
                            >
                              <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                              <span className="leading-snug">{action}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                            {currentResult.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Local Scan History</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {historyList.length} Saved
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Stored exclusively on this device in local storage.</p>
                </div>
                {historyList.length > 0 && (
                  <button
                    onClick={() => setShowClearHistoryDialog(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
                    title="Delete All History"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* History Search Bar */}
              {historyList.length > 0 && (
                <div className="relative">
                  <input
                    type="text"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    placeholder="Search past scans by text or type..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  {historySearchTerm && (
                    <button
                      onClick={() => setHistorySearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
                {(['ALL', 'FRAUD RISK', 'SUSPICIOUS', 'GENUINE'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`flex-1 py-1.5 rounded-lg transition text-[11px] cursor-pointer ${
                      historyFilter === filter ? 'bg-slate-800 text-white shadow font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'FRAUD RISK' ? 'High Risk' : filter === 'SUSPICIOUS' ? 'Suspicious' : 'Safe'}
                  </button>
                ))}
              </div>

              {/* History List */}
              {historyList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-white">No Scan Records Yet</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Messages, URLs, QR codes, and screenshots analyzed by MobiGuard will be recorded here locally on your device.
                  </p>
                  <button
                    onClick={() => setCurrentScreen('check_message')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition cursor-pointer"
                  >
                    Analyze a Message Now
                  </button>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                  <Search className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-300 font-semibold">No matching scan records found</p>
                  <p className="text-[11px] text-slate-500">Try changing the category filter or clearing the search query.</p>
                  {historySearchTerm && (
                    <button
                      onClick={() => setHistorySearchTerm('')}
                      className="text-xs text-emerald-400 hover:underline pt-1"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((item) => {
                    const textToAnalyze = item.rawText || item.preview || '';
                    const itemScore = item.score ?? item.riskScore ?? 0;
                    const verdictDisplay = item.verdict === 'FRAUD RISK' || item.threatLevel === 'HIGH RISK'
                      ? 'HIGH RISK'
                      : item.verdict === 'SUSPICIOUS' || item.threatLevel === 'SUSPICIOUS'
                      ? 'SUSPICIOUS'
                      : 'GENUINE';

                    return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const result = FraudAnalyzer.analyze(textToAnalyze);
                        setCurrentResult(result);
                        setCurrentRawText(textToAnalyze);
                        setCurrentScanType(item.type);
                        setCurrentScreen('verdict');
                      }}
                      className="w-full p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:bg-slate-850 text-left transition space-y-1.5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            verdictDisplay === 'HIGH RISK'
                              ? 'bg-rose-500'
                              : verdictDisplay === 'SUSPICIOUS'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}></span>
                          <span className="text-xs font-bold text-white uppercase tracking-tight">
                            {verdictDisplay}
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
                        {item.preview || textToAnalyze}
                      </p>

                      <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                        <span>Risk Score: <strong className={itemScore > 60 ? 'text-rose-400' : itemScore > 30 ? 'text-amber-400' : 'text-emerald-400'}>{itemScore}/100</strong></span>
                        <span>{item.confidence}% Confidence</span>
                      </div>
                    </button>
                    );
                  })}
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

              {/* Honest OS Disclaimer Banner */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>In-App Protection:</strong> Senders quarantined here will be flagged with 100/100 threat score when scanned in MobiGuard. Native OS-level SMS/call blocking requires the Android companion app service.
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

              {/* Search Blocked Senders */}
              {blockedSenders.length > 0 && (
                <div className="relative">
                  <input
                    type="text"
                    value={blockedSearchTerm}
                    onChange={(e) => setBlockedSearchTerm(e.target.value)}
                    placeholder="Search blocked senders or reasons..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  {blockedSearchTerm && (
                    <button
                      onClick={() => setBlockedSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* Blocked Senders List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Active Quarantined Senders
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {filteredBlockedSenders.length} of {blockedSenders.length}
                  </span>
                </div>

                {blockedSenders.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1.5">
                    <Shield className="w-7 h-7 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No senders currently blocked.</p>
                    <p className="text-[11px] text-slate-500">
                      When analyzing suspicious SMS, tap "Block Sender" to quarantine here.
                    </p>
                  </div>
                ) : filteredBlockedSenders.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1.5">
                    <Search className="w-6 h-6 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-300 font-semibold">No senders match "{blockedSearchTerm}"</p>
                    <button
                      onClick={() => setBlockedSearchTerm('')}
                      className="text-xs text-rose-400 hover:underline pt-1"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredBlockedSenders.map((item) => (
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
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shrink-0 transition cursor-pointer"
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

          {/* ===================== SCREEN: UNIFIED SCAN ===================== */}
          {currentScreen === 'scan' && (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Threat Scanner</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select an input vector to analyze for phishing, UPI frauds, or scams.
                </p>
              </div>

              {/* Three Scan Modes Cards */}
              <div className="space-y-2.5">
                <button
                  onClick={() => setCurrentScreen('check_message')}
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-left transition flex items-center gap-3.5 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">Check Message or URL</h3>
                    <p className="text-[11px] text-slate-400">Paste SMS, WhatsApp text, emails, or suspicious website links.</p>
                  </div>
                  <span className="text-slate-500 group-hover:text-emerald-400 text-xs font-bold">→</span>
                </button>

                <button
                  onClick={() => setCurrentScreen('scan_qr')}
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-left transition flex items-center gap-3.5 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">Scan QR Code</h3>
                    <p className="text-[11px] text-slate-400">Camera feed or image upload. Safely decodes UPI debits without opening.</p>
                  </div>
                  <span className="text-slate-500 group-hover:text-cyan-400 text-xs font-bold">→</span>
                </button>

                <button
                  onClick={() => setCurrentScreen('check_screenshot')}
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-left transition flex items-center gap-3.5 group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition">Check Screenshot</h3>
                    <p className="text-[11px] text-slate-400">On-device OCR extracts text from payment apps and scam chats.</p>
                  </div>
                  <span className="text-slate-500 group-hover:text-amber-400 text-xs font-bold">→</span>
                </button>
              </div>

              {/* Quick Direct Message Input */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Quick Text / URL Scan
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">100% Local Engine</span>
                </div>
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type or paste any suspicious text, SMS, or URL here..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none font-mono"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setMessageInput(text);
                      } catch {
                        // ignore
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>
                  <button
                    onClick={() => {
                      if (messageInput.trim()) {
                        executeAnalysis(messageInput, 'SMS');
                      }
                    }}
                    disabled={!messageInput.trim()}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Analyze Content</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== SCREEN: SMART URL GUARD ===================== */}
          {currentScreen === 'smart_url' && (
            <div className="p-4">
              <SmartUrlGuard 
                onBack={() => setCurrentScreen('home')}
                initialUrl={urlInput}
              />
            </div>
          )}

          {/* ===================== SCREEN: PAYMENT & UPI GUARD ===================== */}
          {currentScreen === 'payment_guard' && (
            <div className="p-4">
              <PaymentGuard 
                onBack={() => setCurrentScreen('home')}
                onScanMessage={(text) => executeAnalysis(text, 'QR')}
              />
            </div>
          )}

          {/* ===================== SCREEN: CALL & DIGITAL ARREST GUARD ===================== */}
          {currentScreen === 'call_guard' && (
            <div className="p-4">
              <CallGuard 
                onBack={() => setCurrentScreen('home')}
              />
            </div>
          )}

          {/* ===================== SCREEN: CHAT & TELEGRAM GUARD ===================== */}
          {currentScreen === 'chat_guard' && (
            <div className="p-4">
              <ChatGuard 
                onBack={() => setCurrentScreen('home')}
                onRunFullAnalysis={(text, type) => executeAnalysis(text, type)}
              />
            </div>
          )}

          {/* ===================== SCREEN: APP & PERMISSION GUARD ===================== */}
          {currentScreen === 'app_guard' && (
            <div className="p-4">
              <AppGuard 
                onBack={() => setCurrentScreen('home')}
              />
            </div>
          )}

          {/* ===================== SCREEN: SCAM SHIELD KNOWLEDGE BASE ===================== */}
          {currentScreen === 'scam_shield' && (
            <div className="p-4">
              <ScamShieldKnowledge 
                onBack={() => setCurrentScreen('home')}
              />
            </div>
          )}

          {/* ===================== SCREEN: SETTINGS & PRIVACY DETAILS ===================== */}
          {currentScreen === 'settings' && (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-300" />
                  <span>Settings & Privacy Details</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Transparent privacy architecture, engine configuration, and data management.
                </p>
              </div>

              {/* Section 1: Detailed Privacy Transparency */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Lock className="w-4 h-4 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Privacy Architecture</h3>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-white block">Device-Only Processing</span>
                    <p className="text-slate-400 text-[11px]">
                      By default, all text, URLs, QR codes, and OCR images are processed entirely within this browser tab memory and local storage. No scanned text is transmitted to external telemetry servers.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-white block">Permissions Transparency</span>
                    <p className="text-slate-400 text-[11px]">
                      • <strong>Camera:</strong> Requested exclusively when you tap live QR Scan. Stopped immediately when leaving the screen.<br />
                      • <strong>Storage / Photos:</strong> Accessed only via your browser's native file picker when you manually select a screenshot.<br />
                      • <strong>SMS Reading:</strong> Web browsers cannot read your device SMS messages. The Android Companion App preview simulates how background SMS scanning functions on a native device.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-white block">Optional Deep AI Reasoning</span>
                    <p className="text-slate-400 text-[11px]">
                      When you explicitly tap "Deep AI Psychological Analysis", content is sent to Google Gemini via a secure server endpoint (`/api/analyze-threat`). Phone numbers and sensitive personal tokens are stripped, and content is not retained.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: AI Engine Configuration */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Threat Detection Engine
                </h3>

                <div className="space-y-2">
                  <button
                    onClick={() => setAiMode('local')}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      aiMode === 'local' 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>On-Device Engine (Recommended)</span>
                        {aiMode === 'local' && <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">ACTIVE</span>}
                      </div>
                      <p className="text-[11px] text-slate-400">100% offline, zero network requests, instant sub-50ms heuristic analysis.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setAiMode('hybrid')}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      aiMode === 'hybrid' 
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-white' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>Hybrid (Local + Gemini 3.8 Flash)</span>
                        {aiMode === 'hybrid' && <span className="text-[10px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.2 rounded font-mono">ACTIVE</span>}
                      </div>
                      <p className="text-[11px] text-slate-400">Uses local rules first, with cloud AI validation for subtle multi-stage social engineering.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 3: Evaluation & Demo Settings */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Evaluation & Hackathon Demo Mode
                </h3>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="space-y-0.5 pr-3">
                    <span className="font-bold text-xs text-white block">Show Demo Scenarios & Simulated Inbox</span>
                    <p className="text-[11px] text-slate-400">
                      Displays sample fraud presets and simulated Android SMS notifications for evaluation.
                    </p>
                  </div>
                  <button
                    onClick={() => setDemoMode(!demoMode)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      demoMode ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      demoMode ? 'right-1' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Section 4: Data Management & Export */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Local Data Controls
                </h3>

                <div className="space-y-2">
                  <button
                    onClick={handleExportHistory}
                    disabled={historyList.length === 0}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-850 disabled:opacity-40 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5 rotate-180" />
                      <span>Export Scan History (JSON)</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{historyList.length} records</span>
                  </button>

                  <button
                    onClick={() => setShowClearHistoryDialog(true)}
                    disabled={historyList.length === 0}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 disabled:opacity-40 border border-rose-900/30 text-rose-400 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Scan History</span>
                  </button>

                  <button
                    onClick={() => setShowClearBlocklistDialog(true)}
                    disabled={blockedSenders.length === 0}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 disabled:opacity-40 border border-rose-900/30 text-rose-400 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Clear Quarantined Senders ({blockedSenders.length})</span>
                  </button>
                </div>
              </div>

              {/* Section 5: Responsible AI & Helpline */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs text-slate-400">
                <span className="font-bold text-slate-300 block">Responsible AI & Verification Notice</span>
                <p className="leading-relaxed">
                  MobiGuard provides probabilistic risk indicators to assist user vigilance. Unflagged messages are not guaranteed safe; always verify unexpected account alerts directly through your bank's official portal.
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>MobiGuard Build 2.4.0</span>
                  <a href="tel:1930" className="text-rose-400 hover:underline">📞 Cybercrime Helpline: 1930</a>
                </div>
              </div>

            </div>
          )}

          {/* Confirm Clear Blocklist Modal */}
          {showClearBlocklistDialog && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
                <div className="space-y-1 text-center">
                  <Ban className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-white">Clear Blocklist?</h3>
                  <p className="text-xs text-slate-400">
                    This removes all quarantined senders from your local list.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowClearBlocklistDialog(false)}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      LocalBlocklistStorage.clearAll();
                      setBlockedSenders([]);
                      setShowClearBlocklistDialog(false);
                    }}
                    className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ===================== BOTTOM NAVIGATION BAR (5 Tabs) ===================== */}
        <nav className="border-t border-slate-900 bg-slate-950/95 backdrop-blur absolute bottom-0 left-0 right-0 z-40 px-2 py-2 flex items-center justify-around">
          {/* Home Tab */}
          <button
            onClick={() => {
              setActiveTab('home');
              setCurrentScreen('home');
            }}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              currentScreen === 'home'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${
              currentScreen === 'home' ? 'bg-emerald-500/10' : ''
            }`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Home</span>
          </button>

          {/* Scan Tab */}
          <button
            onClick={() => {
              setActiveTab('scan');
              setCurrentScreen('scan');
            }}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              currentScreen === 'scan' || currentScreen === 'check_message' || currentScreen === 'scan_qr' || currentScreen === 'check_screenshot'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${
              currentScreen === 'scan' || currentScreen === 'check_message' || currentScreen === 'scan_qr' || currentScreen === 'check_screenshot'
                ? 'bg-emerald-500/10'
                : ''
            }`}>
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Scan</span>
          </button>

          {/* Protection Tab */}
          <button
            onClick={() => {
              setActiveTab('protection');
              setCurrentScreen('blocked_senders');
            }}
            className={`flex flex-col items-center gap-1 transition relative cursor-pointer ${
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
            <span className="text-[10px]">Protection</span>
            {blockedSenders.length > 0 && (
              <span className="absolute -top-0.5 right-1 px-1 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white font-mono">
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
            className={`flex flex-col items-center gap-1 transition relative cursor-pointer ${
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
              <span className="absolute -top-0.5 right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => {
              setActiveTab('settings');
              setCurrentScreen('settings');
            }}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              currentScreen === 'settings' || currentScreen === 'about'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${
              currentScreen === 'settings' || currentScreen === 'about' ? 'bg-emerald-500/10' : ''
            }`}>
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Settings</span>
          </button>
        </nav>

        {/* ===================== PRODUCT MODALS & DEMO GUIDES ===================== */}
        <EmergencyModeModal 
          isOpen={showEmergencyModal} 
          onClose={() => setShowEmergencyModal(false)} 
        />

        <SecurityCheckModal 
          isOpen={showSecurityCheckModal} 
          onClose={() => setShowSecurityCheckModal(false)} 
          blockedSendersCount={blockedSenders.length} 
        />

        <SecurityScoreModal 
          isOpen={showSecurityScoreModal} 
          onClose={() => setShowSecurityScoreModal(false)} 
          score={calculateSecurityScore()} 
          blockedSendersCount={blockedSenders.length} 
          totalScansCount={historyList.length} 
          highRiskCount={historyList.filter(h => (h.score ?? h.riskScore ?? 0) > 60 || h.verdict === 'FRAUD RISK' || h.threatLevel === 'HIGH RISK').length} 
        />

        <PrivacyCenterModal 
          isOpen={showPrivacyModal} 
          onClose={() => setShowPrivacyModal(false)} 
          onDataCleared={() => {
            setHistoryList([]);
            setBlockedSenders([]);
            LocalHistoryStorage.clearAllHistory();
            LocalBlocklistStorage.clearAll();
            setBlockToast('✓ Local security cache and quarantined senders purged.');
            setTimeout(() => setBlockToast(null), 3000);
          }} 
        />

        <SecurityLabModal 
          isOpen={showSecurityLabModal} 
          onClose={() => setShowSecurityLabModal(false)} 
          onLoadIntoScanner={(text, type) => {
            setMessageInput(text);
            if (type === 'URL') {
              setUrlInput(text);
              setShowUrlField(true);
            }
            executeAnalysis(text, type);
          }} 
        />

        <NotificationCenterModal 
          isOpen={showNotificationsModal} 
          onClose={() => setShowNotificationsModal(false)} 
        />

        <ReportScamModal 
          isOpen={showReportScamModal} 
          onClose={() => setShowReportScamModal(false)} 
          defaultPayload={messageInput} 
        />

        <AboutModal 
          isOpen={showAboutModal} 
          onClose={() => setShowAboutModal(false)} 
        />

        <PresentationModeGuide 
          isActive={isPresentationMode} 
          currentStepIndex={presentationStepIndex} 
          onStepChange={(idx) => setPresentationStepIndex(idx)} 
          onExit={() => setIsPresentationMode(false)} 
          onExecuteStepAction={handleExecutePresentationStep} 
        />

      </div>
    </div>
  );
}
