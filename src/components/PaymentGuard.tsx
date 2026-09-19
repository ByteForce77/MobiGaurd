import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, ArrowLeft, Copy, Check, 
  CreditCard, ArrowDownLeft, AlertCircle, Info, Sparkles, CheckCircle2,
  DollarSign, Shield, QrCode, Lock
} from 'lucide-react';
import { parseUpiUri, UpiDetails } from '../lib/fraudEngine';

interface PaymentGuardProps {
  onBack?: () => void;
  onScanMessage?: (text: string) => void;
}

interface PaymentAnalysisResult {
  inputType: 'UPI_ID' | 'UPI_LINK' | 'PAYMENT_TEXT' | 'COLLECT_REQUEST';
  target: string;
  threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK';
  riskScore: number;
  warnings: string[];
  recommendations: string[];
  details: {
    vpa?: string;
    payeeName?: string;
    amount?: string;
    transactionNote?: string;
    isCollectRequest?: boolean;
    unverifiedVpaHandle?: boolean;
  };
}

export const PaymentGuard: React.FC<PaymentGuardProps> = ({ onBack, onScanMessage }) => {
  const [paymentInput, setPaymentInput] = useState<string>('');
  const [analysis, setAnalysis] = useState<PaymentAnalysisResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const DEMO_PRESETS = [
    {
      label: 'Fake Refund Collect Request',
      input: 'upi://pay?pa=refund-desk88@ybl&pn=Swiggy%20Refund&am=1250&cu=INR&tn=Refund_Approval',
      type: 'UPI_LINK',
      threat: 'HIGH RISK'
    },
    {
      label: 'Suspicious Cashback VPA',
      input: 'gpay.cashback-claim99@okaxis',
      type: 'UPI_ID',
      threat: 'HIGH RISK'
    },
    {
      label: 'Advance Delivery Fee SMS',
      input: 'Pay ₹49 courier delivery fee to release your delayed parcel: upi://pay?pa=courier99@paytm&am=49&tn=fee',
      type: 'PAYMENT_TEXT',
      threat: 'HIGH RISK'
    },
    {
      label: 'Verified Merchant QR',
      input: 'upi://pay?pa=starbucks.bbps@hdfcbank&pn=Starbucks%20India&am=350&cu=INR&tn=Order_4901',
      type: 'UPI_LINK',
      threat: 'SAFE'
    }
  ];

  const analyzePayment = (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    let threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK' = 'SAFE';
    let riskScore = 15;
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let inputType: PaymentAnalysisResult['inputType'] = 'PAYMENT_TEXT';

    const upiUriDetails = parseUpiUri(raw);

    // If it's a raw UPI ID (e.g., name@bank)
    const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    const isDirectVpa = vpaRegex.test(raw);

    if (upiUriDetails) {
      inputType = 'UPI_LINK';
      const isSwiggyOrKnown = /(swiggy|zomato|amazon|flipkart|starbucks|uber|ola)/i.test(upiUriDetails.pn || '');
      const noteContainsRefund = /(refund|cashback|bonus|won|prize|kyc)/i.test(upiUriDetails.tn || '');
      const vpaContainsKeywords = /(refund|cashback|support|claim|help|kyc|desk)/i.test(upiUriDetails.pa || '');

      if (noteContainsRefund || vpaContainsKeywords) {
        threatLevel = 'HIGH RISK';
        riskScore = 88;
        warnings.push('Unexpected payment request: Attackers disguise outgoing debit requests as "refunds" or "cashback".');
        warnings.push('Reverse UPI Exploit: Entering your UPI PIN will DEDUCT money from your account, not receive it.');
        recommendations.push('Do NOT approve this collect request in Google Pay, PhonePe, or Paytm.');
        recommendations.push('Remember: You NEVER need to enter a UPI PIN to receive money or refunds.');
      } else if (isSwiggyOrKnown && (upiUriDetails.pa || '').endsWith('@hdfcbank')) {
        threatLevel = 'SAFE';
        riskScore = 12;
        recommendations.push('Official verified merchant VPA detected.');
      } else {
        threatLevel = 'SUSPICIOUS';
        riskScore = 45;
        warnings.push('Unverified private individual or custom payment address.');
        recommendations.push('Verify recipient identity independently before authorizing.');
      }

      setAnalysis({
        inputType,
        target: raw,
        threatLevel,
        riskScore,
        warnings,
        recommendations: [
          ...recommendations,
          'Never share OTP or UPI PIN with anyone claiming to be customer care.',
          'Do not approve unknown collect requests in your UPI apps.'
        ],
        details: {
          vpa: upiUriDetails.pa,
          payeeName: upiUriDetails.pn,
          amount: upiUriDetails.am ? `₹${upiUriDetails.am}` : undefined,
          transactionNote: upiUriDetails.tn,
          isCollectRequest: true
        }
      });
      return;
    }

    if (isDirectVpa) {
      inputType = 'UPI_ID';
      const hasSuspiciousTerms = /(refund|cashback|support|claim|reward|lottery|crypto|earn|loan|admin)/i.test(raw);
      if (hasSuspiciousTerms) {
        threatLevel = 'HIGH RISK';
        riskScore = 85;
        warnings.push('Deceptive VPA handle: Contains fraud bait terms like "cashback", "refund", or "support".');
        warnings.push('Impersonation risk: Fraudsters register unofficial UPI IDs mimicking genuine customer service.');
        recommendations.push('Do not transfer funds to unverified handles.');
      } else {
        threatLevel = 'SUSPICIOUS';
        riskScore = 40;
        warnings.push('Unverified peer-to-peer UPI ID.');
        recommendations.push('Verify recipient name displayed on the payment confirmation screen matches the intended person.');
      }

      setAnalysis({
        inputType,
        target: raw,
        threatLevel,
        riskScore,
        warnings,
        recommendations: [
          ...recommendations,
          'Recipient should be verified before sending any funds.',
          'Never share OTP or UPI PIN.'
        ],
        details: {
          vpa: raw,
          unverifiedVpaHandle: hasSuspiciousTerms
        }
      });
      return;
    }

    // General Payment Text / SMS
    const hasUpiKeywords = /(upi|gpay|phonepe|paytm|bhim|pin|collect|debit|credited)/i.test(raw);
    const hasUrgency = /(immediately|urgent|today|blocked|expire|fine)/i.test(raw);
    const hasFeeRefund = /(fee|refund|deposit|stamp duty|processing fee)/i.test(raw);

    if (hasUpiKeywords && (hasUrgency || hasFeeRefund)) {
      threatLevel = 'HIGH RISK';
      riskScore = 82;
      warnings.push('Unexpected payment demand paired with urgent or penalty threats.');
      warnings.push('Possible advance-fee fraud or unauthorized debit collect request.');
    } else if (hasUpiKeywords) {
      threatLevel = 'SUSPICIOUS';
      riskScore = 50;
      warnings.push('Payment request detected from unverified communication channel.');
    } else {
      threatLevel = 'SAFE';
      riskScore = 20;
      recommendations.push('No obvious fraudulent payment patterns detected.');
    }

    setAnalysis({
      inputType: 'PAYMENT_TEXT',
      target: raw,
      threatLevel,
      riskScore,
      warnings,
      recommendations: [
        ...recommendations,
        'Recipient should be verified.',
        'Never share OTP or UPI PIN.',
        'Do not approve unknown collect requests.'
      ],
      details: {}
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
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
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <span>Payment Fraud Guard</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                UPI DEFENDER
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Verify UPI IDs, collect requests, payment links, and transfer requests before paying.
            </p>
          </div>
        </div>
      </div>

      {/* Core Safety Golden Rule Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-500/30 text-xs text-amber-200 space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Golden Rule of UPI Safety</span>
        </div>
        <p className="text-[11px] text-amber-300/90 leading-relaxed">
          <strong>You NEVER enter a UPI PIN to receive money or get a refund.</strong> A UPI PIN is strictly used to AUTHORIZE MONEY LEAVING YOUR ACCOUNT.
        </p>
      </div>

      {/* Input Box */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
          Is this payment request safe?
        </label>
        
        <textarea
          value={paymentInput}
          onChange={(e) => setPaymentInput(e.target.value)}
          placeholder="Paste UPI ID (e.g. user@bank), payment link (upi://pay?...), or payment message here..."
          className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-500 focus:outline-none resize-none"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) {
                  setPaymentInput(text);
                  analyzePayment(text);
                }
              } catch {
                // ignore
              }
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          <button
            onClick={() => analyzePayment(paymentInput)}
            disabled={!paymentInput.trim()}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify Payment Safety</span>
          </button>
        </div>

        {/* Demo Presets */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Try Demo Payment Traps:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_PRESETS.map((demo, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPaymentInput(demo.input);
                  analyzePayment(demo.input);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-[11px] text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  demo.threat === 'HIGH RISK' ? 'bg-rose-500' : 'bg-emerald-500'
                }`} />
                <span>{demo.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="space-y-3">
          {/* Main Verdict */}
          <div className={`p-4 rounded-2xl border transition-all ${
            analysis.threatLevel === 'HIGH RISK'
              ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/30'
              : analysis.threatLevel === 'SUSPICIOUS'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30'
              : 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
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
                      {analysis.threatLevel === 'HIGH RISK' ? 'PAYMENT FRAUD RISK' : analysis.threatLevel}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-300">
                      Score: {analysis.riskScore}/100
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Type: {analysis.inputType.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* If extracted UPI details exist, show interactive demo breakdown */}
            {analysis.details.vpa && (
              <div className="mt-3.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Recipient VPA (UPI ID):</span>
                  <span className="font-mono font-bold text-white">{analysis.details.vpa}</span>
                </div>
                {analysis.details.payeeName && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Claimed Payee Name:</span>
                    <span className="font-semibold text-slate-200">{analysis.details.payeeName}</span>
                  </div>
                )}
                {analysis.details.amount && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Requested Amount:</span>
                    <span className="font-mono font-bold text-rose-400 text-sm">{analysis.details.amount}</span>
                  </div>
                )}
                {analysis.details.transactionNote && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Transaction Note:</span>
                    <span className="text-slate-300 font-mono">{analysis.details.transactionNote}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warnings List */}
          {analysis.warnings.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Fraud Indicators & Warnings
              </h3>
              <div className="space-y-2">
                {analysis.warnings.map((warning, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-200 flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Verification Steps */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Recommended Verification Steps
            </h3>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Demo Label */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulated Payment Verification Interface (DEMO)</span>
            </span>
            <span className="font-mono text-slate-500">MobiGuard Sandbox v2.4</span>
          </div>
        </div>
      )}
    </div>
  );
};
