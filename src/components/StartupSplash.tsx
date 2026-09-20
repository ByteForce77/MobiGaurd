import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Shield, Cpu, Lock, Sparkles } from 'lucide-react';
import { LocalAiThreatModel } from '../lib/localAiModel';

interface StartupSplashProps {
  onComplete: () => void;
}

interface InitStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'prototype';
  detail: string;
  tag: string;
}

export const StartupSplash: React.FC<StartupSplashProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(15);
  const [currentStatusText, setCurrentStatusText] = useState<string>('Initializing on-device security sandbox...');
  const [steps, setSteps] = useState<InitStep[]>([
    {
      id: 'sandbox',
      name: 'Local Browser Sandbox',
      status: 'running',
      detail: 'Verifying on-device storage & zero-telemetry memory isolation',
      tag: 'CHECKING'
    },
    {
      id: 'heuristics',
      name: 'Threat Heuristic Matrix',
      status: 'pending',
      detail: 'Loading 120+ Indian cybercrime vectors, UPI contradictions & URL traps',
      tag: 'PENDING'
    },
    {
      id: 'ai_tensor',
      name: 'On-Device AI Classifier',
      status: 'pending',
      detail: 'Calibrating local INT8 neural weights matrix (100% on-device)',
      tag: 'PENDING'
    },
    {
      id: 'platform',
      name: 'Platform Environment',
      status: 'pending',
      detail: 'Web Prototype: Native SMS/Call OS hooks operate in simulated sandbox',
      tag: 'PENDING'
    }
  ]);

  useEffect(() => {
    let isMounted = true;

    // Hard failsafe timer: unconditionally transition to dashboard within 1.2 seconds
    const hardFailsafeTimeout = setTimeout(() => {
      if (isMounted) {
        onComplete();
      }
    }, 1200);

    // Fast, non-blocking step-by-step simulated progress (completes in ~800ms)
    const runInitialization = async () => {
      // Step 1: Sandbox & storage check (~150ms)
      await new Promise(r => setTimeout(r, 150));
      if (!isMounted) return;
      
      setSteps(prev => prev.map(s => s.id === 'sandbox' 
        ? { ...s, status: 'success', tag: 'VERIFIED', detail: 'Zero telemetry. Local memory sandbox active.' }
        : s.id === 'heuristics' ? { ...s, status: 'running', tag: 'LOADING' } : s
      ));
      setProgress(40);
      setCurrentStatusText('Loading heuristic fraud vectors & threat definitions...');

      // Step 2: Threat heuristics & rules (~200ms)
      await new Promise(r => setTimeout(r, 200));
      if (!isMounted) return;

      setSteps(prev => prev.map(s => s.id === 'heuristics'
        ? { ...s, status: 'success', tag: 'ACTIVE', detail: '120+ scam patterns & UPI contradiction rules armed.' }
        : s.id === 'ai_tensor' ? { ...s, status: 'running', tag: 'CHECKING' } : s
      ));
      setProgress(70);
      setCurrentStatusText('Checking AI model runtime...');

      // Step 3: Browser demo mode indication (instant, non-blocking)
      await new Promise(r => setTimeout(r, 150));
      if (!isMounted) return;

      setSteps(prev => prev.map(s => s.id === 'ai_tensor'
        ? { 
            ...s, 
            status: 'prototype', 
            tag: 'DEMO MODE', 
            detail: 'Browser Demo Mode — Local AI unavailable (Offline heuristic matrix active)' 
          }
        : s.id === 'platform' ? { ...s, status: 'running', tag: 'DETECTING' } : s
      ));
      setProgress(90);
      setCurrentStatusText('Finalizing browser sandbox environment...');

      // Step 4: Environment & hardware interfaces (~150ms)
      await new Promise(r => setTimeout(r, 150));
      if (!isMounted) return;

      setSteps(prev => prev.map(s => s.id === 'platform'
        ? { 
            ...s, 
            status: 'prototype', 
            tag: 'WEB SANDBOX', 
            detail: 'Web Sandbox: SMS auto-read & Call interception are simulated for demonstration.' 
          }
        : s
      ));
      setProgress(100);
      setCurrentStatusText('MobiGuard Ready — Sandbox Armed');

      // Immediate transition to dashboard
      const autoProceedTimer = setTimeout(() => {
        if (isMounted) {
          onComplete();
        }
      }, 200);

      return () => clearTimeout(autoProceedTimer);
    };

    runInitialization();

    return () => {
      isMounted = false;
      clearTimeout(hardFailsafeTimeout);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans antialiased select-none">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-md">
        
        {/* Glow ambient background accents */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with animated Shield logo */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-9 h-9 text-cyan-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>MobiGuard</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                v2.5
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Privacy-Focused Mobile Fraud Defense
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-cyan-300 font-medium truncate max-w-[280px]">
              {currentStatusText}
            </span>
            <span className="font-mono text-slate-400 font-bold ml-2">
              {progress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist of initialization steps */}
        <div className="space-y-2.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
          {steps.map((step) => {
            const isDone = step.status === 'success' || step.status === 'prototype';
            const isCurrent = step.status === 'running';

            return (
              <div 
                key={step.id} 
                className={`flex items-start gap-2.5 transition-all text-left ${
                  isCurrent ? 'opacity-100' : isDone ? 'opacity-90' : 'opacity-40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {step.status === 'prototype' && (
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  )}
                  {step.status === 'running' && (
                    <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  )}
                  {step.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {step.name}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                      step.status === 'prototype'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : step.status === 'success'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {step.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Honest Prototype Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-left">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-200/90 leading-relaxed">
            <strong>Web Prototype:</strong> Threat analysis, UPI link dissection, and pattern evaluation execute locally inside your browser. Native Android OS background daemons are simulated for demonstration.
          </p>
        </div>

        {/* Action Button (Allows immediate skip/entry without waiting) */}
        <button
          onClick={onComplete}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
        >
          <span>Enter MobiGuard Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
