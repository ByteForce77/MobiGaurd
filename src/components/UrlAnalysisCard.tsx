import React from 'react';
import { ExternalLink, Globe, AlertTriangle, ShieldCheck, ShieldAlert, Lock, AlertOctagon } from 'lucide-react';
import { UrlAnalysisResult } from '../lib/urlAnalyzer';

interface UrlAnalysisCardProps {
  urlAnalysis: UrlAnalysisResult;
}

export const UrlAnalysisCard: React.FC<UrlAnalysisCardProps> = ({ urlAnalysis }) => {
  const isHighRisk = urlAnalysis.riskScore >= 60;
  const isSuspicious = urlAnalysis.riskScore >= 30 && urlAnalysis.riskScore < 60;

  return (
    <div
      id="url-analysis-card"
      className={`p-4 rounded-2xl border transition space-y-3 ${
        isHighRisk
          ? 'bg-rose-950/30 border-rose-500/40 text-rose-100'
          : isSuspicious
          ? 'bg-amber-950/30 border-amber-500/40 text-amber-100'
          : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl ${
              isHighRisk
                ? 'bg-rose-500/20 text-rose-400'
                : isSuspicious
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isHighRisk ? (
              <ShieldAlert className="w-4 h-4" />
            ) : isSuspicious ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              URL & Link Security Dissector
            </span>
            <span className="text-xs font-mono font-bold text-white break-all">
              {urlAnalysis.domain || urlAnalysis.normalizedUrl}
            </span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
            isHighRisk
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : isSuspicious
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {urlAnalysis.threatLevel} ({urlAnalysis.riskScore}/100)
        </span>
      </div>

      {/* Target URL string */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Target Destination:</span>
          <span className="font-mono text-[9px] text-slate-500">{urlAnalysis.protocol || 'http:'}</span>
        </div>
        <p className="font-mono text-[11px] text-slate-200 break-all select-all">
          {urlAnalysis.originalUrl || urlAnalysis.normalizedUrl}
        </p>
      </div>

      {/* Findings */}
      {urlAnalysis.findings.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
            Observed URL Risk Factors:
          </span>
          <div className="space-y-1">
            {urlAnalysis.findings.map((f, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 text-xs"
              >
                <AlertOctagon
                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    f.type === 'CRITICAL'
                      ? 'text-rose-400'
                      : f.type === 'WARNING'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                />
                <div className="leading-snug">
                  <span className="font-bold text-slate-200 mr-1">{f.title}:</span>
                  <span className="text-slate-300 text-[11px]">{f.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strict Caution Warning */}
      <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50 text-[11px] text-rose-200 flex items-start gap-2 leading-relaxed">
        <Lock className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
        <span>
          <strong>Safety Precaution:</strong> MobiGuard will never automatically open, execute, or redirect to untrusted links. Do not visit suspicious addresses or provide credentials on unverified websites.
        </span>
      </div>

      {/* Honest Local Heuristic Notice */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
        <span>Analysis Method: {urlAnalysis.reputationMethod || 'Local Structural Heuristics'}</span>
        <span className="text-slate-500">{urlAnalysis.reputationDisclaimer || 'Evaluated locally without external blacklist API lookups.'}</span>
      </div>
    </div>
  );
};
