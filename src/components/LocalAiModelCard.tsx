import React from 'react';
import { LocalAiInferenceResult } from '../lib/localAiModel';
import { Cpu, ShieldCheck, Zap, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

interface LocalAiModelCardProps {
  localAi?: LocalAiInferenceResult;
}

export const LocalAiModelCard: React.FC<LocalAiModelCardProps> = ({ localAi }) => {
  if (!localAi) return null;

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3">
      {/* Title & Engine info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Browser Demo Mode — Local AI unavailable</span>
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                HEURISTIC ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">On-device pattern matching & heuristic threat matrix</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-mono text-cyan-400">
            <Zap className="w-3 h-3 text-cyan-400" />
            {localAi.telemetry.latencyMs}ms
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            0 bytes shared
          </span>
        </div>
      </div>

      {/* Vector bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Urgency</span>
            <span className="font-mono text-amber-400">{localAi.vectors.urgency}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${localAi.vectors.urgency}%` }}
            />
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Contradiction</span>
            <span className="font-mono text-rose-400">{localAi.vectors.contradiction}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-500 rounded-full transition-all duration-300"
              style={{ width: `${localAi.vectors.contradiction}%` }}
            />
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Phishing</span>
            <span className="font-mono text-orange-400">{localAi.vectors.phishing}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${localAi.vectors.phishing}%` }}
            />
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Impersonation</span>
            <span className="font-mono text-purple-400">{localAi.vectors.impersonation}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${localAi.vectors.impersonation}%` }}
            />
          </div>
        </div>
      </div>

      {/* Activated Tokens */}
      {localAi.activatedTokens.length > 0 && (
        <div className="pt-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-cyan-400" />
            Activated Neural Weight Tokens
          </div>
          <div className="flex flex-wrap gap-1.5">
            {localAi.activatedTokens.map((t, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800/90 text-slate-200 border border-slate-700/80 flex items-center gap-1"
              >
                <span>"{t.token}"</span>
                <span className={`text-[9px] font-bold ${
                  t.weight > 85 ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  +{t.weight}w
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
