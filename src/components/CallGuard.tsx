import React, { useState } from 'react';
import { 
  PhoneCall, ShieldAlert, ShieldCheck, AlertTriangle, ArrowLeft, 
  PhoneOff, Sparkles, CheckCircle2, UserX, AlertCircle, Info, Copy, Check
} from 'lucide-react';

interface CallGuardProps {
  onBack?: () => void;
}

interface CallAnalysisResult {
  threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK';
  riskScore: number;
  detectedTactics: string[];
  explanation: string;
  recommendedAction: string;
  isSpoofedLikely: boolean;
}

export const CallGuard: React.FC<CallGuardProps> = ({ onBack }) => {
  const [callerName, setCallerName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [callSummary, setCallSummary] = useState<string>('');
  const [analysis, setAnalysis] = useState<CallAnalysisResult | null>(null);

  const CALL_SCENARIO_PRESETS = [
    {
      title: 'Digital Arrest / Police Extortion',
      callerName: 'CBI Inspector Vikram Singh',
      phoneNumber: '+91 98110 00129',
      summary: 'Caller claims my Aadhaar is linked to money laundering in Mumbai. Demands I stay on Skype video call for "Digital Arrest" and transfer ₹1,50,000 security bond to RBI verification account.',
      expected: 'HIGH RISK'
    },
    {
      title: 'Bank Manager OTP Solicitation',
      callerName: 'SBI Credit Card Dept',
      phoneNumber: '+91 78901 23456',
      summary: 'Caller says someone is using my debit card in Dubai. To block the unauthorized charge of ₹45,000, I must immediately read out the 6-digit OTP received on my phone.',
      expected: 'HIGH RISK'
    },
    {
      title: 'Customs Parcel Narcotics Threat',
      callerName: 'FedEx Customs Terminal',
      phoneNumber: '+91 99887 76655',
      summary: 'Caller claims a package containing illegal passports and drugs sent to Taiwan was seized in my name. Demands immediate penalty fine via UPI to avoid imminent arrest warrant.',
      expected: 'HIGH RISK'
    },
    {
      title: 'Electricity Officer Disconnection',
      callerName: 'Electricity Board Desk',
      phoneNumber: '+91 91234 56789',
      summary: 'Caller says my electricity connection will be cut in 30 minutes due to unpaid bill of ₹1,200. Demands I download AnyDesk so they can help update meter bill.',
      expected: 'HIGH RISK'
    },
    {
      title: 'Genuine Bank Follow-up',
      callerName: 'HDFC Home Loans',
      phoneNumber: '1800 202 6161',
      summary: 'Representative inquiring about a loan application I submitted yesterday. Did NOT ask for OTP, passwords, or any money transfers. Offered to schedule in-branch visit.',
      expected: 'SAFE'
    }
  ];

  const handleAnalyzeCall = () => {
    const text = (callSummary + ' ' + callerName + ' ' + phoneNumber).toLowerCase();
    if (!callSummary.trim()) return;

    const detectedTactics: string[] = [];
    let riskScore = 20;
    let threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK' = 'SAFE';

    // Check Tactics
    if (/(otp|one time password|pin|cvv|code|digit)/i.test(text)) {
      detectedTactics.push('OTP / Security Code Solicitation');
      riskScore += 40;
    }
    if (/(police|cbi|customs|court|arrest|warrant|drugs|narcotics|crime branch|cyber police)/i.test(text)) {
      detectedTactics.push('Authority Impersonation & Digital Arrest Intimidation');
      riskScore += 45;
    }
    if (/(immediately|urgent|within 30 minutes|tonight|right now|disconnect|block|cancel)/i.test(text)) {
      detectedTactics.push('High-Urgency Panic Tactics');
      riskScore += 25;
    }
    if (/(transfer|upi|account|fee|fine|penalty|deposit|refund|bond)/i.test(text)) {
      detectedTactics.push('Demands for Money / UPI Transfers');
      riskScore += 35;
    }
    if (/(anydesk|teamviewer|quicksupport|screen share|skype|download)/i.test(text)) {
      detectedTactics.push('Remote Access App Hijacking (AnyDesk / TeamViewer)');
      riskScore += 45;
    }

    if (riskScore >= 70) {
      threatLevel = 'HIGH RISK';
    } else if (riskScore >= 40) {
      threatLevel = 'SUSPICIOUS';
    } else {
      threatLevel = 'SAFE';
    }

    const cappedScore = Math.min(99, Math.max(15, riskScore));

    let explanation = '';
    let recommendedAction = '';

    if (threatLevel === 'HIGH RISK') {
      explanation = 'This call pattern matches known organized cybercrime syndicates using impersonation, fake legal threats ("Digital Arrest"), or OTP traps.';
      recommendedAction = 'End the call immediately! Do NOT transfer money or install screen sharing apps. Contact the organization directly via its official verified number.';
    } else if (threatLevel === 'SUSPICIOUS') {
      explanation = 'Unverified caller requesting sensitive actions or urgent responses without formal written confirmation.';
      recommendedAction = 'Do not provide personal details. Hang up and verify the caller via the official banking app or customer portal.';
    } else {
      explanation = 'No aggressive scam signals, money demands, or OTP requests detected in this interaction summary.';
      recommendedAction = 'Always remain vigilant. Never share passwords or OTPs even if a caller sounds friendly.';
    }

    setAnalysis({
      threatLevel,
      riskScore: cappedScore,
      detectedTactics,
      explanation,
      recommendedAction,
      isSpoofedLikely: threatLevel === 'HIGH RISK' && (phoneNumber.startsWith('+91') || phoneNumber.length >= 10)
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with Android Native Feature Prototype Badge */}
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
              <PhoneCall className="w-5 h-5 text-amber-400" />
              <span>Call Guard</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                PROTOTYPE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Scam caller intelligence and digital arrest threat analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Required Prototype & AI Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-xs text-slate-300 space-y-2">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <span className="font-bold text-amber-300 block">
              AI Risk Analysis — Not a Verified Identity Database
            </span>
            <p className="text-slate-400">
              MobiGuard analyzes behavioral patterns, urgency cues, and social-engineering tactics. It does <em>not</em> claim to identify a caller with absolute certainty.
            </p>
          </div>
        </div>

        {/* Golden Rule Warning Card */}
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-700/50 text-[11px] text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Golden Rule:</strong> NEVER share OTPs, banking passwords, or UPI PINs over the phone. Real bank or government officials will <em>never</em> ask for your PIN, OTP, or remote screen-sharing access.
          </span>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">Caller Name / Title</label>
            <input
              type="text"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              placeholder="e.g. Police Officer / Bank Rep"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">Phone Number</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">
            Conversation / Call Summary
          </label>
          <textarea
            value={callSummary}
            onChange={(e) => setCallSummary(e.target.value)}
            placeholder="What did the caller say or demand? (e.g. Asked for OTP, threatened electricity disconnection, claimed to be CBI...)"
            className="w-full h-20 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
          />
        </div>

        <button
          onClick={handleAnalyzeCall}
          disabled={!callSummary.trim()}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Analyze Caller Threats</span>
        </button>

        {/* Demo Scenarios */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Try Simulated Caller Scenarios:
          </span>
          <div className="space-y-1.5">
            {CALL_SCENARIO_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCallerName(preset.callerName);
                  setPhoneNumber(preset.phoneNumber);
                  setCallSummary(preset.summary);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/50 transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{preset.title}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                      preset.expected === 'HIGH RISK' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {preset.expected}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[280px]">
                    {preset.summary}
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-bold">Load →</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Output */}
      {analysis && (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border transition-all ${
            analysis.threatLevel === 'HIGH RISK'
              ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/30'
              : analysis.threatLevel === 'SUSPICIOUS'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30'
              : 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  analysis.threatLevel === 'HIGH RISK' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  <PhoneOff className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      {analysis.threatLevel === 'HIGH RISK' ? 'CRITICAL SCAM CALL' : analysis.threatLevel}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                      Risk: {analysis.riskScore}/100
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {callerName || 'Unknown Caller'} ({phoneNumber || 'Hidden Number'})
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              {analysis.explanation}
            </p>
          </div>

          {/* Detected Tactics */}
          {analysis.detectedTactics.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Detected Social Engineering Tactics
              </h3>
              <div className="space-y-1.5">
                {analysis.detectedTactics.map((tactic, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-200 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>{tactic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Action */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Recommended Action
            </h3>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-medium">
              {analysis.recommendedAction}
            </div>
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Indian Cybercrime Helpline:</span>
              <a href="tel:1930" className="font-mono font-bold text-rose-400 hover:underline">
                📞 Call 1930
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
