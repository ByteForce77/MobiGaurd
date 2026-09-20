import React, { useState } from 'react';
import { 
  MessageSquare, ShieldAlert, ShieldCheck, AlertTriangle, ArrowLeft, 
  Copy, Check, Sparkles, AlertCircle, Info, Lock, Bell, BellRing,
  ExternalLink, Ban, Flag, Shield, Send, RefreshCw, CheckCircle2,
  Share2, Radio, Eye, EyeOff
} from 'lucide-react';
import { FraudAnalyzer, AnalysisResult } from '../lib/fraudEngine';
import { extractUrls, analyzeUrl } from '../lib/urlAnalyzer';

interface MessageGuardProps {
  onBack?: () => void;
  onRunFullAnalysis?: (text: string, type: 'SMS' | 'QR' | 'SCREENSHOT' | 'URL') => void;
  onBlockSender?: (sender: string, reason: string) => void;
  onReportScam?: (text: string) => void;
  initialText?: string;
  initialSource?: string;
}

interface IncomingNotificationMock {
  id: string;
  app: 'WhatsApp' | 'Messages (SMS)' | 'Telegram' | 'Paytm' | 'SBI YONO';
  sender: string;
  title: string;
  preview: string;
  time: string;
  threatPreview: 'HIGH RISK' | 'SUSPICIOUS' | 'SAFE';
  category: string;
}

export const MessageGuard: React.FC<MessageGuardProps> = ({ 
  onBack, 
  onRunFullAnalysis,
  onBlockSender,
  onReportScam,
  initialText = '',
  initialSource = ''
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'direct_message' | 'inter_app_share' | 'notification_listener'>(
    initialSource ? 'direct_message' : 'direct_message'
  );
  const [messageText, setMessageText] = useState<string>(initialText);
  const [senderName, setSenderName] = useState<string>('');
  const [incomingSourceApp, setIncomingSourceApp] = useState<string>(initialSource);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    return initialText.trim() ? FraudAnalyzer.analyze(initialText) : null;
  });
  const [copied, setCopied] = useState<boolean>(false);
  const [actionDoneToast, setActionDoneToast] = useState<string | null>(null);

  // Android Notification Listener permission simulation
  const [notificationAccessGranted, setNotificationAccessGranted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mobiguard_notification_access') === 'true';
    } catch {
      return false;
    }
  });
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false);

  const DEMO_PRESETS = [
    {
      id: 'demo_kyc',
      label: 'Fake Bank KYC Alert [DEMO]',
      sender: 'VM-SBINB',
      text: 'Dear Customer, your SBI account KYC has expired. Your NetBanking and UPI will be blocked tonight at 11:59 PM. Update your PAN card and Aadhaar immediately to avoid ₹2,500 fine: https://sbi-kyc-update.xyz/login',
      type: 'Fake KYC / Bank Alert',
      threat: 'HIGH RISK' as const
    },
    {
      id: 'demo_phishing',
      label: 'Phishing URL Attack [DEMO]',
      sender: 'HDFC-ALERT',
      text: 'SECURITY WARNING: Unauthorized login attempt from unknown IP in Lagos. Please verify your banking credentials immediately to protect your funds: http://192.168.1.105/hdfcbank-login/auth.html',
      type: 'Phishing Attempt',
      threat: 'HIGH RISK' as const
    },
    {
      id: 'demo_otp',
      label: 'OTP Solicitation Scam [DEMO]',
      sender: '+91 98123 45678',
      text: 'Hi, I am calling from Airtel Support. To complete your 5G SIM upgrade, share the 6-digit one-time password (OTP) sent to your mobile right now. Failure to share will suspend your number.',
      type: 'OTP Request Trap',
      threat: 'HIGH RISK' as const
    },
    {
      id: 'demo_prize',
      label: 'Lottery / Prize Fraud [DEMO]',
      sender: 'KBC-WINNER',
      text: 'CONGRATULATIONS! Your WhatsApp number has won ₹25,00,000 in KBC Lucky Draw 2026. Send ₹1,200 stamp duty registration fee to UPI id kbc.reward88@ybl within 1 hour to claim cheque.',
      type: 'Prize / Lottery Scam',
      threat: 'HIGH RISK' as const
    },
    {
      id: 'demo_job',
      label: 'Fake Job / Task Scam [DEMO]',
      sender: '+44 7911 123456',
      text: 'Work from home! Earn ₹3,500 to ₹8,000 daily by liking YouTube videos and Google reviews. Deposit ₹500 refundable trial fee to activate daily payout portal: https://t.me/vip_task_earnings',
      type: 'Job / Investment Scam',
      threat: 'HIGH RISK' as const
    },
    {
      id: 'demo_payment',
      label: 'Urgent Payment Request [DEMO]',
      sender: '+91 98765 43210',
      text: 'Dad, my phone broke so texting from friend phone. Hospital demands ₹15,000 immediate advance for urgent surgery. Please send money now to upi://pay?pa=hospitaldesk@okaxis&am=15000&tn=emergency',
      type: 'Urgent Payment / Impersonation',
      threat: 'HIGH RISK' as const
    },
    {
      id: 'demo_safe',
      label: 'Authentic Bank Transaction [DEMO]',
      sender: 'AX-HDFCBK',
      text: 'Your A/C ending in 4108 is debited for INR 450.00 on 20-Sep-2026 at SWIGGY BANGALORE. Avail Bal: INR 18,420.50. Call 18002026161 if not done by you.',
      type: 'Genuine Notification',
      threat: 'SAFE' as const
    }
  ];

  const MOCK_NOTIFICATIONS: IncomingNotificationMock[] = [
    {
      id: 'notif_1',
      app: 'WhatsApp',
      sender: 'Customer Support Desk',
      title: 'WhatsApp Security Team #4912',
      preview: 'Your account reported for community violation. Verify ownership with 6-digit code or account will be deleted: http://wa-verify.club',
      time: 'Just now',
      threatPreview: 'HIGH RISK',
      category: 'Fake Customer Support'
    },
    {
      id: 'notif_2',
      app: 'Messages (SMS)',
      sender: 'VM-SBIKYC',
      title: 'URGENT: NetBanking Suspended',
      preview: 'Dear user, SBI Netbanking blocked today due to pending KYC. Click http://sbi-pan-update.xyz to submit documents immediately.',
      time: '2m ago',
      threatPreview: 'HIGH RISK',
      category: 'Fake KYC/Bank Alert'
    },
    {
      id: 'notif_3',
      app: 'Telegram',
      sender: 'Global HR Manager Maria',
      title: 'Part-Time Task Offer',
      preview: 'Earn ₹5,000 daily reviewing maps. Deposit ₹500 initiation fee to start receiving direct payments today.',
      time: '14m ago',
      threatPreview: 'HIGH RISK',
      category: 'Job/Investment Scam'
    },
    {
      id: 'notif_4',
      app: 'Paytm',
      sender: 'Paytm Cash Desk',
      title: 'Cashback ₹1,850 Pending',
      preview: 'You received ₹1,850 cashback reward! Click collect request and enter your UPI PIN to credit your bank account.',
      time: '35m ago',
      threatPreview: 'HIGH RISK',
      category: 'UPI PIN / Collect Trap'
    },
    {
      id: 'notif_5',
      app: 'Messages (SMS)',
      sender: 'BLUEDART',
      title: 'Delivery Update',
      preview: 'Your shipment 8847291034 is out for delivery with courier associate Ramesh. Share delivery code 4912 upon receipt.',
      time: '1h ago',
      threatPreview: 'SAFE',
      category: 'Authentic Courier Alert'
    }
  ];

  const handleAnalyzeText = (textToAnalyze: string = messageText) => {
    if (!textToAnalyze.trim()) return;
    const result = FraudAnalyzer.analyze(textToAnalyze);
    setAnalysis(result);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMessageText(text);
        handleAnalyzeText(text);
      }
    } catch {
      // Fallback
    }
  };

  const handleSelectPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setMessageText(preset.text);
    setSenderName(preset.sender);
    handleAnalyzeText(preset.text);
  };

  const handleToggleNotificationAccess = () => {
    if (!notificationAccessGranted) {
      setShowPermissionDialog(true);
    } else {
      setNotificationAccessGranted(false);
      localStorage.setItem('mobiguard_notification_access', 'false');
      setActionDoneToast('Notification access revoked.');
      setTimeout(() => setActionDoneToast(null), 2500);
    }
  };

  const handleConfirmNotificationPermission = () => {
    setNotificationAccessGranted(true);
    localStorage.setItem('mobiguard_notification_access', 'true');
    setShowPermissionDialog(false);
    setActionDoneToast('✓ Android Notification Listener enabled. Monitoring active.');
    setTimeout(() => setActionDoneToast(null), 3000);
  };

  const handleAnalyzeNotification = (notif: IncomingNotificationMock) => {
    setMessageText(notif.preview);
    setSenderName(`${notif.app}: ${notif.sender}`);
    setActiveSubTab('direct_message');
    handleAnalyzeText(notif.preview);
  };

  const triggerToast = (msg: string) => {
    setActionDoneToast(msg);
    setTimeout(() => setActionDoneToast(null), 3000);
  };

  // Determine threat badge styling
  const getThreatBadge = (level: string) => {
    if (level === 'HIGH RISK') {
      return {
        bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        dot: 'bg-rose-500',
        icon: <ShieldAlert className="w-5 h-5 text-rose-400" />
      };
    }
    if (level === 'SUSPICIOUS') {
      return {
        bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
        dot: 'bg-amber-400',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />
      };
    }
    return {
      bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
      dot: 'bg-emerald-400',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />
    };
  };

  return (
    <div className="space-y-4">
      {/* Action Toast */}
      {actionDoneToast && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-medium flex items-center justify-between shadow-lg animate-fadeIn">
          <span>{actionDoneToast}</span>
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <span>Message Guard</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                AI SCANNER
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Direct message & notification analysis for SMS, WhatsApp, and Telegram fraud.
            </p>
          </div>
        </div>

        {/* Privacy Mode Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-emerald-500/40 text-[10px] font-medium text-emerald-300">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Local Privacy Mode</span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex p-1 bg-slate-900/90 rounded-xl border border-slate-800 gap-1">
        <button
          onClick={() => setActiveSubTab('direct_message')}
          className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'direct_message'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Analyze Text</span>
        </button>

        <button
          onClick={() => setActiveSubTab('inter_app_share')}
          className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeSubTab === 'inter_app_share'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Direct Input (SMS/WA)</span>
          <span className="text-[9px] font-mono px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
            AUTO
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('notification_listener')}
          className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeSubTab === 'notification_listener'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notification Guard</span>
          {notificationAccessGranted && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* DIRECT MESSAGE SCANNER TAB */}
      {activeSubTab === 'direct_message' && (
        <div className="space-y-4">
          {/* Incoming External App Banner if loaded via Share Target */}
          {incomingSourceApp && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 text-xs text-cyan-200 flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Direct Input Received</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-900 text-cyan-200 border border-cyan-700">
                      {incomingSourceApp}
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-300/80">
                    Transferred directly from external application without cloud upload.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIncomingSourceApp('')}
                className="text-[11px] text-cyan-400 hover:text-white px-2 py-1 rounded bg-slate-900/60 border border-cyan-800 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input Card */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Paste or type suspicious message</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSubTab('inter_app_share')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/50 text-[11px] font-semibold text-cyan-300 transition flex items-center gap-1 cursor-pointer"
                  title="Direct input from WhatsApp or SMS"
                >
                  <Share2 className="w-3 h-3" />
                  <span>External Input</span>
                </button>
                <button
                  onClick={handlePaste}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Paste</span>
                </button>
                {messageText && (
                  <button
                    onClick={() => {
                      setMessageText('');
                      setAnalysis(null);
                    }}
                    className="px-2 py-1 text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Example: 'Dear SBI user, your NetBanking account will be blocked tonight at 9:30 PM due to expired KYC. Click link to verify...'"
                rows={4}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-500 transition resize-none outline-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {messageText.length} characters • Never uploaded to any external server
              </span>
              <button
                onClick={() => handleAnalyzeText()}
                disabled={!messageText.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scan Message Now</span>
              </button>
            </div>
          </div>

          {/* Quick Demo Scenarios */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Test Scenarios [DEMO]</span>
              </span>
              <span className="text-[10px] text-slate-500">Tap to load and analyze</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition text-left cursor-pointer ${
                    p.threat === 'HIGH RISK'
                      ? 'bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border-rose-800/40'
                      : 'bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ANALYSIS VERDICT RESULT */}
          {analysis && (
            <div className="space-y-3 animate-fadeIn">
              {/* Main Threat Card */}
              {(() => {
                const badge = getThreatBadge(analysis.displayVerdict);
                return (
                  <div className={`p-4 rounded-2xl border ${badge.bg} space-y-3`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-white/10 shrink-0">
                          {badge.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">
                              {analysis.displayVerdict}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900/90 border border-white/10 text-white">
                              Score: {analysis.score}/100
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                            Threat Type: {analysis.label}
                          </span>
                        </div>
                      </div>

                      {/* Scam Probability Meter */}
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                          Scam Probability
                        </span>
                        <span className={`text-base font-black font-mono ${
                          analysis.score > 60 ? 'text-rose-400' : analysis.score > 30 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {analysis.score}%
                        </span>
                      </div>
                    </div>

                    {/* AI Security Explainer: Plain Language Explanation */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Why It Was Detected (AI Explainer)</span>
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {analysis.whyFlagged || 'Analysis completed using on-device linguistic intent and structural heuristics.'}
                      </p>
                    </div>

                    {/* Suspicious Phrases Extracted */}
                    {analysis.structuredAnalysis?.suspiciousPhrases && analysis.structuredAnalysis.suspiciousPhrases.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Suspicious Phrases Identified:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.structuredAnalysis.suspiciousPhrases.map((phrase, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 rounded-md text-[11px] bg-rose-900/40 border border-rose-700/50 text-rose-200 font-mono"
                            >
                              "{phrase}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Recommended Action</span>
                      </span>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {analysis.recommendation}
                      </p>
                    </div>

                    {/* EMERGENCY ACTION BUTTONS (For High Risk) */}
                    {analysis.displayVerdict === 'HIGH RISK' && (
                      <div className="pt-2 border-t border-rose-500/20 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Emergency Protection Actions</span>
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <button
                            onClick={() => triggerToast('Action logged: Do not click links.')}
                            className="p-2 rounded-xl bg-slate-900 border border-rose-800/40 text-[11px] font-semibold text-rose-300 hover:bg-rose-950/50 transition cursor-pointer text-center"
                          >
                            🚫 Do Not Click
                          </button>
                          <button
                            onClick={() => triggerToast('Action logged: Sender marked Do Not Reply.')}
                            className="p-2 rounded-xl bg-slate-900 border border-rose-800/40 text-[11px] font-semibold text-rose-300 hover:bg-rose-950/50 transition cursor-pointer text-center"
                          >
                            🛑 Do Not Reply
                          </button>
                          <button
                            onClick={() => triggerToast('Action logged: OTP safeguard armed.')}
                            className="p-2 rounded-xl bg-slate-900 border border-rose-800/40 text-[11px] font-semibold text-rose-300 hover:bg-rose-950/50 transition cursor-pointer text-center"
                          >
                            🔒 Never Share OTP
                          </button>
                          <button
                            onClick={() => triggerToast('Contacting official bank branch phone.')}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer text-center"
                          >
                            📞 Verify Sender
                          </button>
                          <button
                            onClick={() => {
                              if (onReportScam) onReportScam(messageText);
                              triggerToast('Scam reported to national portal 1930.');
                            }}
                            className="p-2 rounded-xl bg-rose-950/80 border border-rose-500 text-[11px] font-bold text-rose-200 hover:bg-rose-900 transition cursor-pointer text-center"
                          >
                            🚩 Report Scam
                          </button>
                          <button
                            onClick={() => {
                              const s = senderName || 'SMS-SENDER';
                              if (onBlockSender) onBlockSender(s, 'Fraud message');
                              triggerToast(`Sender "${s}" quarantined.`);
                            }}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer text-center"
                          >
                            ⛔ Block Sender
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ===================== DIRECT INTER-APP SHARING TAB ===================== */}
      {activeSubTab === 'inter_app_share' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Status & Architecture Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-cyan-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Direct Inter-App Input Pipeline</span>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      ON-DEVICE ONLY
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Receive and scan text directly from WhatsApp, SMS, Telegram, and Chrome without typing.
                  </p>
                </div>
              </div>
            </div>

            {/* Three Real Input Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Android Share Sheet</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Intent: <code className="text-cyan-300 font-mono">ACTION_SEND</code>. Share from WhatsApp or SMS directly.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Text Selection Menu</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Intent: <code className="text-cyan-300 font-mono">PROCESS_TEXT</code>. Highlight text anywhere -&gt; "Scan with MobiGuard".
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Web Share Target</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  PWA API: Handled automatically via <code className="text-cyan-300 font-mono">manifest.json</code> share receiver.
                </p>
              </div>
            </div>
          </div>

          {/* Quick-Action: 1-Tap Clipboard Ingestion */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>One-Tap Clipboard Ingestion</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">From WhatsApp or SMS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you just copied a message in WhatsApp, SMS, or Telegram, tap below to grab and analyze it immediately without opening any text boxes:
            </p>
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text && text.trim()) {
                    setMessageText(text);
                    setIncomingSourceApp('System Clipboard (WhatsApp / SMS)');
                    handleAnalyzeText(text);
                    setActiveSubTab('direct_message');
                    triggerToast('✓ Grabbed message from clipboard and scanned!');
                  } else {
                    triggerToast('Clipboard is empty or contains non-text content.');
                  }
                } catch {
                  triggerToast('Unable to read clipboard. Please paste manually or check permissions.');
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.99]"
            >
              <Copy className="w-4 h-4" />
              <span>Fetch &amp; Scan Clipboard Now</span>
            </button>
          </div>

          {/* Interactive Live Direct-Input Simulators */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulate Direct Input from Other Apps</span>
              </span>
              <span className="text-[10px] text-slate-500">Tap to test live inter-app transfer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* WhatsApp Simulator */}
              <button
                onClick={() => {
                  const txt = 'URGENT ELECTRICITY NOTICE: Dear consumer, your power supply will be disconnected tonight at 9:30 PM by electricity officer because your previous month bill was not updated. Please immediately contact our power engineer at 98765-43210 to stop power disconnect.';
                  setMessageText(txt);
                  setSenderName('WhatsApp: +91 98765-43210 (Electricity Board)');
                  setIncomingSourceApp('WhatsApp');
                  handleAnalyzeText(txt);
                  setActiveSubTab('direct_message');
                  triggerToast('✓ Received directly from WhatsApp. Analysis complete!');
                }}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-left transition space-y-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    🟢 WhatsApp Direct Share
                  </span>
                  <span className="text-[10px] text-slate-500">Emergency Threat</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                  Electricity Cutoff WhatsApp Notice
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  "Dear consumer, your power supply will be disconnected tonight at 9:30 PM..."
                </p>
              </button>

              {/* SMS Simulator */}
              <button
                onClick={() => {
                  const txt = 'VM-SBIINB: Dear SBI Customer, your NetBanking and YONO account has been suspended today due to pending PAN KYC. Click http://sbi-pan-kyc.org/update within 24 hours to prevent permanent account closure.';
                  setMessageText(txt);
                  setSenderName('Messages (SMS): VM-SBIINB');
                  setIncomingSourceApp('Messages (SMS)');
                  handleAnalyzeText(txt);
                  setActiveSubTab('direct_message');
                  triggerToast('✓ Received directly from Messages (SMS). Analysis complete!');
                }}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-left transition space-y-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    💬 Google Messages (SMS)
                  </span>
                  <span className="text-[10px] text-slate-500">Bank Phishing</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                  SBI NetBanking KYC Freeze SMS
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  "Dear SBI Customer, your NetBanking and YONO account has been suspended today..."
                </p>
              </button>

              {/* Telegram Simulator */}
              <button
                onClick={() => {
                  const txt = 'Work from home task! Earn ₹4,000 daily by liking YouTube videos and Google reviews. Deposit ₹500 refundable security fee to receive daily VIP tasks portal: https://t.me/vip_task_earnings';
                  setMessageText(txt);
                  setSenderName('Telegram: Task Recruiter Maria');
                  setIncomingSourceApp('Telegram');
                  handleAnalyzeText(txt);
                  setActiveSubTab('direct_message');
                  triggerToast('✓ Received directly from Telegram. Analysis complete!');
                }}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 text-left transition space-y-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                    ✈️ Telegram Direct Share
                  </span>
                  <span className="text-[10px] text-slate-500">Job Scam</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                  YouTube Rating Task Job Offer
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  "Earn ₹4,000 daily by liking YouTube videos. Deposit ₹500 refundable fee..."
                </p>
              </button>

              {/* UPI Banking Alert SMS */}
              <button
                onClick={() => {
                  const txt = 'AX-HDFCBK: ALERT! Debit of INR 32,500 attempted on card 8192 at DUBAI JEWELS. If this was NOT you, cancel transaction immediately: upi://pay?pa=dispute-desk@axis&am=32500&tn=Dispute';
                  setMessageText(txt);
                  setSenderName('Messages (SMS): AX-HDFCBK');
                  setIncomingSourceApp('Bank SMS (UPI Trap)');
                  handleAnalyzeText(txt);
                  setActiveSubTab('direct_message');
                  triggerToast('✓ Received directly from Bank SMS. Analysis complete!');
                }}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-850 text-left transition space-y-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                    🏦 Banking Security SMS
                  </span>
                  <span className="text-[10px] text-slate-500">Fake Dispute UPI Trap</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition">
                  Unauthorized Debit Alert
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  "Debit of INR 32,500 attempted. If this was NOT you, cancel transaction..."
                </p>
              </button>
            </div>
          </div>

          {/* User Guide: Real Device Steps */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                How to Send Directly from WhatsApp or SMS (Real Device)
              </h4>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 flex items-center justify-center font-bold text-[10px] shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-white">Long Press in WhatsApp / SMS:</strong> Tap and hold the suspicious message bubble or notification until the action bar appears.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 flex items-center justify-center font-bold text-[10px] shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-white">Tap Share or Context Menu:</strong> Select the <strong className="text-cyan-300">Share</strong> icon or the 3 dots menu. Pick <strong className="text-cyan-300">MobiGuard</strong> (or choose "Scan with MobiGuard" in the text popup).
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 flex items-center justify-center font-bold text-[10px] shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-white">Instant AI Verdict:</strong> MobiGuard automatically receives the text, decodes links and phishing patterns, and alerts you with zero typing and zero cloud uploads.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION GUARD TAB */}
      {activeSubTab === 'notification_listener' && (
        <div className="space-y-4">
          {/* Permission Status Banner */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border shrink-0 ${
                  notificationAccessGranted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Android Notification Listener</span>
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                      notificationAccessGranted
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {notificationAccessGranted ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {notificationAccessGranted
                      ? 'Actively inspecting incoming alert previews with zero cloud uploads.'
                      : 'Explicit user consent required before notifications can be inspected.'}
                  </p>
                </div>
              </div>

              {/* Toggle Button */}
              <button
                onClick={handleToggleNotificationAccess}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  notificationAccessGranted
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
              >
                {notificationAccessGranted ? 'Disable' : 'Enable Access'}
              </button>
            </div>

            {/* Permission Transparency Details */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Permission Transparency & Boundary Rules:</span>
              </span>
              <ul className="space-y-1 text-slate-400 list-disc list-inside">
                <li><strong className="text-slate-200">Permission:</strong> <code className="font-mono text-cyan-300 text-[10px]">android.permission.BIND_NOTIFICATION_LISTENER_SERVICE</code></li>
                <li><strong className="text-slate-200">Scope:</strong> Read-only inspection of incoming push notifications (title & preview text).</li>
                <li><strong className="text-slate-200">Privacy Guarantee:</strong> Never silently reads chat databases, SMS inboxes, or contact lists.</li>
              </ul>
            </div>
          </div>

          {/* Incoming Notifications Stream */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Recent Incoming Notifications Stream [DEMO]</span>
              </span>
              <span className="text-[10px] text-slate-500">Tap "Analyze" to scan</span>
            </div>

            <div className="space-y-2">
              {MOCK_NOTIFICATIONS.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                        {item.app}
                      </span>
                      <span className="text-xs font-bold text-white">{item.sender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        item.threatPreview === 'HIGH RISK'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      }`}>
                        {item.threatPreview}
                      </span>
                      <span className="text-[10px] text-slate-500">{item.time}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                    {item.preview}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Category: {item.category}
                    </span>
                    <button
                      onClick={() => handleAnalyzeNotification(item)}
                      className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Deep Scan</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Permission Confirmation Modal */}
      {showPermissionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full p-5 rounded-3xl bg-slate-900 border border-slate-700 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Enable Notification Guard?</h3>
                <p className="text-xs text-slate-400">Android System Permission Request</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
              <p className="font-semibold text-white">
                MobiGuard needs Notification Access to detect:
              </p>
              <ul className="space-y-1 text-slate-400 list-disc list-inside text-[11px]">
                <li>Suspicious links sent via WhatsApp or Telegram alerts.</li>
                <li>Fake bank KYC & NetBanking deactivation SMS notifications.</li>
                <li>Fraudulent collect requests before you approve them in UPI apps.</li>
              </ul>
              <div className="pt-1 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Zero message text leaves this device. 100% on-device AI.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPermissionDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNotificationPermission}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-xs font-bold text-white transition shadow-lg cursor-pointer"
              >
                Allow Notification Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
