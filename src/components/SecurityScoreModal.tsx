import React from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, ArrowLeft, CheckCircle2, 
  Sparkles, X, Info, TrendingUp, Sliders, ChevronRight
} from 'lucide-react';

interface SecurityScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  blockedSendersCount: number;
  totalScansCount: number;
  highRiskCount: number;
}

export const SecurityScoreModal: React.FC<SecurityScoreModalProps> = ({
  isOpen,
  onClose,
  score,
  blockedSendersCount,
  totalScansCount,
  highRiskCount
}) => {
  if (!isOpen) return null;

  const CATEGORY_SCORES = [
    {
      name: 'Scam Awareness',
      score: 85,
      weight: '20%',
      status: 'Strong',
      description: 'Active scanning behavior and proactive verification of suspicious incoming messages.'
    },
    {
      name: 'Link Safety',
      score: 90,
      weight: '20%',
      status: 'Protected',
      description: 'Sandboxed URL dissection without executing untrusted external web scripts.'
    },
    {
      name: 'Privacy & Data Hygiene',
      score: 95,
      weight: '20%',
      status: 'Optimal',
      description: '100% on-device processing by default; zero message telemetry stored remotely.'
    },
    {
      name: 'App Permissions',
      score: 65,
      weight: '15%',
      status: 'Review Recommended',
      description: 'Accessibility and SMS permissions detected in simulated installed utility packages.'
    },
    {
      name: 'Sender Protection',
      score: blockedSendersCount > 0 ? 88 : 70,
      weight: '15%',
      status: blockedSendersCount > 0 ? 'Active Quarantine' : 'Basic',
      description: `${blockedSendersCount} suspicious sender(s) currently isolated in local quarantine.`
    },
    {
      name: 'Recent Threat Posture',
      score: 80,
      weight: '10%',
      status: 'Normal',
      description: `${totalScansCount} items evaluated; ${highRiskCount} critical risks neutralized.`
    }
  ];

  const ACTIONABLE_RECOMMENDATIONS = [
    {
      title: 'Review App Permissions in App Guard',
      points: '+8 Points',
      tip: 'Audit flashlight and cleaning utilities requesting Accessibility and SMS access.'
    },
    {
      title: 'Quarantine Repeated Scam Senders',
      points: '+5 Points',
      tip: 'Add detected phishing SMS headers (e.g. fake KYC numbers) to your Blocked Senders quarantine.'
    },
    {
      title: 'Verify Payment Requests Before Authorization',
      points: '+7 Points',
      tip: 'Check UPI collect requests using Payment Guard before tapping approve in UPI apps.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">MobiGuard Security Index</h2>
              <p className="text-[11px] text-slate-400">Holistic mobile risk posture breakdown</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Main Score Radial / Gauge Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Overall Security Rating
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white font-mono">{score}</span>
                <span className="text-sm text-slate-400 font-mono">/ 100</span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                STRONG PROTECTION ACTIVE
              </span>
            </div>

            <div className="w-20 h-20 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 flex items-center justify-center bg-slate-950 shadow-inner">
              <ShieldCheck className="w-9 h-9 text-cyan-400" />
            </div>
          </div>

          {/* Factor Breakdown */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Evaluation Factors & Weighting
            </span>

            <div className="space-y-2">
              {CATEGORY_SCORES.map((cat, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>{cat.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">({cat.weight})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-cyan-400 font-mono font-semibold">{cat.status}</span>
                      <span className="font-mono font-bold text-white text-xs">{cat.score}%</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        cat.score >= 80 ? 'bg-emerald-400' : cat.score >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400">
                    {cat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Improvements */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              How to Boost Your Security Score
            </h3>

            <div className="space-y-2">
              {ACTIONABLE_RECOMMENDATIONS.map((rec, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-white block">{rec.title}</span>
                    <span className="text-[11px] text-slate-400 leading-relaxed">{rec.tip}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                    {rec.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Certification Notice:</strong> This score is a heuristic educational metric calculated locally by MobiGuard. It does not constitute a formal cybersecurity warranty or statutory legal certification.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
