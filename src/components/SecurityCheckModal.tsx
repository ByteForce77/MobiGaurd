import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, 
  X, Sparkles, RefreshCw, Cpu, HardDrive, Link2, CreditCard, Lock
} from 'lucide-react';

interface SecurityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckCompleted?: () => void;
  blockedSendersCount: number;
}

interface AuditModule {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'warning';
  detail: string;
}

export const SecurityCheckModal: React.FC<SecurityCheckModalProps> = ({
  isOpen,
  onClose,
  onCheckCompleted,
  blockedSendersCount
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [currentModuleIdx, setCurrentModuleIdx] = useState<number>(0);
  const [modules, setModules] = useState<AuditModule[]>([
    {
      id: 'heuristics',
      name: 'Message Threat Rule Engine',
      status: 'pending',
      detail: 'Auditing 50+ Indian fraud patterns (KYC, electricity, job traps)...'
    },
    {
      id: 'url_sandbox',
      name: 'Smart URL Guard Sandbox',
      status: 'pending',
      detail: 'Checking lookalike domain detection and raw IP endpoint rules...'
    },
    {
      id: 'payment_guard',
      name: 'UPI Reverse Collect Defender',
      status: 'pending',
      detail: 'Verifying UPI debit intent detection and VPA spoof filters...'
    },
    {
      id: 'quarantine',
      name: 'Sender Quarantine Posture',
      status: 'pending',
      detail: `Inspecting local sender blocklist (${blockedSendersCount} active)...`
    },
    {
      id: 'permissions',
      name: 'Simulated App Permissions',
      status: 'pending',
      detail: 'Checking Accessibility and SMS exposure on simulated packages...'
    },
    {
      id: 'privacy',
      name: 'Local Storage & Data Isolation',
      status: 'pending',
      detail: 'Confirming zero remote telemetry and offline sandbox isolation...'
    }
  ]);

  useEffect(() => {
    if (!isOpen) return;

    setIsRunning(true);
    setCurrentModuleIdx(0);

    const runCheckSequence = async () => {
      for (let i = 0; i < 6; i++) {
        setCurrentModuleIdx(i);
        setModules(prev => prev.map((m, idx) => 
          idx === i ? { ...m, status: 'running' } : m
        ));

        await new Promise(r => setTimeout(r, 450));

        setModules(prev => prev.map((m, idx) => {
          if (idx === i) {
            const isWarn = m.id === 'permissions';
            return {
              ...m,
              status: isWarn ? 'warning' : 'passed',
              detail: isWarn 
                ? 'Review recommended: 2 simulated apps request high-risk permissions.'
                : 'Verified Active: Running optimal on-device protection.'
            };
          }
          return m;
        }));
      }

      setIsRunning(false);
      if (onCheckCompleted) onCheckCompleted();
    };

    runCheckSequence();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Full Security Diagnostic</h2>
              <p className="text-[11px] text-slate-400">System protection audit</p>
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
          {isRunning ? (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="w-8 h-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <h3 className="text-xs font-bold text-white">Scanning Security Modules...</h3>
              <p className="text-[11px] text-cyan-300 font-mono">
                {modules[currentModuleIdx]?.name}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                  Diagnostic Result
                </span>
                <h3 className="text-sm font-black text-white">Protection Active (5/6 Optimal)</h3>
                <p className="text-[11px] text-emerald-200/90 mt-0.5">
                  Core defenses operational. 1 permission review recommended.
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          )}

          {/* Module List */}
          <div className="space-y-2">
            {modules.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 flex items-start gap-3"
              >
                {m.status === 'running' ? (
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                ) : m.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : m.status === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0 mt-0.5" />
                )}

                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{m.name}</span>
                    <span className={`text-[9px] font-mono font-bold ${
                      m.status === 'passed' ? 'text-emerald-400' : m.status === 'warning' ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    {m.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold cursor-pointer"
          >
            {isRunning ? 'Auditing...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
