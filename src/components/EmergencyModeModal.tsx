import React, { useState } from 'react';
import { 
  ShieldAlert, AlertTriangle, PhoneCall, ArrowLeft, CheckCircle2, 
  ExternalLink, Lock, CreditCard, Smartphone, RefreshCw, X, AlertOctagon, Info
} from 'lucide-react';

interface EmergencyModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type IncidentType = 
  | 'CLICKED_LINK'
  | 'SHARED_OTP'
  | 'MADE_PAYMENT'
  | 'SHARED_INFO'
  | 'INSTALLED_APP'
  | 'SUSPICIOUS_CALL'
  | 'OTHER';

interface IncidentGuide {
  title: string;
  urgentActions: { step: string; detail: string; actionUrl?: string; actionLabel?: string }[];
  containmentPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const INCIDENT_GUIDES: Record<IncidentType, IncidentGuide> = {
  SHARED_OTP: {
    title: 'Shared OTP or Two-Factor Code',
    containmentPriority: 'CRITICAL',
    urgentActions: [
      {
        step: '1. Freeze Your Bank Cards & NetBanking Immediately',
        detail: 'Open your official banking app and instantly toggle "Block Card" or "Freeze NetBanking". If locked out, call your bank\'s emergency card-hotlist number immediately.'
      },
      {
        step: '2. Change Account Passwords from a Clean Device',
        detail: 'Log into your primary email and banking accounts from a trusted computer and change passwords. Ensure all other active login sessions are revoked.'
      },
      {
        step: '3. Dial 1930 Cybercrime Helpline',
        detail: 'Within the golden hour (first 2-3 hours), Indian police can issue hold orders to banks on fraudulent transactions before funds are withdrawn at ATMs.',
        actionUrl: 'tel:1930',
        actionLabel: 'Call 1930 Helpline'
      }
    ]
  },
  MADE_PAYMENT: {
    title: 'Transferred Money or Approved UPI Collect',
    containmentPriority: 'CRITICAL',
    urgentActions: [
      {
        step: '1. Report Immediately to 1930 (Golden Hour)',
        detail: 'National Cyber Crime Reporting Portal operates a financial fraud helpline (1930). Reporting within minutes allows authorities to freeze recipient accounts in real-time.',
        actionUrl: 'tel:1930',
        actionLabel: 'Call 1930 Immediately'
      },
      {
        step: '2. Note Down the Transaction Reference (UTR / Txn ID)',
        detail: 'Find the 12-digit UTR number in Google Pay / PhonePe / Paytm / bank statement. You need this for the formal police FIR complaint.'
      },
      {
        step: '3. Lodge Official Complaint at cybercrime.gov.in',
        detail: 'File an online cyber financial fraud complaint with screenshots and transaction details.',
        actionUrl: 'https://cybercrime.gov.in',
        actionLabel: 'Open Cybercrime.gov.in'
      },
      {
        step: '4. Change Your UPI PIN',
        detail: 'Even if the scammer only received a transfer, change your UPI PIN inside your payment app as a precaution.'
      }
    ]
  },
  CLICKED_LINK: {
    title: 'Clicked a Suspicious or Phishing Link',
    containmentPriority: 'HIGH',
    urgentActions: [
      {
        step: '1. Close the Browser Tab Immediately',
        detail: 'Do not enter any personal credentials, phone numbers, or passwords on the destination web page.'
      },
      {
        step: '2. If Credentials Were Typed, Change Passwords Now',
        detail: 'If you typed your banking password, net-banking PIN, or social login, change that password immediately from official web portals.'
      },
      {
        step: '3. Clear Browser Cookies & Cache',
        detail: 'Open your mobile browser settings and clear site data and cookies for recent hours to terminate any unauthorized session tokens.'
      }
    ]
  },
  INSTALLED_APP: {
    title: 'Installed Suspicious APK or Remote Support App',
    containmentPriority: 'CRITICAL',
    urgentActions: [
      {
        step: '1. Turn On Airplane Mode Immediately',
        detail: 'Sever internet access to stop remote attackers from viewing your screen or receiving keystrokes/OTPs.'
      },
      {
        step: '2. Revoke Accessibility & Device Admin Rights',
        detail: 'Go to Android Settings > Accessibility / Security > Device Administrators. Deactivate the rogue app, then uninstall it.'
      },
      {
        step: '3. If Screen Sharing (AnyDesk/TeamViewer) Was Used:',
        detail: 'Uninstall AnyDesk or TeamViewer immediately. Check recent outgoing transactions in your banking apps from another device.'
      }
    ]
  },
  SHARED_INFO: {
    title: 'Shared Aadhaar, PAN, or Debit Card Numbers',
    containmentPriority: 'HIGH',
    urgentActions: [
      {
        step: '1. Lock Your Aadhaar Biometrics',
        detail: 'Open the official mAadhaar app or visit uidai.gov.in and enable biometric lock to prevent unauthorized fingerprint/iris authentication.',
        actionUrl: 'https://myaadhaar.uidai.gov.in',
        actionLabel: 'Lock Aadhaar on UIDAI'
      },
      {
        step: '2. Hotlist / Replace Your Debit Card',
        detail: 'If you gave the 16-digit card number, expiry date, or 3-digit CVV, request your bank to reissue a new card with a new number.'
      }
    ]
  },
  SUSPICIOUS_CALL: {
    title: 'Talked to Suspicious Caller / Digital Arrest',
    containmentPriority: 'MEDIUM',
    urgentActions: [
      {
        step: '1. Disconnect the Call Completely',
        detail: 'Do not continue speaking with the caller. Block the number in your phone app.'
      },
      {
        step: '2. Understand: "Digital Arrest" Does Not Exist',
        detail: 'Indian Police, CBI, ED, and judges NEVER conduct interrogations or arrests over Skype, WhatsApp, or phone. You cannot be arrested digitally.'
      },
      {
        step: '3. Talk to Family or Visit Your Local Police Station',
        detail: 'Share the incident with family or your nearest police station for peace of mind.'
      }
    ]
  },
  OTHER: {
    title: 'General Digital Security Concern',
    containmentPriority: 'MEDIUM',
    urgentActions: [
      {
        step: '1. Preserve Evidence',
        detail: 'Take screenshots of chat conversations, SMS messages, phone numbers, and web URLs before deleting anything.'
      },
      {
        step: '2. Call National Cybercrime Helpline 1930',
        detail: 'Speak with trained cyber security advisors about your situation for direct guidance.',
        actionUrl: 'tel:1930',
        actionLabel: 'Call 1930'
      }
    ]
  }
};

export const EmergencyModeModal: React.FC<EmergencyModeModalProps> = ({ isOpen, onClose }) => {
  const [selectedIncident, setSelectedIncident] = useState<IncidentType | null>(null);

  if (!isOpen) return null;

  const currentGuide = selectedIncident ? INCIDENT_GUIDES[selectedIncident] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-950 border border-rose-600/50 rounded-3xl shadow-2xl shadow-rose-950/60 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border-b border-rose-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>Emergency Containment Protocol</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500 text-white font-bold">
                  SOS
                </span>
              </h2>
              <p className="text-[11px] text-rose-300/90">
                I Think I Was Scammed — Guided First Response
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {/* Transparent Recovery Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Honest Assistance Disclosure:</strong> MobiGuard is a security analysis companion and cannot automatically reverse bank transfers or recover stolen money. Follow these verified immediate steps to limit damage and contact official law enforcement.
            </p>
          </div>

          {!selectedIncident ? (
            <div className="space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                What happened? Select your situation:
              </span>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setSelectedIncident('MADE_PAYMENT')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/60 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💸</span>
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-rose-300 block">
                        Made a payment / transferred money
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Approved UPI collect, sent GPay/PhonePe, or bank transfer
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-rose-400 font-bold">Action Plan →</span>
                </button>

                <button
                  onClick={() => setSelectedIncident('SHARED_OTP')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/60 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔑</span>
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-rose-300 block">
                        Shared an OTP or security code
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Gave a 6-digit SMS code to someone on call or chat
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-rose-400 font-bold">Action Plan →</span>
                </button>

                <button
                  onClick={() => setSelectedIncident('CLICKED_LINK')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔗</span>
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 block">
                        Clicked a suspicious link
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Opened an SMS or WhatsApp link from an unknown source
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-bold">Action Plan →</span>
                </button>

                <button
                  onClick={() => setSelectedIncident('INSTALLED_APP')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/60 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📱</span>
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-rose-300 block">
                        Installed suspicious app or AnyDesk
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Downloaded APK from link or allowed screen sharing
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-rose-400 font-bold">Action Plan →</span>
                </button>

                <button
                  onClick={() => setSelectedIncident('SHARED_INFO')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🪪</span>
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 block">
                        Shared personal or banking information
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Aadhaar, PAN, card numbers, or NetBanking ID
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-bold">Action Plan →</span>
                </button>

                <button
                  onClick={() => setSelectedIncident('SUSPICIOUS_CALL')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📞</span>
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 block">
                        Talked to suspicious caller / Digital arrest
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Threats of police warrant, customs parcel, or power cut
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-bold">Action Plan →</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Choose another situation</span>
              </button>

              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-700/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">
                    Incident Guide
                  </span>
                  <h3 className="text-sm font-black text-white">
                    {currentGuide?.title}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500 text-white">
                  {currentGuide?.containmentPriority} PRIORITY
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {currentGuide?.urgentActions.map((action, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{action.step}</span>
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                      {action.detail}
                    </p>
                    {action.actionUrl && (
                      <div className="pl-6 pt-1">
                        <a
                          href={action.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>{action.actionLabel}</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* National Hotline Emergency Callout */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">National Cybercrime Helpline</span>
                  <span className="text-base font-black text-rose-400 block font-mono">1930 (Toll-Free 24x7)</span>
                </div>
                <a
                  href="tel:1930"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 1930</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Close Emergency Protocol
          </button>
        </div>
      </div>
    </div>
  );
};
