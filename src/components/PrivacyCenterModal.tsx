import React, { useState } from 'react';
import { 
  Lock, ShieldCheck, Trash2, Download, CheckCircle2, 
  ExternalLink, X, Info, HardDrive, Cpu, EyeOff, KeyRound, AlertTriangle
} from 'lucide-react';
import { LocalHistoryStorage, LocalBlocklistStorage } from '../lib/fraudEngine';

interface PrivacyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataCleared: () => void;
}

export const PrivacyCenterModal: React.FC<PrivacyCenterModalProps> = ({
  isOpen,
  onClose,
  onDataCleared
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [clearedToast, setClearedToast] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClearAllData = () => {
    LocalHistoryStorage.clearAllHistory();
    LocalBlocklistStorage.clearAll();
    localStorage.removeItem('mobiguard_ai_mode');
    localStorage.removeItem('mobiguard_sms_permission');
    setShowClearConfirm(false);
    setClearedToast(true);
    onDataCleared();
    setTimeout(() => setClearedToast(false), 2500);
  };

  const handleExportData = () => {
    try {
      const history = LocalHistoryStorage.getRecentScans();
      const blocklist = LocalBlocklistStorage.getBlockedSenders();
      const dump = {
        exportedAt: new Date().toISOString(),
        history,
        blocklist,
        metadata: {
          app: 'MobiGuard Personal Mobile Security',
          version: '2.4.0',
          privacyStandard: 'Zero-Cloud-Telemetry'
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
      const anchor = document.createElement('a');
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", `mobiguard-privacy-dump-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">MobiGuard Privacy Center</h2>
              <p className="text-[11px] text-slate-400">Honest architecture & on-device data guarantees</p>
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
          
          {/* Toast */}
          {clearedToast && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>All local cache, scan history, and quarantined senders deleted permanently.</span>
            </div>
          )}

          {/* Core Privacy Pillars */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>AI Threat Processing</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  ON-DEVICE DEFAULT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Evaluations run locally inside your browser sandbox using compiled heuristic pattern models. Complete analysis functions in <strong>Airplane Mode</strong> without internet connectivity.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Data Storage</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  STORED LOCALLY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Scan records, quarantined phone numbers, and preferences are stored exclusively in your browser's local sandbox (`localStorage`). No user database or cloud tracking server exists.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span>Message Content</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                  NEVER LOGGED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Full private message text is discarded from volatile memory once a threat score is produced. History stores only metadata (threat level, timestamp, category).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span>External Cloud AI (Gemini)</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                  OPTIONAL & EXPLICIT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Used only when you explicitly select "Deep AI Reasoning" mode. Even then, API calls are proxied securely through a stateless backend endpoint (`/api/analyze-threat`) without permanent storage.
              </p>
            </div>
          </div>

          {/* User Data Controls */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Manage Your Stored Information
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportData}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export JSON Data</span>
              </button>

              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/40 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear Local Data</span>
              </button>
            </div>

            {/* Confirmation Alert */}
            {showClearConfirm && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 space-y-2 text-xs text-rose-200">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Confirm Permanent Data Erasure?</span>
                </div>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  This will wipe all locally stored scan history and your quarantined sender blocklist. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1 rounded-lg bg-slate-900 text-slate-300 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAllData}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Yes, Delete Everything
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Close Privacy Center
          </button>
        </div>
      </div>
    </div>
  );
};
