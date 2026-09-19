import React, { useState } from 'react';
import { 
  MessageSquare, ShieldAlert, ShieldCheck, AlertTriangle, ArrowLeft, 
  Upload, Copy, Sparkles, CheckCircle2, AlertCircle, Info, Lock
} from 'lucide-react';
import { FraudAnalyzer, AnalysisResult } from '../lib/fraudEngine';

interface ChatGuardProps {
  onBack?: () => void;
  onRunFullAnalysis?: (text: string, type: 'SMS' | 'QR' | 'SCREENSHOT' | 'URL') => void;
}

export const ChatGuard: React.FC<ChatGuardProps> = ({ onBack, onRunFullAnalysis }) => {
  const [chatInput, setChatInput] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const CHAT_PRESETS = [
    {
      title: 'Fake WhatsApp Support Account',
      tag: 'Support Impersonation',
      text: 'Support Agent Rahul (Meta Support ID #8812): Your WhatsApp account has been reported for violations and will be deleted in 24 hours. To verify ownership, click here and input the 6-digit confirmation SMS code: http://wa-security-check.xyz',
      expected: 'HIGH RISK'
    },
    {
      title: 'Telegram Daily Task / Job Trap',
      tag: 'Task Fraud',
      text: 'Hi dear! I am HR manager from global marketing firm. Earn ₹2,500 to ₹7,000 daily by liking YouTube videos and Google reviews. Join our official Telegram VIP channel @earnmoney_daily_tasks and deposit ₹500 initiation fee to receive daily payouts.',
      expected: 'HIGH RISK'
    },
    {
      title: 'Family Emergency Impersonation',
      tag: 'Social Engineering',
      text: 'Hi Dad, my phone fell into water and broke so I am texting you from my friend Rohit\'s number. I urgently need to pay ₹12,000 for college lab project by 5 PM. Can you please GPay to his number +91 98112 33445 right now? Love you.',
      expected: 'HIGH RISK'
    },
    {
      title: 'Romance / Foreign Parcel Customs Trap',
      tag: 'Romance Scam',
      text: 'My love, I have dispatched an expensive gift box from London with gold watch and €10,000 cash for you. But Delhi airport customs officer says you must pay ₹28,500 clearance clearance charge to account 9821003456 before 6 PM.',
      expected: 'HIGH RISK'
    },
    {
      title: 'Genuine Friend Chat',
      tag: 'Normal Chat',
      text: 'Hey! Are you free this Saturday evening? A few of us are planning dinner at Indiranagar around 8 PM. Let me know if you can join!',
      expected: 'SAFE'
    }
  ];

  const handleScanChat = () => {
    if (!chatInput.trim()) return;
    const result = FraudAnalyzer.analyze(chatInput);
    setAnalysis(result);
  };

  return (
    <div className="space-y-4">
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
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <span>Chat Guard</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                WHATSAPP & TELEGRAM
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Detect fake customer care, job traps, romance manipulation, and urgent payment requests.
            </p>
          </div>
        </div>
      </div>

      {/* Honest Access Disclaimer */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-bold text-slate-200 block">End-to-End Privacy Preservation:</span>
          <span>MobiGuard does not read your private messaging apps directly. Simply paste a suspicious message or conversation thread below for safe local evaluation.</span>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
          Paste or Upload Chat
        </label>
        
        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Paste message thread from WhatsApp, Telegram, Instagram DM, or Discord..."
          className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) setChatInput(text);
              } catch {
                // ignore
              }
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          <button
            onClick={handleScanChat}
            disabled={!chatInput.trim()}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Scan Chat Content</span>
          </button>
        </div>

        {/* Presets */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Try Sample Social Engineering Chats:
          </span>
          <div className="space-y-1.5">
            {CHAT_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setChatInput(preset.text);
                  const result = FraudAnalyzer.analyze(preset.text);
                  setAnalysis(result);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-emerald-500/50 transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{preset.title}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                      preset.expected === 'HIGH RISK' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {preset.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[280px]">
                    {preset.text}
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-bold">Load →</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border transition-all ${
            analysis.displayVerdict === 'HIGH RISK'
              ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/30'
              : analysis.displayVerdict === 'SUSPICIOUS'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30'
              : 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  analysis.displayVerdict === 'HIGH RISK' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {analysis.displayVerdict === 'HIGH RISK' ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      {analysis.displayVerdict === 'HIGH RISK' ? 'CHAT DECEPTION DETECTED' : analysis.displayVerdict}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                      Score: {analysis.score}/100
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Confidence: {analysis.confidence}% · On-Device Analysis
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              {analysis.whyFlagged || analysis.recommendation}
            </p>
          </div>

          {/* Social Engineering Tactics */}
          {analysis.detectedTactics.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Detected Manipulation Tactics
              </h3>
              <div className="space-y-1.5">
                {analysis.detectedTactics.map((tactic, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-200 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>{tactic.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-3.5">{tactic.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Protective Actions */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Recommended Protective Action
            </h3>
            <div className="space-y-1.5">
              {analysis.recommendedActions.map((action: string, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
