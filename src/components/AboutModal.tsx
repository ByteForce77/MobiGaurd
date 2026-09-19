import React from 'react';
import { 
  ShieldCheck, Smartphone, Lock, Cpu, Sparkles, X, 
  CheckCircle2, ArrowRight, ExternalLink, ShieldAlert, Heart
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
              <h2 className="text-sm font-bold text-white">About MobiGuard</h2>
              <p className="text-[11px] text-cyan-400 font-mono">"Think Before You Click, Pay, Reply or Share."</p>
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
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Mission Hero */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
              Product Vision
            </span>
            <p className="text-slate-200 leading-relaxed text-xs">
              <strong>MobiGuard</strong> is an AI-powered personal security companion designed to help users identify scams, phishing attempts, suspicious links, and fraudulent digital interactions <strong>before</strong> they become victims.
            </p>
          </div>

          {/* Problem & Solution Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <h3 className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                The Problem
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mobile users are inundated with fake KYC threats, electricity cutoff extortion, "Digital Arrest" calls, task job scams, and reverse UPI collect traps. Most existing solutions either require surrendering private SMS to third-party clouds or lack explainable risk context.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <h3 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                The MobiGuard Solution
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                An on-device first cybersecurity shield that evaluates suspicious content instantly across messages, URLs, QR codes, screenshots, payment requests, and scam phone calls with clear, explainable threat indicators and recommended protective actions.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <h3 className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Privacy Guarantees
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Zero telemetry logging. All text analysis, domain parsing, and QR decoding execute inside your browser sandbox. MobiGuard works 100% offline in Airplane Mode.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <h3 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                Android Native Architecture (Roadmap)
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                While this web app demonstrates the full detection engine, the upcoming Android APK integrates native `BroadcastReceiver` for zero-tap incoming SMS protection, `InCallService` for caller screening, and `AccessibilityService` monitoring.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-[11px] text-slate-400">
            Crafted for Google AI Studio Hackathon 2026 · MobiGuard v2.4
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
