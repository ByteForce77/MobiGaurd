import React, { useState } from 'react';
import { 
  Link2, ShieldAlert, ShieldCheck, AlertTriangle, ExternalLink, 
  Copy, Check, ArrowLeft, RefreshCw, AlertCircle, Sparkles, CheckCircle2, XCircle, Info
} from 'lucide-react';
import { analyzeUrl, UrlAnalysisResult } from '../lib/urlAnalyzer';

interface SmartUrlGuardProps {
  onBack?: () => void;
  initialUrl?: string;
}

export const SmartUrlGuard: React.FC<SmartUrlGuardProps> = ({ onBack, initialUrl = '' }) => {
  const [urlInput, setUrlInput] = useState<string>(initialUrl);
  const [analysis, setAnalysis] = useState<UrlAnalysisResult | null>(() => {
    return initialUrl ? analyzeUrl(initialUrl) : null;
  });
  const [copied, setCopied] = useState<boolean>(false);

  const DEMO_URLS = [
    { label: 'Phishing IP Login', url: 'http://192.168.1.105/hdfcbank-login/auth.html', threat: 'HIGH RISK' },
    { label: 'Spoofed Bank .XYZ', url: 'https://sbi-kyc-verify.xyz/update-pan', threat: 'HIGH RISK' },
    { label: 'Shortened Link', url: 'https://bit.ly/claim-tax-refund-92', threat: 'SUSPICIOUS' },
    { label: 'Suspicious Subdomain', url: 'https://paytm.secure-login-portal.co/verify', threat: 'HIGH RISK' },
    { label: 'Legitimate Official Bank', url: 'https://www.onlinesbi.sbi/personal/index.html', threat: 'SAFE' }
  ];

  const handleScan = (targetUrl: string = urlInput) => {
    if (!targetUrl.trim()) return;
    const result = analyzeUrl(targetUrl);
    setAnalysis(result);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header with Navigation */}
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
              <Link2 className="w-5 h-5 text-cyan-400" />
              <span>Smart URL Guard</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                SANDBOXED
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Deep link & domain structure dissection without loading malicious code.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Guarantee Notice */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed text-[11px]">
          <strong>Safe Sandbox Isolation:</strong> MobiGuard strictly parses address syntax, domain impersonation, and host architecture. Links are <em>never</em> automatically fetched or executed.
        </span>
      </div>

      {/* Input Area */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
          Paste a suspicious URL...
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example-banking-login.xyz/auth..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none"
          />
          <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          {urlInput && (
            <button
              onClick={() => { setUrlInput(''); setAnalysis(null); }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) {
                  setUrlInput(text);
                  handleScan(text);
                }
              } catch {
                // ignore
              }
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Paste from Clipboard</span>
          </button>

          <button
            onClick={() => handleScan()}
            disabled={!urlInput.trim()}
            className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Analyze URL</span>
          </button>
        </div>

        {/* Demo URL Presets */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Try Demo URLs:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_URLS.map((demo, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setUrlInput(demo.url);
                  handleScan(demo.url);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  demo.threat === 'HIGH RISK' ? 'bg-rose-500' : demo.threat === 'SUSPICIOUS' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span>{demo.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Result Display */}
      {analysis && (
        <div className="space-y-3">
          {/* Main Verdict Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            analysis.threatLevel === 'HIGH RISK'
              ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/30'
              : analysis.threatLevel === 'SUSPICIOUS'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30'
              : 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {analysis.threatLevel === 'HIGH RISK' ? (
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                ) : analysis.threatLevel === 'SUSPICIOUS' ? (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white tracking-wide">
                      {analysis.threatLevel === 'HIGH RISK' ? 'CRITICAL THREAT' : analysis.threatLevel}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-300">
                      Score: {analysis.riskScore}/100
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono break-all">
                    {analysis.domain}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block">Method</span>
                <span className="text-[11px] text-cyan-300 font-semibold">{analysis.reputationMethod}</span>
              </div>
            </div>

            {/* Prototype Heuristic Disclaimer (Honest Technical Matrix) */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                <strong>Prototype heuristic analysis:</strong> Evaluated using on-device structural analysis and impersonation patterns, without querying external commercial threat APIs.
              </span>
            </div>
          </div>

          {/* Detailed Structural Dissection */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Technical Domain Dissection
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Protocol</span>
                <span className={`font-mono font-bold flex items-center gap-1 mt-0.5 ${
                  analysis.isHttps ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {analysis.isHttps ? '✓ HTTPS (Encrypted)' : '✗ HTTP (Insecure)'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Host Type</span>
                <span className={`font-mono font-bold mt-0.5 block ${
                  analysis.isIpAddress ? 'text-rose-400' : 'text-slate-300'
                }`}>
                  {analysis.isIpAddress ? 'Raw IP Endpoint' : 'Named Domain'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">URL Shortener</span>
                <span className={`font-mono font-bold mt-0.5 block ${
                  analysis.isShortener ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {analysis.isShortener ? 'Shortened (Masked)' : 'Direct Address'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Top-Level Domain</span>
                <span className={`font-mono font-bold mt-0.5 block ${
                  analysis.suspiciousTld ? 'text-rose-400' : 'text-slate-300'
                }`}>
                  {analysis.suspiciousTld ? `High-Risk (${analysis.suspiciousTld})` : 'Standard TLD'}
                </span>
              </div>
            </div>

            {analysis.impersonatedBrand && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Brand Impersonation Detected:</strong> Looks like a spoof of <strong>{analysis.impersonatedBrand.toUpperCase()}</strong> on an unauthorized domain.
                </span>
              </div>
            )}
          </div>

          {/* Why this URL may be risky */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Why this URL may be risky
            </h3>
            
            <div className="space-y-2">
              {analysis.findings.map((finding, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                    finding.type === 'CRITICAL'
                      ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                      : finding.type === 'WARNING'
                      ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  {finding.type === 'CRITICAL' ? (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : finding.type === 'WARNING' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block text-white">{finding.title}</span>
                    <span className="text-[11px] opacity-90 leading-relaxed">{finding.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What you should do */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              What you should do
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {analysis.recommendedAction}
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => handleCopy(analysis.originalUrl)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link for Evidence'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
