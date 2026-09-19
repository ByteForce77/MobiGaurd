import React from 'react';
import { 
  Play, ChevronRight, ChevronLeft, X, Sparkles, CheckCircle2, 
  ShieldCheck, ShieldAlert, Award, Eye
} from 'lucide-react';

interface PresentationStep {
  stepNumber: number;
  title: string;
  actionSummary: string;
  targetScreen: string;
  highlightNote: string;
}

const PRESENTATION_STEPS: PresentationStep[] = [
  {
    stepNumber: 1,
    title: 'Home Security Dashboard',
    actionSummary: 'Overview of protection status, 0-100 security index, and real-time threat metrics.',
    targetScreen: 'home',
    highlightNote: 'Explain that all metrics and factors are dynamically computed locally.'
  },
  {
    stepNumber: 2,
    title: 'Open Check Message',
    actionSummary: 'Launch the primary AI threat analyzer for SMS, WhatsApp, and social messages.',
    targetScreen: 'check_message',
    highlightNote: 'Demonstrate the multi-channel message input and on-device NLP rules.'
  },
  {
    stepNumber: 3,
    title: 'Load Fake KYC Scam',
    actionSummary: 'Load high-impact Indian banking KYC expiry scam (SBI NetBanking deactivation).',
    targetScreen: 'check_message_load_kyc',
    highlightNote: 'Demonstrates realistic social engineering patterns used by fraudsters.'
  },
  {
    stepNumber: 4,
    title: 'Run Instant Local Analysis',
    actionSummary: 'Execute on-device threat evaluation (zero network latency, offline capable).',
    targetScreen: 'analyze_kyc',
    highlightNote: 'Shows instant local pattern matching in under 50 milliseconds.'
  },
  {
    stepNumber: 5,
    title: 'Show Critical Verdict (HIGH RISK)',
    actionSummary: 'Inspect the 0-100 risk score, confidence rating, and quantitative verdict.',
    targetScreen: 'verdict_view',
    highlightNote: 'Clear 3-tier risk system: Safe, Suspicious, or Critical Threat.'
  },
  {
    stepNumber: 6,
    title: 'Examine Highlighted Indicators',
    actionSummary: 'Review the flagged urgency triggers, upfront fee traps, and deceptive .xyz TLDs.',
    targetScreen: 'verdict_indicators',
    highlightNote: 'Explainable AI: Users see exactly WHY content was flagged.'
  },
  {
    stepNumber: 7,
    title: 'Open Payment Guard',
    actionSummary: 'Navigate to dedicated UPI fraud verifier for collect requests and VPA handles.',
    targetScreen: 'payment_guard',
    highlightNote: 'Addresses India’s most prevalent digital fraud: UPI reverse collect exploits.'
  },
  {
    stepNumber: 8,
    title: 'Scan Fake Refund Payment Request',
    actionSummary: 'Demonstrate how attackers disguise money deduction as a "Swiggy refund".',
    targetScreen: 'payment_guard_demo',
    highlightNote: 'Golden rule: You NEVER enter a UPI PIN to receive money.'
  },
  {
    stepNumber: 9,
    title: 'Open QR Guard',
    actionSummary: 'Inspect QR codes using camera or canvas decoder before opening in banking apps.',
    targetScreen: 'scan_qr',
    highlightNote: 'Protects offline merchants and customers against swapped QR stickers.'
  },
  {
    stepNumber: 10,
    title: 'Verify Reverse Debit QR',
    actionSummary: 'MobiGuard catches upi://pay debiting funds instead of crediting account.',
    targetScreen: 'scan_qr_demo',
    highlightNote: 'Decodes deep URI parameters and prevents automatic execution.'
  },
  {
    stepNumber: 11,
    title: 'Open Threat History & Export',
    actionSummary: 'Review the locally stored audit log with category filters and JSON export.',
    targetScreen: 'history',
    highlightNote: 'Demonstrates transparency and data ownership.'
  },
  {
    stepNumber: 12,
    title: 'Explore Security Score Breakdown',
    actionSummary: 'Open detailed 6-factor security index calculation and actionable improvements.',
    targetScreen: 'security_score',
    highlightNote: 'Educates users rather than simply issuing blind warnings.'
  },
  {
    stepNumber: 13,
    title: 'Audit Privacy Center',
    actionSummary: 'Verify on-device guarantees, local-only storage, and clear data controls.',
    targetScreen: 'privacy_center',
    highlightNote: 'Zero cloud leakage: Messages never leave device without explicit consent.'
  },
  {
    stepNumber: 14,
    title: 'Android Native Roadmap',
    actionSummary: 'Show architecture of Android companion app (BroadcastReceiver, InCallService).',
    targetScreen: 'android_roadmap',
    highlightNote: 'Transparently differentiates current web prototype from native mobile APK.'
  }
];

interface PresentationModeGuideProps {
  isActive: boolean;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onExit: () => void;
  onExecuteStepAction: (step: PresentationStep) => void;
}

export const PresentationModeGuide: React.FC<PresentationModeGuideProps> = ({
  isActive,
  currentStepIndex,
  onStepChange,
  onExit,
  onExecuteStepAction
}) => {
  if (!isActive) return null;

  const step = PRESENTATION_STEPS[currentStepIndex];
  const total = PRESENTATION_STEPS.length;
  const progressPct = Math.round(((currentStepIndex + 1) / total) * 100);

  const handleNext = () => {
    if (currentStepIndex < total - 1) {
      const nextIdx = currentStepIndex + 1;
      onStepChange(nextIdx);
      onExecuteStepAction(PRESENTATION_STEPS[nextIdx]);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      onStepChange(prevIdx);
      onExecuteStepAction(PRESENTATION_STEPS[prevIdx]);
    }
  };

  return (
    <div className="fixed top-2 left-2 right-2 z-50 max-w-lg mx-auto">
      <div className="p-3.5 rounded-2xl bg-slate-950/95 border-2 border-cyan-500 shadow-2xl shadow-cyan-950/70 backdrop-blur-md space-y-2">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
              Hackathon Presentation Mode
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
              Step {step.stepNumber}/{total}
            </span>
          </div>

          <button
            onClick={onExit}
            className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
            title="Exit Presentation Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Current Step Content */}
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>{step.title}</span>
          </h3>
          <p className="text-[11px] text-slate-300 leading-snug">
            {step.actionSummary}
          </p>
          <p className="text-[10px] text-cyan-300 font-mono italic">
            💡 Presenter Note: {step.highlightNote}
          </p>
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-850">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-30 text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => onExecuteStepAction(step)}
            className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold hover:bg-cyan-900 transition cursor-pointer"
          >
            Re-run Step
          </button>

          <button
            onClick={handleNext}
            disabled={currentStepIndex === total - 1}
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-slate-950 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow"
          >
            <span>Next Step</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
