import React, { useState } from 'react';
import { 
  Flag, ShieldAlert, CheckCircle2, X, ExternalLink, 
  Info, ArrowRight, MessageSquare, Phone, Link2, CreditCard, Mail
} from 'lucide-react';

interface ReportScamModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPayload?: string;
  defaultChannel?: string;
}

export const ReportScamModal: React.FC<ReportScamModalProps> = ({
  isOpen,
  onClose,
  defaultPayload = '',
  defaultChannel = 'SMS'
}) => {
  const [channel, setChannel] = useState<string>(defaultChannel);
  const [suspectIdentifier, setSuspectIdentifier] = useState<string>('');
  const [scamDetails, setScamDetails] = useState<string>(defaultPayload);
  const [category, setCategory] = useState<string>('KYC_BANK');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspectIdentifier.trim() && !scamDetails.trim()) return;

    // Save locally for prototype simulation
    try {
      const existing = JSON.parse(localStorage.getItem('mobiguard_scam_reports') || '[]');
      existing.unshift({
        id: 'rep_' + Date.now(),
        channel,
        suspectIdentifier,
        scamDetails,
        category,
        reportedAt: new Date().toISOString()
      });
      localStorage.setItem('mobiguard_scam_reports', JSON.stringify(existing.slice(0, 50)));
    } catch {
      // ignore
    }

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Report Scam Incident</h2>
              <p className="text-[11px] text-slate-400">Record threat & access official reporting portals</p>
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
          
          {submitted ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Report Submitted (Prototype Mode)</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Your scam report has been cataloged in local threat storage. To report this incident to Indian authorities for legal action, use the verified portals below:
              </p>

              {/* Official Helplines */}
              <div className="pt-2 space-y-2 text-left">
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-xs text-slate-200 flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-bold text-white block">National Cybercrime Portal</span>
                    <span className="text-[10px] text-slate-400">File official FIR / complaint online (cybercrime.gov.in)</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
                </a>

                <a
                  href="https://sancharsaathi.gov.in/sfc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-xs text-slate-200 flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-bold text-white block">DoT Chakshu Citizen Portal</span>
                    <span className="text-[10px] text-slate-400">Report fraudulent SMS, WhatsApp, and calls to telecom operators</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
                </a>
              </div>

              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Channel Selector */}
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
                  Threat Medium / Channel:
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {['SMS', 'Phone', 'URL', 'UPI', 'Email', 'Social', 'QR', 'Other'].map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setChannel(item)}
                      className={`py-1.5 px-2 rounded-xl font-semibold transition cursor-pointer text-center text-xs ${
                        channel === item
                          ? 'bg-rose-500 text-white font-bold'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suspect Contact / Identifier */}
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Suspect Contact, URL, or UPI ID:
                </label>
                <input
                  type="text"
                  value={suspectIdentifier}
                  onChange={(e) => setSuspectIdentifier(e.target.value)}
                  placeholder="e.g. +91 98765 43210, https://sbi-fraud.xyz, or badguy@ybl"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              {/* Scam Category */}
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Scam Classification:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="KYC_BANK">Bank KYC / Account Suspension</option>
                  <option value="UPI_COLLECT">Fake UPI Refund / Reverse Collect</option>
                  <option value="DIGITAL_ARREST">Digital Arrest / Law Enforcement Impersonation</option>
                  <option value="ELECTRICITY">Electricity / Utility Cutoff Threat</option>
                  <option value="JOB_TASK">Part-Time Task / Telegram Job Scam</option>
                  <option value="DELIVERY">Parcel Delivery Address / Customs Fee</option>
                  <option value="PRIZE_LOTTERY">Lucky Draw / KBC Prize Bait</option>
                  <option value="PHISHING_LOGIN">Fake NetBanking / Social Login Portal</option>
                  <option value="OTHER">Other Suspicious Interaction</option>
                </select>
              </div>

              {/* Description / Message Body */}
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Message Text or Incident Details:
                </label>
                <textarea
                  value={scamDetails}
                  onChange={(e) => setScamDetails(e.target.value)}
                  placeholder="Paste the suspicious message or describe what happened..."
                  className="w-full h-20 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
                />
              </div>

              {/* Honest Notice */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  <strong>Prototype transparency:</strong> Reports are saved locally in MobiGuard for pattern recognition. For criminal investigation, please file at <em>cybercrime.gov.in</em>.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  Submit Report (Demo)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
