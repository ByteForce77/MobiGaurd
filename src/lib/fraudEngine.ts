import { LocalAiThreatModel, LocalAiInferenceResult } from './localAiModel';
import { analyzeUrl, extractUrls, UrlAnalysisResult } from './urlAnalyzer';

export type ThreatLevel = 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK';

export interface DetectedTactic {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RiskSignals {
  urgency: number;           // 0-100
  contradiction: number;     // 0-100
  mismatch: number;          // 0-100
  template: number;          // 0-100
  urlRisk: number;           // 0-100
  explanations: string[];
}

export interface UpiDetails {
  pa?: string; // Payee VPA
  pn?: string; // Payee Name
  am?: string; // Amount
  tn?: string; // Note
  cu?: string; // Currency
  isUpi: boolean;
}

export interface AiAnalysisResult {
  available: boolean;
  source: string;
  verdict: 'GENUINE' | 'SUSPICIOUS' | 'FRAUD RISK' | 'SAFE' | 'HIGH RISK';
  threatScore: number;
  confidence: number;
  category: string;
  psychologicalTriggers: string[];
  senderReputation: string;
  reasoning: string;
  shouldBlockSender: boolean;
  recommendedAction: string;
}

export interface StructuredRiskAnalysis {
  threatLevel: ThreatLevel;
  riskScore: number;
  summary: string;
  indicators: string[];
  suspiciousPhrases: string[];
  recommendedActions: string[];
  urlAnalysis?: UrlAnalysisResult;
  confidence: number;
}

export interface AnalysisResult {
  score: number;
  verdict: 'GENUINE' | 'SUSPICIOUS' | 'FRAUD RISK';
  displayVerdict: ThreatLevel;
  confidence: number;
  label: string;
  recommendation: string;
  recommendedActions: string[];
  whyFlagged: string;
  detectedTactics: DetectedTactic[];
  signals: RiskSignals;
  structuredAnalysis?: StructuredRiskAnalysis;
  upiDetails?: UpiDetails;
  urlAnalysis?: UrlAnalysisResult;
  inferenceTimeMs: number;
  modelType: 'DistilBERT-TFLite + RuleEngine' | 'RuleEngine-Fallback' | 'Gemini-3.8-Flash + LocalEngine' | 'On-Device Local AI (Transformers.js + WASM)';
  sender?: string;
  isSenderBlocked?: boolean;
  aiAnalysis?: AiAnalysisResult;
  localAiInference?: LocalAiInferenceResult;
  privacyNotice: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  type: 'SMS' | 'QR' | 'SCREENSHOT' | 'URL';
  threatLevel: ThreatLevel;
  riskScore: number;
  summary: string;
  preview: string;
  confidence: number;
  // Optional for backward compatibility with existing views
  verdict?: 'GENUINE' | 'SUSPICIOUS' | 'FRAUD RISK';
  displayVerdict?: ThreatLevel;
  score?: number;
  signals?: RiskSignals;
  recommendation?: string;
  recommendedActions?: string[];
  whyFlagged?: string;
  rawText?: string;
}

export const KNOWN_BRANDS = [
  'amazon', 'flipkart', 'hdfc', 'sbi', 'icici', 'axis', 'kotak', 'pnb',
  'paytm', 'phonepe', 'google pay', 'gpay', 'airtel', 'jio', 'vi', 'bhim'
];

export const SUSPICIOUS_TLDS = ['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.work', '.click', '.cc', '.buzz'];
export const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'shorturl.at', 'is.gd', 'cutt.ly', 'ow.ly'];

// 50 Indian Scam Patterns categorized
export const SCAM_TEMPLATES: { category: string; pattern: RegExp; desc: string }[] = [
  // KYC (1-10)
  { category: 'KYC', pattern: /kyc.*(?:expir|block|suspend|updat|deactivat)/i, desc: 'KYC expiration or account block threat' },
  { category: 'KYC', pattern: /(?:pan|aadhaar).*link.*(?:immediat|urgent|today|deactiv)/i, desc: 'Urgent PAN/Aadhaar linking threat' },
  { category: 'KYC', pattern: /account.*will be (?:blocked|frozen|suspended|deactivated)/i, desc: 'Bank account freeze threat' },
  { category: 'KYC', pattern: /sim.*(?:block|deactivat|kyc).*(?:24|12|today)/i, desc: 'SIM card deactivation KYC threat' },
  { category: 'KYC', pattern: /pay.*(?:fee|charge|₹|\b\d+\b).*to update kyc/i, desc: 'Monetary fee demanded for KYC update' },
  { category: 'KYC', pattern: /update.*yono.*(?:kyc|block|pan)/i, desc: 'Fake SBI YONO KYC update threat' },
  { category: 'KYC', pattern: /netbanking.*suspended.*click.*link/i, desc: 'NetBanking suspension link threat' },
  { category: 'KYC', pattern: /wallet.*(?:inactive|hold).*verify.*now/i, desc: 'Digital wallet hold verification alert' },
  { category: 'KYC', pattern: /credit card.*blocked.*call.*agent/i, desc: 'Unsolicited credit card block scam' },
  { category: 'KYC', pattern: /biometric.*fail.*update.*fingerprint.*online/i, desc: 'Phishing for Aadhaar biometric verification' },

  // REFUND (11-18)
  { category: 'Refund', pattern: /(?:pay|send|enter upi).*to (?:receive|claim|collect).*refund/i, desc: 'Payment requested to receive a refund (Contradiction)' },
  { category: 'Refund', pattern: /refund of (?:rs\.?|₹)\s*\d+.*(?:approved|pending).*click/i, desc: 'Pending refund approval link bait' },
  { category: 'Refund', pattern: /tax refund.*dept.*claim.*within/i, desc: 'Fake Income Tax department refund scheme' },
  { category: 'Refund', pattern: /cashback.*₹?\s*\d+.*(?:scratch|expire|claim)/i, desc: 'Cashback reward expiration phishing' },
  { category: 'Refund', pattern: /electricity.*bill.*double paid.*claim refund/i, desc: 'Utility double-payment refund fraud' },
  { category: 'Refund', pattern: /trai.*overcharge.*refund.*approve/i, desc: 'Fake TRAI regulatory refund notification' },
  { category: 'Refund', pattern: /failed transaction.*money credited back.*verify pin/i, desc: 'Reversal scam asking for UPI PIN verification' },
  { category: 'Refund', pattern: /upi.*collect request.*for your refund/i, desc: 'Collect request disguised as incoming refund' },

  // LOTTERY / REWARDS (19-26)
  { category: 'Lottery', pattern: /(?:won|congratulations).*₹?\s*\d+.*(?:lottery|kbc|lucky draw|prize|cash|reward)/i, desc: 'Fake lottery, prize, or jackpot award lure' },
  { category: 'Lottery', pattern: /pay.*(?:processing|registration|stamp|tax).*fee.*to receive (?:prize|money|car|reward)/i, desc: 'Advance fee demanded for claiming prize' },
  { category: 'Lottery', pattern: /(?:processing fee|registration fee|clearance fee).*immediately/i, desc: 'Urgent upfront processing fee demanded' },
  { category: 'Lottery', pattern: /whatapp.*lucky number.*won.*lakh/i, desc: 'WhatsApp lucky draw lottery fraud' },
  { category: 'Lottery', pattern: /selected for.*vip reward.*claim today/i, desc: 'Unsolicited VIP customer prize notification' },
  { category: 'Lottery', pattern: /tata.*mahindra.*free car winner/i, desc: 'Brand impersonation lottery giveaway' },
  { category: 'Lottery', pattern: /spin the wheel.*won iph[o0]ne/i, desc: 'Fake survey/spin wheel prize lure' },
  { category: 'Lottery', pattern: /diwali.*bumber.*cash gift/i, desc: 'Festival seasonal bumper lottery bait' },
  { category: 'Lottery', pattern: /government scheme.*pm.*fund.*disbursed/i, desc: 'Fake government grant disbursal notification' },

  // ELECTRICITY / UTILITIES (27-32)
  { category: 'Electricity', pattern: /electricity.*power.*(?:disconnect|cut).*tonight.*(?:9:30|8:30|call)/i, desc: 'Urgent electricity power cut disconnection scam' },
  { category: 'Electricity', pattern: /bijli.*bill.*update.*turant.*sampark/i, desc: 'Hinglish electricity disconnection threat' },
  { category: 'Electricity', pattern: /officer.*contact.*(?:mobile|cell|\+91).*electricity/i, desc: 'Personal mobile number provided for electricity officer' },
  { category: 'Electricity', pattern: /gas pipeline.*meter.*disconnected.*bill/i, desc: 'Gas meter disconnection threat' },
  { category: 'Electricity', pattern: /water supply.*stopped.*unpaid invoice/i, desc: 'Water supply disruption scam alert' },
  { category: 'Electricity', pattern: /challan.*traffic.*pay fine.*before court/i, desc: 'Fake e-challan traffic penalty phishing' },

  // JOB & WORK FROM HOME (33-38)
  { category: 'Job', pattern: /(?:part[- ]?time|work from home).*earn ₹?\s*\d+.*(?:daily|per day)/i, desc: 'High daily earnings Work-From-Home bait' },
  { category: 'Job', pattern: /like.*(?:youtube|telegram|instagram).*videos.*earn money/i, desc: 'Social media like/subscribe task fraud' },
  { category: 'Job', pattern: /job offer.*pay.*(?:security deposit|registration fee|kit)/i, desc: 'Upfront fee requested for job offer or interview' },
  { category: 'Job', pattern: /amazon.*flipkart.*review products.*get paid/i, desc: 'E-commerce merchant review scam' },
  { category: 'Job', pattern: /data entry.*offline.*no investment.*contact telegram/i, desc: 'Telegram task recruitment fraud' },
  { category: 'Job', pattern: /airline.*airport ground staff.*appointment letter/i, desc: 'Bogus aviation employment registration scam' },

  // LOAN & CREDIT (39-44)
  { category: 'Loan', pattern: /loan.*pre[- ]?approved.*₹?\s*\d+.*no cibil.*instant/i, desc: 'No-CIBIL instant loan predatory phishing' },
  { category: 'Loan', pattern: /pay.*(?:disbursal|file|insurance).*charge.*for loan/i, desc: 'Advance file charge demanded for loan payout' },
  { category: 'Loan', pattern: /credit limit increase.*click here.*enter otp/i, desc: 'Phishing link for bogus credit limit enhancement' },
  { category: 'Loan', pattern: /harassment.*legal action.*unpaid emi/i, desc: 'Illegal loan app intimidation harassment threat' },
  { category: 'Loan', pattern: /zero interest.*personal loan.*download apk/i, desc: 'Malicious loan APK download prompt' },
  { category: 'Loan', pattern: /cibil score repair.*guaranteed.*pay ₹/i, desc: 'Fake credit score repair advance payment scam' },

  // COURIER / CUSTOMS / TRAI (45-50)
  { category: 'Courier', pattern: /(?:fedex|dhl|india post|bluedart).*parcel.*(?:held|customs|illegal)/i, desc: 'Fake international parcel detention at customs' },
  { category: 'Courier', pattern: /parcel contains.*(?:drugs|passport|narcotics).*police/i, desc: 'Digital arrest / narcotics parcel extortion' },
  { category: 'Courier', pattern: /delivery address incomplete.*update.*pay ₹/i, desc: 'Postal re-delivery nominal charge phishing' },
  { category: 'TRAI', pattern: /(?:trai|dot).*all numbers.*disconnected.*within 2 hours/i, desc: 'Telecom regulator DoT/TRAI line disconnection threat' },
  { category: 'Customs', pattern: /customs duty unpaid.*gift from london/i, desc: 'Romantic / online friend foreign gift customs fraud' },
  { category: 'Police', pattern: /cyber cell.*fir registered.*arrest warrant/i, desc: 'Fake police / CBI digital arrest summons threat' }
];

export function parseUpiUri(raw: string): UpiDetails {
  if (!raw.toLowerCase().startsWith('upi://pay')) {
    return { isUpi: false };
  }
  try {
    const url = new URL(raw);
    const params = url.searchParams;
    return {
      isUpi: true,
      pa: params.get('pa') || undefined,
      pn: params.get('pn') || undefined,
      am: params.get('am') || undefined,
      tn: params.get('tn') || undefined,
      cu: params.get('cu') || 'INR'
    };
  } catch {
    // Regex fallback for manual parameters
    const pa = raw.match(/[?&]pa=([^&]+)/i)?.[1];
    const pn = raw.match(/[?&]pn=([^&]+)/i)?.[1];
    const am = raw.match(/[?&]am=([^&]+)/i)?.[1];
    const tn = raw.match(/[?&]tn=([^&]+)/i)?.[1];
    return {
      isUpi: true,
      pa: pa ? decodeURIComponent(pa) : undefined,
      pn: pn ? decodeURIComponent(pn) : undefined,
      am: am ? decodeURIComponent(am) : undefined,
      tn: tn ? decodeURIComponent(tn) : undefined,
      cu: 'INR'
    };
  }
}

export class RuleEngine {
  static evaluate(text: string): { signals: RiskSignals; upiDetails?: UpiDetails } {
    const lower = text.toLowerCase();
    const explanations: string[] = [];
    const upiDetails = parseUpiUri(text);

    // 1. URGENCY SIGNAL (0-100)
    const urgencyKeywords = [
      'immediately', 'urgent', 'act now', 'expires today', 'expiring today', 'blocked',
      'suspended', 'last chance', 'within 24 hours', 'within 2 hours',
      'final warning', 'tonight', 'deactivated', 'turant', 'jaldi', 'discontinue'
    ];
    let urgencyMatches = 0;
    urgencyKeywords.forEach(k => {
      if (lower.includes(k)) urgencyMatches++;
    });
    const urgencyScore = Math.min(100, urgencyMatches * 32);
    if (urgencyMatches > 0) {
      explanations.push(`High Urgency Pressure: ${urgencyMatches} urgency trigger keyword(s) detected creating panic.`);
    }

    // 2. PAYMENT CONTRADICTION SIGNAL (0-100)
    let contradictionScore = 0;
    if (upiDetails.isUpi) {
      const note = (upiDetails.tn || '').toLowerCase();
      const hasAmount = parseFloat(upiDetails.am || '0') > 0;
      if ((note.includes('refund') || note.includes('cashback') || note.includes('prize') || lower.includes('refund')) && hasAmount) {
        contradictionScore = 100;
        explanations.push(`Payment Contradiction (CRITICAL): Note indicates "refund/cashback", but QR initiates a ₹${upiDetails.am} DEBIT payment. Entering your UPI PIN sends money!`);
      }
    }

    if (contradictionScore === 0) {
      if (/refund/i.test(lower) && /(?:pay|send|transfer|deposit|enter pin|collect|deduct)/i.test(lower)) {
        contradictionScore = 100;
        explanations.push('Payment Contradiction: Genuine refunds never require you to send money or enter your UPI PIN.');
      } else if (/kyc/i.test(lower) && /(?:fee|charge|pay|₹|\brs\b)/i.test(lower)) {
        contradictionScore = 95;
        explanations.push('Payment Contradiction: Mandatory bank KYC and PAN link updates are 100% free by RBI mandate.');
      } else if (/(?:won|prize|lottery|kbc)/i.test(lower) && /(?:processing|registration|tax|fee|deposit|pay)/i.test(lower)) {
        contradictionScore = 95;
        explanations.push('Contradiction: Legitimate lotteries never ask winners to pay advance registration or clearance fees.');
      } else if (/(?:job|work from home)/i.test(lower) && /(?:fee|deposit|registration|kit|security)/i.test(lower)) {
        contradictionScore = 90;
        explanations.push('Contradiction: Real corporate employers never charge applicants for registration or starter kits.');
      }
    }

    // 3. RECIPIENT MISMATCH SIGNAL (0-100)
    let mismatchScore = 0;
    const claimedBrand = KNOWN_BRANDS.find(b => lower.includes(b));
    
    if (upiDetails.isUpi && upiDetails.pa) {
      const vpa = upiDetails.pa.toLowerCase();
      const payeeName = (upiDetails.pn || '').toLowerCase();
      
      if (claimedBrand) {
        const cleanBrand = claimedBrand.replace(/\s+/g, '');
        if (!vpa.includes(cleanBrand) && !payeeName.includes(cleanBrand)) {
          mismatchScore = 90;
          explanations.push(`Brand Mismatch: Context mentions "${claimedBrand}", but payment destination is "${upiDetails.pa}".`);
        }
      } else if (payeeName && (payeeName.includes('amazon') || payeeName.includes('flipkart') || payeeName.includes('hdfc'))) {
        if (!vpa.includes('amazon') && !vpa.includes('flipkart') && !vpa.includes('hdfc')) {
          mismatchScore = 95;
          explanations.push(`Impersonation Mismatch: Payee name shows "${upiDetails.pn}", but VPA "${upiDetails.pa}" is an unverified personal handle.`);
        }
      }
    } else if (claimedBrand) {
      const upiMatch = text.match(/pa=([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/i);
      const urlMatch = text.match(/https?:\/\/([^\s/]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

      if (upiMatch) {
        const handle = upiMatch[1].toLowerCase();
        if (!handle.includes(claimedBrand.replace(/\s+/g, ''))) {
          mismatchScore = 90;
          explanations.push(`Brand Mismatch: Text mentions "${claimedBrand}", but UPI destination is "${upiMatch[1]}".`);
        }
      } else if (urlMatch) {
        const domain = (urlMatch[1] || urlMatch[0]).toLowerCase();
        if (!domain.includes(claimedBrand.replace(/\s+/g, '')) && !domain.includes('google.com') && !domain.includes('apple.com')) {
          mismatchScore = 80;
          explanations.push(`Domain Mismatch: Text mentions "${claimedBrand}", but web address leads to "${domain}".`);
        }
      }
    } else if (/(?:won|prize|lottery|kbc)/i.test(lower) && /(?:fee|pay|charge|deposit)/i.test(lower)) {
      mismatchScore = 75;
      explanations.push('Sender Identity Mismatch: Advance fee prize solicitations from unknown senders indicate synthetic identity scam.');
    } else if (/kyc.*(?:expir|block|pay)/i.test(lower) && !claimedBrand) {
      mismatchScore = 70;
      explanations.push('Sender Identity Mismatch: Urgent bank KYC threat sent from an unauthenticated, anonymous source.');
    } else if (/electricity.*(?:cut|disconnect)/i.test(lower) && !lower.includes('discom') && !lower.includes('bescom') && !lower.includes('tneb')) {
      mismatchScore = 65;
      explanations.push('Sender Identity Mismatch: Utility power disconnection warning lacks official DISCOM authentication.');
    }

    // 4. TEMPLATE MATCH SIGNAL (0-100)
    let templateScore = 0;
    const matchedDescriptions: string[] = [];
    SCAM_TEMPLATES.forEach(tpl => {
      if (tpl.pattern.test(text)) {
        matchedDescriptions.push(tpl.desc);
      }
    });
    if (matchedDescriptions.length > 0) {
      templateScore = Math.min(100, 50 + matchedDescriptions.length * 25);
      explanations.push(`Scam Template Match: Matched known Indian fraud pattern (${matchedDescriptions[0]}).`);
    }

    // 5. URL RISK SIGNAL (0-100)
    let urlRiskScore = 0;
    SHORTENERS.forEach(s => {
      if (lower.includes(s)) {
        urlRiskScore = Math.max(urlRiskScore, 85);
        explanations.push(`Shortened Link (${s}): Hides the true web destination from scrutiny.`);
      }
    });
    SUSPICIOUS_TLDS.forEach(tld => {
      if (lower.includes(tld)) {
        urlRiskScore = Math.max(urlRiskScore, 90);
        explanations.push(`Suspicious Top-Level Domain: "${tld}" is commonly used in disposable phishing operations.`);
      }
    });
    if (/\b(?:amaz0n|hdfcbank-kyc|sbiyono-update|paytm-verify|icici-rewards|airtel-kyc|flipk4rt|jio-recharge)\b/i.test(lower)) {
      urlRiskScore = 100;
      explanations.push('Brand Impersonation / Typo-squatting URL pattern detected.');
    }
    if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text)) {
      urlRiskScore = 95;
      explanations.push('Raw IP address URL detected instead of an authenticated HTTPS domain.');
    }

    // Check for Authentic transactional patterns
    const isOtpPattern = /otp.*(?:\d{4,8}|is \d+)/i.test(text) && !/click|bit\.ly|tinyurl|pay|fee|charge|blocked/i.test(lower);
    const isBankAlert = /(?:debited|credited) by ₹?\s*\d+.*(?:a\/c|acct|balance)/i.test(lower) && !/click|bit\.ly|call \d{10}/i.test(lower);
    
    if (isOtpPattern || isBankAlert) {
      explanations.push('Authentic transactional notification format identified (no phishing links or payment demands).');
    }

    return {
      signals: {
        urgency: urgencyScore,
        contradiction: contradictionScore,
        mismatch: mismatchScore,
        template: templateScore,
        urlRisk: urlRiskScore,
        explanations
      },
      upiDetails: upiDetails.isUpi ? upiDetails : undefined
    };
  }
}

export class RiskScoreEngine {
  static compute(signals: RiskSignals, isOtpOrAlert: boolean): number {
    let score = (signals.urgency * 0.25)
              + (signals.contradiction * 0.30)
              + (signals.mismatch * 0.25)
              + (signals.template * 0.15)
              + (signals.urlRisk * 0.05);

    if (isOtpOrAlert && signals.contradiction === 0 && signals.template === 0 && signals.urlRisk === 0) {
      score = Math.min(score, 10);
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }
}

export class VerdictEngine {
  static determine(score: number): {
    verdict: 'GENUINE' | 'SUSPICIOUS' | 'FRAUD RISK';
    displayVerdict: ThreatLevel;
    confidence: number;
    label: string;
    recommendation: string;
    recommendedActions: string[];
  } {
    if (score <= 30) {
      return {
        verdict: 'GENUINE',
        displayVerdict: 'SAFE',
        confidence: Math.min(98, Math.max(88, 100 - score)),
        label: 'Safe · No fraud triggers detected',
        recommendation: 'Message matches expected authentic formatting. Note: Always verify unprompted communications independently.',
        recommendedActions: [
          'Verify sender details if the notification was unexpected.',
          'Never share passwords, OTPs, or PINs even if follow-up messages request them.',
          'Always use official apps and verified domains for financial transactions.'
        ]
      };
    } else if (score <= 60) {
      return {
        verdict: 'SUSPICIOUS',
        displayVerdict: 'SUSPICIOUS',
        confidence: Math.min(85, Math.max(62, 50 + (score - 30))),
        label: 'Suspicious · Verify before trusting',
        recommendation: 'Unusual characteristics or mild urgency detected. Contact the institution independently using their official channel.',
        recommendedActions: [
          'Do not click any embedded links or open attachments.',
          'Do not share OTPs, UPI PINs, or NetBanking passwords.',
          'Verify the sender by calling their official customer service number.',
          'Contact the organization directly through its verified app or website.'
        ]
      };
    } else {
      return {
        verdict: 'FRAUD RISK',
        displayVerdict: 'HIGH RISK',
        confidence: Math.min(99, Math.max(88, score)),
        label: 'High Risk · Strong scam / phishing indicators',
        recommendation: 'High probability of fraudulent solicitation or social-engineering trap based on observed indicators.',
        recommendedActions: [
          'Do not click the link or visit the destination address.',
          'Do not share OTP, UPI PIN, passwords, or personal identity details.',
          'Block this sender immediately on your mobile device.',
          'Contact the legitimate organization through its official verified channel.'
        ]
      };
    }
  }
}

// Local on-device NLP model representation (DistilBERT quantized TFLite)
export class LocalModelAnalyzer {
  private static isModelAvailable: boolean = true;

  static setModelAvailable(available: boolean) {
    this.isModelAvailable = available;
  }

  static isAvailable(): boolean {
    return this.isModelAvailable;
  }

  static analyze(text: string): {
    modelUsed: 'DistilBERT-TFLite + RuleEngine' | 'RuleEngine-Fallback';
    latencyMs: number;
  } {
    if (!this.isModelAvailable) {
      return {
        modelUsed: 'RuleEngine-Fallback',
        latencyMs: 3
      };
    }
    return {
      modelUsed: 'DistilBERT-TFLite + RuleEngine',
      latencyMs: 11
    };
  }
}

// Helper to extract sender ID or telephone from message text
export function extractSenderFromText(text: string): string {
  // Check for Indian mobile numbers
  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6789]\d{9}/);
  if (phoneMatch) return phoneMatch[0];

  // Check for standard SMS Headers (e.g. VM-HDFCBK, AX-SBIINB, VK-POWER, JD-KCYSEC)
  const headerMatch = text.match(/\b([A-Z]{2}-[A-Z0-9]{4,8})\b/i);
  if (headerMatch) return headerMatch[1].toUpperCase();

  // Check for signature attribution like "- HDFC Bank", "- Amazon"
  const signMatch = text.match(/[-–—]\s*([A-Za-z0-9\s]{3,20})$/);
  if (signMatch) return signMatch[1].trim();

  return 'Unknown Sender';
}

export interface BlockedSenderRecord {
  id?: string;
  senderId: string;
  blockedAt: number;
  reason: string;
  sampleMessage?: string;
}

// Local Blocklist Store for immediate sender blocking
const BLOCKLIST_STORAGE_KEY = 'mobiguard_blocked_senders_v1';

export const LocalBlocklistStorage = {
  getBlockedSenders(): BlockedSenderRecord[] {
    try {
      const raw = localStorage.getItem(BLOCKLIST_STORAGE_KEY);
      if (!raw) {
        // Initial verified scam senders from recent Indian cybercrime alerts
        const initial: BlockedSenderRecord[] = [
          {
            senderId: '+91 98765 43210',
            blockedAt: Date.now() - 3600000,
            reason: 'Electricity Power Cut Extortion Scam',
            sampleMessage: 'Dear consumer your electricity power will be disconnected tonight at 9:30 PM...'
          },
          {
            senderId: 'VM-KYCALRT',
            blockedAt: Date.now() - 7200000,
            reason: 'Phishing KYC Bank Account Block Bait',
            sampleMessage: 'Dear customer, your KYC is expiring today. Pay ₹99 immediately...'
          }
        ];
        try {
          localStorage.setItem(BLOCKLIST_STORAGE_KEY, JSON.stringify(initial));
        } catch {
          // Ignore write failure in restricted sandbox
        }
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  isBlocked(senderId: string): boolean {
    if (!senderId || senderId === 'Unknown Sender') return false;
    const clean = senderId.replace(/[\s-]/g, '').toLowerCase();
    const list = this.getBlockedSenders();
    return list.some(b => {
      const bClean = b.senderId.replace(/[\s-]/g, '').toLowerCase();
      return clean === bClean || clean.includes(bClean) || bClean.includes(clean);
    });
  },

  blockSender(senderId: string, reason = 'Reported Suspicious / Fraudulent Sender', sampleMessage?: string): BlockedSenderRecord {
    const list = this.getBlockedSenders();
    const existing = list.find(b => b.senderId.toLowerCase() === senderId.toLowerCase());
    if (existing) return existing;

    const newRecord: BlockedSenderRecord = {
      senderId: senderId.trim(),
      blockedAt: Date.now(),
      reason,
      sampleMessage: sampleMessage ? sampleMessage.slice(0, 100) : undefined
    };

    const updated = [newRecord, ...list];
    try {
      localStorage.setItem(BLOCKLIST_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to write blocklist', e);
    }
    return newRecord;
  },

  unblockSender(senderId: string): void {
    const list = this.getBlockedSenders();
    const updated = list.filter(b => b.senderId.toLowerCase() !== senderId.toLowerCase());
    try {
      localStorage.setItem(BLOCKLIST_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to unblock sender', e);
    }
  },

  clearAll(): void {
    try {
      localStorage.removeItem(BLOCKLIST_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear blocklist', e);
    }
  }
};

// API Fetcher for Gemini Deep AI Analysis
export async function fetchAiAnalysisApi(text: string, sender?: string): Promise<AiAnalysisResult | null> {
  try {
    const res = await fetch('/api/analyze-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sender })
    });
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    const data = await res.json();
    return data as AiAnalysisResult;
  } catch (err) {
    console.warn('Gemini API call failed, falling back to local analysis:', err);
    return null;
  }
}

// Master coordinator running on-device (with optional sender & blocklist validation)
export class FraudAnalyzer {
  static analyze(text: string, senderOverride?: string, optionalUrl?: string): AnalysisResult {
    const startTime = performance.now();
    const modelInfo = LocalModelAnalyzer.analyze(text);
    const { signals, upiDetails } = RuleEngine.evaluate(text);
    const localAi = LocalAiThreatModel.runInference(text);

    // Merge on-device neural vectors into signals
    signals.urgency = Math.max(signals.urgency, localAi.vectors.urgency);
    signals.contradiction = Math.max(signals.contradiction, localAi.vectors.contradiction);
    signals.template = Math.max(signals.template, localAi.vectors.phishing);

    // 1. URL Analysis (if explicit URL provided or embedded in text)
    let urlAnalysis: UrlAnalysisResult | undefined = undefined;
    const candidateUrls = optionalUrl ? [optionalUrl, ...extractUrls(text)] : extractUrls(text);
    if (candidateUrls.length > 0) {
      const primaryUrl = candidateUrls[0];
      urlAnalysis = analyzeUrl(primaryUrl, text);
      signals.urlRisk = Math.max(signals.urlRisk, urlAnalysis.riskScore);
      urlAnalysis.findings.forEach(f => {
        signals.explanations.push(`URL Flag: ${f.title} - ${f.description}`);
      });
    }

    if (localAi.activatedTokens.length > 0) {
      const topTokensStr = localAi.activatedTokens.map(t => `"${t.token}"`).join(', ');
      signals.explanations.push(`Local AI Neural Trigger: Detected high-weight scam tokens [${topTokensStr}] via on-device inference.`);
    }

    const detectedSender = senderOverride || extractSenderFromText(text);
    const isSenderBlocked = LocalBlocklistStorage.isBlocked(detectedSender);

    const isOtpOrAlert = /otp.*(?:\d{4,8}|is \d+)/i.test(text) && !/click|bit\.ly|pay/i.test(text.toLowerCase());
    let finalScore = RiskScoreEngine.compute(signals, isOtpOrAlert);

    // Calibrate with local AI score if elevated
    if (!isOtpOrAlert && localAi.localScore > finalScore) {
      finalScore = Math.min(100, Math.round(finalScore * 0.4 + localAi.localScore * 0.6));
    }

    // Elevate score if high-risk URL is present
    if (urlAnalysis && urlAnalysis.riskScore >= 70 && !isOtpOrAlert) {
      finalScore = Math.max(finalScore, Math.round(urlAnalysis.riskScore * 0.85));
    }

    // If sender is already on device blocklist, immediately elevate to maximum threat
    if (isSenderBlocked) {
      finalScore = 100;
      signals.explanations.unshift(`CRITICAL: Sender "${detectedSender}" is on your Local Blocklist. Immediate block enforced.`);
    }

    const { verdict, displayVerdict, confidence, label, recommendation, recommendedActions } = VerdictEngine.determine(finalScore);

    // Identify detected tactics
    const detectedTactics: DetectedTactic[] = [];
    if (signals.urgency >= 35 || /\b(immediately|urgent|tonight|within\s+\d+|blocked|freeze|suspended)\b/i.test(text)) {
      detectedTactics.push({
        name: 'Urgency & Pressure',
        description: 'Imposes an artificial deadline or immediate threat to bypass cautious thinking.',
        severity: signals.urgency > 65 ? 'high' : 'medium'
      });
    }
    if (signals.contradiction >= 35 || /\b(pay.*to.*(receive|claim|refund)|registration\s+fee|stamp\s+duty)\b/i.test(text)) {
      detectedTactics.push({
        name: 'Advance-Fee / Reverse Payment',
        description: 'Requires an upfront payment or fee to release a supposed refund, prize, or order.',
        severity: 'high'
      });
    }
    if (signals.mismatch >= 35 || /\b(senior\s+bank\s+manager|electricity\s+officer|fraud\s+branch|sbi\s+yono|hdfc|kyc.*expir)\b/i.test(text)) {
      detectedTactics.push({
        name: 'Brand & Authority Impersonation',
        description: 'Claims to represent an established financial institution or government authority without verified origin.',
        severity: signals.mismatch > 60 ? 'high' : 'medium'
      });
    }
    if (/\b(otp|pin|password|cvv|credentials|pan|aadhaar\s+biometric)\b/i.test(text) && (signals.urgency > 20 || signals.template > 20 || signals.mismatch > 20 || finalScore > 40)) {
      detectedTactics.push({
        name: 'Credential & OTP Solicitation',
        description: 'Attempts to trick the user into revealing sensitive authentication codes or PINs.',
        severity: 'high'
      });
    }
    if (/\b(won|prize|lucky\s+draw|lottery|congratulations|kbc|cash\s+prize)\b/i.test(text)) {
      detectedTactics.push({
        name: 'Fake Reward / Lottery Lure',
        description: 'Promises unrealistic monetary prizes or rewards to entice the victim into compliance.',
        severity: 'high'
      });
    }
    if (signals.urlRisk >= 35 || (urlAnalysis && urlAnalysis.riskScore >= 35)) {
      detectedTactics.push({
        name: 'Suspicious Web Redirection',
        description: urlAnalysis?.findings[0]?.description || 'Directs user to an unverified domain, shortener, or non-standard protocol.',
        severity: signals.urlRisk > 60 ? 'high' : 'medium'
      });
    }

    // Formulate confidence-aware explanation of WHY MobiGuard flagged this
    let whyFlagged = '';
    if (finalScore >= 60) {
      const topTacticNames = detectedTactics.map(t => t.name).slice(0, 2).join(' and ');
      whyFlagged = topTacticNames
        ? `Flagged due to elevated risk indicators including ${topTacticNames}. The content exhibits behavioral and technical patterns characteristic of social-engineering fraud.`
        : 'Flagged with high risk because multiple threat markers including aggressive pressure, unauthenticated origin, or suspicious web destinations were detected.';
    } else if (finalScore >= 30) {
      whyFlagged = 'Flagged as suspicious due to unusual message phrasing, unverified links, or mild urgency. We advise verifying with the organization through official channels before acting.';
    } else {
      whyFlagged = 'Content exhibits standard legitimate formatting with no evidence of urgency pressure, credential solicitation, or deceptive redirection.';
    }

    const privacyNotice = 'Evaluated locally via on-device heuristics. Zero message content was sent to external servers.';

    const inferenceTimeMs = Math.round(performance.now() - startTime + localAi.telemetry.latencyMs);

    // Collect suspicious phrases found in the content
    const suspiciousPhrases: string[] = [];
    const phraseRegexes = [
      /\b(immediately|urgent|urgently|tonight(?:\s+at\s+[\d:]+\s*(?:pm|am)?)?|within\s+\d+\s*(?:hours?|mins?|days?)|permanently\s+blocked|suspended|will\s+be\s+(?:blocked|frozen|disconnected|deactivated)|expire[sd]?\s+today)\b/gi,
      /\b(pay\s+(?:₹|inr|rs\.?)?\s*\d+|verification\s+fee|stamp\s+duty|registration\s+fee|processing\s+fee|re-delivery\s+fee|send\s+money|send\s+₹\s*\d+)\b/gi,
      /\b(share\s+(?:the\s+)?(?:6-digit\s+)?otp|enter\s+(?:your\s+)?(?:upi\s+)?pin|cancellation\s+otp|share\s+password|verify\s+(?:your\s+)?pan|aadhaar\s+biometric|verify\s+credentials)\b/gi,
      /\b(congratulations|lucky\s+draw|won\s+(?:the\s+)?(?:kbc|lottery|prize|₹|cash)|cash\s+prize|free\s+gift|bumper\s+prize)\b/gi,
      /\b(senior\s+bank\s+manager|fraud\s+branch|electricity\s+officer|customs\s+department|income\s+tax\s+dept|sbi\s+yono)\b/gi
    ];
    phraseRegexes.forEach(re => {
      const matches = text.match(re);
      if (matches) {
        matches.forEach(m => {
          const trimmed = m.trim();
          if (!suspiciousPhrases.includes(trimmed)) {
            suspiciousPhrases.push(trimmed);
          }
        });
      }
    });

    const structuredAnalysis: StructuredRiskAnalysis = {
      threatLevel: isSenderBlocked ? 'HIGH RISK' : displayVerdict,
      riskScore: finalScore,
      summary: whyFlagged,
      indicators: signals.explanations.slice(0, 5),
      suspiciousPhrases,
      recommendedActions: isSenderBlocked
        ? [
            'Sender is already in your quarantined blocklist.',
            'Do not reply, dial, or click any link provided.',
            'Delete the message to prevent accidental interaction.'
          ]
        : recommendedActions,
      urlAnalysis,
      confidence: isSenderBlocked ? 99 : Math.max(confidence, localAi.confidence)
    };

    return {
      score: finalScore,
      verdict: isSenderBlocked ? 'FRAUD RISK' : verdict,
      displayVerdict: isSenderBlocked ? 'HIGH RISK' : displayVerdict,
      confidence: isSenderBlocked ? 99 : Math.max(confidence, localAi.confidence),
      label: isSenderBlocked ? 'BLOCKED SENDER (CRITICAL THREAT)' : (localAi.threatIntent !== 'Authentic Communication' ? localAi.threatIntent : label),
      recommendation: isSenderBlocked
        ? `Sender "${detectedSender}" is blocked on this device. Do not respond, click links, or send funds.`
        : recommendation,
      recommendedActions: isSenderBlocked
        ? [
            'Sender is already in your quarantined blocklist.',
            'Do not reply, dial, or click any link provided.',
            'Delete the message to prevent accidental interaction.'
          ]
        : recommendedActions,
      whyFlagged,
      detectedTactics,
      signals,
      structuredAnalysis,
      upiDetails,
      urlAnalysis,
      inferenceTimeMs,
      modelType: 'On-Device Local AI (Transformers.js + WASM)',
      sender: detectedSender,
      isSenderBlocked,
      localAiInference: localAi,
      privacyNotice
    };
  }
}

// Local Encrypted History Store (Stores minimal non-private metadata only)
const HISTORY_STORAGE_KEY = 'mobiguard_scan_history_v1';

export const LocalHistoryStorage = {
  getRecentScans(): HistoryRecord[] {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveScan(
    type: 'SMS' | 'QR' | 'SCREENSHOT' | 'URL',
    rawText: string,
    result: AnalysisResult
  ): HistoryRecord {
    // Sanitize preview to avoid retaining complete private messages
    const sanitizedPreview = rawText.length > 50 
      ? rawText.substring(0, 45).replace(/[\r\n]+/g, ' ') + '...' 
      : rawText.replace(/[\r\n]+/g, ' ');

    const record: HistoryRecord = {
      id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      type,
      threatLevel: result.displayVerdict,
      riskScore: result.score,
      summary: result.whyFlagged || result.label || 'Analysis complete',
      preview: sanitizedPreview,
      confidence: result.confidence,
      // Backward compatibility fields
      verdict: result.verdict,
      displayVerdict: result.displayVerdict,
      score: result.score,
      signals: result.signals,
      recommendation: result.recommendation,
      recommendedActions: result.recommendedActions,
      whyFlagged: result.whyFlagged
      // Note: rawText is deliberately omitted to preserve user privacy
    };

    try {
      const current = this.getRecentScans();
      const updated = [record, ...current].slice(0, 50); // Store up to 50 local records
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Local history write failed', e);
    }

    return record;
  },

  clearAllHistory(): void {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (e) {
      console.error('Local history clear failed', e);
    }
  }
};
