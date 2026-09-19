import React, { useState } from 'react';
import { 
  FlaskConical, ShieldAlert, ShieldCheck, AlertTriangle, Play, 
  ArrowRight, X, Sparkles, CheckCircle2, QrCode, CreditCard, Link2, MessageSquare
} from 'lucide-react';
import { FraudAnalyzer, AnalysisResult } from '../lib/fraudEngine';

interface SecurityLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadIntoScanner: (text: string, type: 'SMS' | 'QR' | 'SCREENSHOT' | 'URL') => void;
}

interface AttackSimulation {
  id: string;
  name: string;
  category: string;
  icon: string;
  samplePayload: string;
  type: 'SMS' | 'QR' | 'SCREENSHOT' | 'URL';
  attackMechanic: string;
  threatIndicators: string[];
  mobiGuardDetection: string;
  recommendedAction: string;
}

const ATTACK_SIMULATIONS: AttackSimulation[] = [
  {
    id: 'sim_sms',
    name: 'Urgent Electricity Disconnection Extortion',
    category: 'SMS Scam',
    icon: '⚡',
    type: 'SMS',
    samplePayload: 'Dear consumer your electricity power will be disconnected tonight at 9:30 PM by electricity office because your previous month bill was not updated. Please immediately contact our bill officer at 9876543210: http://electricity-bill-pay.xyz',
    attackMechanic: 'Panic induction with artificial deadline (9:30 PM tonight), threat of critical utility cutoff, unofficial mobile contact number, and deceptive phishing domain.',
    threatIndicators: [
      'Panic urgency keyword: "disconnected tonight"',
      'Impersonation of state electricity board without consumer ID or meter number',
      'Unofficial 10-digit mobile number instead of utility helpline',
      'Suspicious .xyz top-level domain spoofing bill payment'
    ],
    mobiGuardDetection: 'Flags High-Risk (Score 92/100). Highlights urgency trigger phrases, isolates fake officer phone, and marks .xyz domain as high-risk phishing.',
    recommendedAction: 'Do not call the number. Pay electricity bills only via your state electricity DISCOM portal or official electricity board app.'
  },
  {
    id: 'sim_phishing',
    name: 'NetBanking Credential Harvester',
    category: 'Phishing',
    icon: '🎣',
    type: 'URL',
    samplePayload: 'http://192.168.1.105/hdfcbank-login/auth.html',
    attackMechanic: 'Sends an unencrypted HTTP link to a raw IP endpoint styled to look like an official banking login portal to steal customer IDs and passwords.',
    threatIndicators: [
      'Raw IP address endpoint host (no legitimate bank uses raw IP for web login)',
      'Unencrypted plain-text HTTP protocol (zero SSL encryption)',
      'Brand keyword "hdfcbank" placed in unauthorized URL path'
    ],
    mobiGuardDetection: 'Smart URL Guard intercepts domain. Flags raw IP and lack of HTTPS. Assigns Critical Threat (Score 95/100).',
    recommendedAction: 'Close browser immediately. Never type credentials into links arriving via SMS or email.'
  },
  {
    id: 'sim_qr',
    name: 'Reversed UPI Collect QR Exploit',
    category: 'QR Scam',
    icon: '🏁',
    type: 'QR',
    samplePayload: 'upi://pay?pa=olx_escrow_refund@icici&pn=OLX%20Marketplace&am=15000&cu=INR&tn=Receive_Payment_Enter_PIN',
    attackMechanic: 'Fraudster sends a QR code claiming "Scan this QR code and enter your UPI PIN to receive ₹15,000 for your second-hand goods". The QR actually issues a debit request.',
    threatIndicators: [
      'UPI URI uses `upi://pay` protocol configured with `am=15000`',
      'Transaction note explicitly misleads user to "Enter PIN to receive"',
      'Deceptive display name "OLX Marketplace" tied to personal ICICI VPA'
    ],
    mobiGuardDetection: 'QR Guard decodes UPI protocol before opening payment apps. Alerts: "Payment QR detected attempting to DEBIT ₹15,000 from your account".',
    recommendedAction: 'Reject immediately. Remember: You NEVER enter a UPI PIN to receive money.'
  },
  {
    id: 'sim_payment',
    name: 'Lottery Stamp Duty Advance Fee',
    category: 'Payment Scam',
    icon: '🎁',
    type: 'SMS',
    samplePayload: 'Congratulations! You won ₹25,00,000 in KBC Lucky Draw 2026. Send ₹1,500 stamp duty fee via UPI to claim prize within 2 hours: upi://pay?pa=kbcwinner@axisbank&am=1500&tn=duty',
    attackMechanic: 'Classic 419 advance-fee fraud leveraging celebrity television brand greed, asking for a small upfront payment to release non-existent fortune.',
    threatIndicators: [
      'Unsolicited jackpot reward for an unentered contest',
      'Advance payment requirement before receiving funds',
      'Artificial 2-hour urgency deadline'
    ],
    mobiGuardDetection: 'Flags High-Risk (Score 95/100). Detects advance-fee fraud schema, unrealistic reward claims, and high-pressure deadline.',
    recommendedAction: 'Delete message and block sender. Genuine lotteries never demand advance processing fees.'
  },
  {
    id: 'sim_support',
    name: 'AnyDesk Remote Hijack Tech Support',
    category: 'Fake Support',
    icon: '🎧',
    type: 'SMS',
    samplePayload: 'PhonePe Helpdesk: Your recent transaction of ₹4,200 failed. Download AnyDesk QuickSupport so executive can reverse payment: http://phonepe-support.online',
    attackMechanic: 'Posing as customer service to manipulate the victim into installing remote desktop software, granting attackers view and control of device banking apps.',
    threatIndicators: [
      'Demand to install remote screen sharing software (AnyDesk)',
      'Unverified support domain .online',
      'Unsolicited contact following a normal failed transaction'
    ],
    mobiGuardDetection: 'Flags High-Risk (Score 90/100). Identifies remote tool solicitation keyword "AnyDesk" as device takeover tactic.',
    recommendedAction: 'Never install remote screen control tools for customer service.'
  },
  {
    id: 'sim_job',
    name: 'YouTube Video Like Daily Task Trap',
    category: 'Job Scam',
    icon: '💼',
    type: 'SMS',
    samplePayload: 'Amazon part-time remote job: Earn ₹3,500–₹8,000 daily by rating hotels and YouTube videos from home! Deposit ₹500 security fee to unlock tasks: https://t.me/amazon_job_agent',
    attackMechanic: 'Ponzi-style task scam targeting students and jobseekers with promises of easy income, leading into Telegram deposit groups.',
    threatIndicators: [
      'Disproportionate daily compensation (₹8,000/day for video likes)',
      'Upfront security deposit demand',
      'Redirection to anonymous Telegram handler'
    ],
    mobiGuardDetection: 'Flags High-Risk (Score 88/100). Detects task fraud pattern, deposit requirement, and off-platform redirection.',
    recommendedAction: 'Never pay money to get a job. Block the recruiter on all platforms.'
  },
  {
    id: 'sim_investment',
    name: 'Guaranteed 300% Crypto Profit Pool',
    category: 'Investment Scam',
    icon: '📈',
    type: 'SMS',
    samplePayload: 'Guaranteed 300% return in 48 hours! Join VIP SEBI-certified institutional trading pool. Transfer minimum ₹5,000: upi://pay?pa=vipgrowth@axisbank&am=5000&tn=inv_deposit',
    attackMechanic: 'High-yield investment fraud misusing regulatory names ("SEBI-certified") promising mathematically impossible guaranteed returns.',
    threatIndicators: [
      'Guaranteed 300% return in 48 hours (guaranteed profit in securities is illegal)',
      'False claim of regulatory certification',
      'Direct peer-to-peer UPI transfer destination'
    ],
    mobiGuardDetection: 'Flags High-Risk (Score 94/100). Identifies investment fraud buzzwords, false regulatory credentials, and immediate deposit transfer.',
    recommendedAction: 'Verify all investment advisors on the official SEBI registry (sebi.gov.in) before committing funds.'
  }
];

export const SecurityLabModal: React.FC<SecurityLabModalProps> = ({ isOpen, onClose, onLoadIntoScanner }) => {
  const [selectedSim, setSelectedSim] = useState<AttackSimulation>(ATTACK_SIMULATIONS[0]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationCompleted, setSimulationCompleted] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleRunSimulation = (sim: AttackSimulation) => {
    setSelectedSim(sim);
    setIsSimulating(true);
    setSimulationCompleted(false);

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationCompleted(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-950 border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/50 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Threat Simulation Center</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  SECURITY LAB
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Interactive attack simulator for hackathon evaluation and demonstration.
              </p>
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
          
          {/* Categories / Attack Selector */}
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2">
              Select Attack Category:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ATTACK_SIMULATIONS.map((sim) => (
                <button
                  key={sim.id}
                  onClick={() => handleRunSimulation(sim)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    selectedSim.id === sim.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{sim.icon}</span>
                  <span>{sim.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Simulation Detail */}
          {isSimulating ? (
            <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="w-8 h-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-cyan-300 block">
                Executing Simulated Cyber Attack & Running MobiGuard Engine...
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              
              {/* Attack Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedSim.icon}</span>
                    <h3 className="text-sm font-bold text-white">{selectedSim.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    ATTACK VECTOR
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 break-all">
                  <span className="text-[10px] font-mono text-slate-500 block mb-1 uppercase">Sample Attack Payload:</span>
                  {selectedSim.samplePayload}
                </div>

                <div className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-200">Attack Mechanic: </strong>
                  {selectedSim.attackMechanic}
                </div>
              </div>

              {/* Threat Indicators */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Key Threat Indicators
                </h4>
                <div className="space-y-1.5">
                  {selectedSim.threatIndicators.map((indicator, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs text-rose-200 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                      <span>{indicator}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* MobiGuard Detection & Protection */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  MobiGuard Automated Detection
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30">
                  {selectedSim.mobiGuardDetection}
                </p>
              </div>

              {/* Recommended Action */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Recommended Protective Action
                </h4>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                  {selectedSim.recommendedAction}
                </div>
              </div>

              {/* Test in Scanner Action Button */}
              <button
                onClick={() => {
                  onLoadIntoScanner(selectedSim.samplePayload, selectedSim.type);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/25"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Load into Live MobiGuard Scanner →</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
          <span>MobiGuard Security Lab v2.4</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            Close Lab
          </button>
        </div>
      </div>
    </div>
  );
};
