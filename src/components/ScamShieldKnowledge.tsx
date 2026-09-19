import React, { useState } from 'react';
import { 
  Shield, BookOpen, AlertTriangle, ArrowLeft, Search, 
  ChevronDown, ChevronUp, Lock, CheckCircle2, XCircle, Sparkles
} from 'lucide-react';

interface ScamShieldKnowledgeProps {
  onBack?: () => void;
}

interface ScamTopic {
  id: string;
  title: string;
  category: string;
  icon: string;
  howItWorks: string;
  warningSigns: string[];
  whatAttackersWant: string;
  howToStaySafe: string[];
}

const SCAM_TOPICS: ScamTopic[] = [
  {
    id: 'upi',
    title: 'UPI & Reverse Payment Scams',
    category: 'Payment',
    icon: '💳',
    howItWorks: 'Scammers pose as buyers (on OLX, Facebook) or sellers claiming to refund you. They send a UPI collect request or QR code and tell you to "enter your UPI PIN to receive money".',
    warningSigns: [
      'Prompt asking to enter UPI PIN to receive or claim funds',
      'Payee name displayed in UPI app differs from the contact name',
      'Caller urging you to approve an incoming request in Google Pay, PhonePe, or Paytm'
    ],
    whatAttackersWant: 'To siphon money directly out of your bank account by tricking you into authorizing an outgoing debit transfer.',
    howToStaySafe: [
      'Golden Rule: You NEVER enter a UPI PIN to receive money.',
      'Reject unexpected collect requests in all UPI applications.',
      'Check transaction details carefully before entering your 4 or 6-digit PIN.'
    ]
  },
  {
    id: 'otp',
    title: 'OTP & Verification Interception',
    category: 'Credentials',
    icon: '🔑',
    howItWorks: 'Attackers initiate a password reset, debit card charge, or net-banking login, then call or message posing as bank executives claiming they are stopping fraudulent charges and need the OTP to confirm cancellation.',
    warningSigns: [
      'Caller aggressively demanding the 6-digit code received on SMS',
      'SMS text explicitly says "Never share this OTP with anyone, including bank staff"',
      'False claims that failing to share the OTP will cause permanent account closure'
    ],
    whatAttackersWant: 'Two-factor authentication codes to finalize unauthorized financial transactions or take over your accounts.',
    howToStaySafe: [
      'Never read out or forward an OTP to anyone over call or chat.',
      'No legitimate bank employee will ever ask for an OTP.',
      'If you receive an unprompted OTP, immediately freeze your card in your banking app.'
    ]
  },
  {
    id: 'kyc',
    title: 'Bank & SIM KYC Panic Scams',
    category: 'Impersonation',
    icon: '📄',
    howItWorks: 'You receive an urgent SMS stating your bank account, debit card, or SIM card will be deactivated tonight due to pending KYC verification, with a malicious link or unverified mobile number to call.',
    warningSigns: [
      'Urgency triggers like "blocked within 24 hours" or "tonight at 9:30 PM"',
      'Non-official web addresses ending in .xyz, .top, or raw IP addresses',
      'Requests for nominal processing fees (e.g. ₹10 or ₹99) to verify identity'
    ],
    whatAttackersWant: 'Net banking passwords, debit card numbers, CVVs, and Aadhaar/PAN details entered into spoofed portal pages.',
    howToStaySafe: [
      'Banks never request KYC updates via third-party SMS links.',
      'Complete KYC exclusively through official banking apps or by visiting your local branch.',
      'Check SMS sender IDs (official Indian bank SMS IDs use approved TRAI alphanumeric headers like AX-HDFCBK or VM-SBINB).'
    ]
  },
  {
    id: 'job',
    title: 'Part-Time Task & Job Offers',
    category: 'Employment',
    icon: '💼',
    howItWorks: 'Recruiters text offering ₹3,000–₹8,000 daily for easy tasks like rating hotels, liking YouTube videos, or reviewing products. After small initial payouts to build trust, they demand deposits for "prepaid high-commission tasks".',
    warningSigns: [
      'High daily compensation for zero qualification or minimal effort',
      'Communication moved quickly to anonymous Telegram channels',
      'Requirement to deposit your own money to unlock tasks or withdraw earnings'
    ],
    whatAttackersWant: 'Large upfront deposits via UPI under the illusion that you are unlocking larger commissions.',
    howToStaySafe: [
      'Legitimate companies never ask employees or freelancers to pay money to work.',
      'Do not engage with unsolicited WhatsApp or Telegram job recruiters.',
      'Report and block the numbers immediately.'
    ]
  },
  {
    id: 'investment',
    title: 'Fake High-Yield Investment & Crypto',
    category: 'Finance',
    icon: '📈',
    howItWorks: 'Fraudsters create fake trading apps and WhatsApp/Telegram VIP groups showing fabricated dashboards of 200%–500% profits. When you try to withdraw your funds, they demand exorbitant tax clearance fees.',
    warningSigns: [
      'Guaranteed high returns with "zero risk"',
      'Pressure to invest quickly before the "exclusive pool closes"',
      'Payments directed to personal individual UPI IDs or unrelated shell company accounts'
    ],
    whatAttackersWant: 'Your life savings transferred directly to untraceable accounts.',
    howToStaySafe: [
      'Only invest through SEBI-registered brokers and mutual fund portals.',
      'Verify SEBI registration numbers independently on sebi.gov.in.',
      'Never trust investment advice from random social media groups.'
    ]
  },
  {
    id: 'delivery',
    title: 'Parcel & Delivery Redirection',
    category: 'Delivery',
    icon: '📦',
    howItWorks: 'SMS claiming your parcel or courier package cannot be delivered due to an incomplete address. It contains a link prompting you to pay a ₹10–₹25 address re-routing fee.',
    warningSigns: [
      'You are asked to pay a fee for a package you did not order or already paid for',
      'Link points to a suspicious clone of India Post, FedEx, or Blue Dart',
      'The payment page asks for full card details and PIN'
    ],
    whatAttackersWant: 'To harvest your credit/debit card numbers and CVV on the spoofed checkout form.',
    howToStaySafe: [
      'Track packages only using tracking IDs on official courier portals.',
      'Delivery drivers will call you directly; they do not send payment links via random numbers.'
    ]
  },
  {
    id: 'support',
    title: 'Fake Customer Support & AnyDesk',
    category: 'Impersonation',
    icon: '🎧',
    howItWorks: 'Victims search online for toll-free support numbers for airlines, payment gateways, or delivery apps. Fraudsters buy Google Ads or publish fake numbers, then ask you to download AnyDesk, TeamViewer, or RustDesk to "fix the issue".',
    warningSigns: [
      'Support agent instructing you to install remote screen sharing software',
      'Representative asking you to open your mobile banking app while screen sharing is on',
      'Agent calling from a standard 10-digit mobile number instead of an official toll-free line'
    ],
    whatAttackersWant: 'Full remote control over your smartphone screen to watch your credentials and approve transfers.',
    howToStaySafe: [
      'Never install remote access apps at the request of an unverified caller.',
      'Find support numbers only inside official mobile apps, never through search engine ads.'
    ]
  },
  {
    id: 'prize',
    title: 'Lottery & KBC Lucky Draw Bait',
    category: 'Advance Fee',
    icon: '🎁',
    howItWorks: 'Messages or audio recordings announcing you have won ₹25 Lakh in a lucky draw. To claim the prize money, you are asked to pay a registration fee, government tax, or GST in advance.',
    warningSigns: [
      'Winning a contest or lottery you never purchased tickets for',
      'Fake certificates with forged government stamps or logos',
      'Demands for money transfers before receiving your prize'
    ],
    whatAttackersWant: 'Advance processing fees stolen from victims who believe a windfall is imminent.',
    howToStaySafe: [
      'You cannot win a lottery you never entered.',
      'Genuine lottery winnings deduct applicable taxes at source (TDS); they never ask for upfront payments.'
    ]
  },
  {
    id: 'phishing',
    title: 'Phishing & Fake Login Pages',
    category: 'Web',
    icon: '🎣',
    howItWorks: 'Deceptive clones of banking, social media, or email login pages designed to look identical to real services. URLs use slight typos or deceptive subdomains (e.g. hdfc-bank.secure-login.xyz).',
    warningSigns: [
      'URL does not match the official domain (e.g. .xyz instead of .com or .in)',
      'Browser warning that the connection is not secure (HTTP instead of HTTPS)',
      'Unusual spelling or graphical glitches on the login screen'
    ],
    whatAttackersWant: 'Usernames, passwords, MPINs, and security questions.',
    howToStaySafe: [
      'Always check the address bar carefully before typing passwords.',
      'Use password managers that refuse to autofill credentials on incorrect domains.',
      'Enable hardware security keys or authenticator apps instead of SMS 2FA.'
    ]
  },
  {
    id: 'qr',
    title: 'QR Code Payment Exploits',
    category: 'Payment',
    icon: '🏁',
    howItWorks: 'Attackers create QR codes configured with UPI debit links (`upi://pay`) and paste them over legitimate merchant QR stickers at shops, or send them digitally claiming scanning will credit money.',
    warningSigns: [
      'Physical stickers pasted over existing merchant QR stands',
      'Prompts asking to enter your UPI PIN immediately after scanning',
      'QR code received from strangers claiming it will credit your bank balance'
    ],
    whatAttackersWant: 'Instant electronic transfer of funds directly from your linked account.',
    howToStaySafe: [
      'Always scan QR codes with MobiGuard QR Guard before opening in payment apps.',
      'Check the merchant payee name displayed on the payment screen with the store owner.'
    ]
  },
  {
    id: 'social',
    title: 'Digital Arrest & Legal Coercion',
    category: 'Intimidation',
    icon: '⚖️',
    howItWorks: 'Callers impersonating police, CBI, or customs officials claim your identity is involved in money laundering or narcotics smuggling. They order you to remain on a Skype/WhatsApp video call in "Digital Arrest" and transfer funds for official verification.',
    warningSigns: [
      'Callers in police uniforms demanding you stay on video call and not tell family',
      'Claims of a "Digital Arrest" (which has zero legal existence under Indian law)',
      'Demands to transfer your savings to a "court escrow account" for verification'
    ],
    whatAttackersWant: 'To intimidate you into transferring all your savings under threat of immediate arrest.',
    howToStaySafe: [
      'No law enforcement agency ever conducts interrogations or arrests via Skype or WhatsApp.',
      'Police never ask citizens to transfer money to verify innocence.',
      'Disconnect the call and report immediately to 1930.'
    ]
  }
];

export const ScamShieldKnowledge: React.FC<ScamShieldKnowledgeProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>('upi');

  const categories = ['ALL', 'Payment', 'Credentials', 'Impersonation', 'Employment', 'Finance', 'Web'];

  const filteredTopics = SCAM_TOPICS.filter(topic => {
    const matchesCategory = selectedCategory === 'ALL' || topic.category === selectedCategory;
    const matchesSearch = !searchTerm.trim() || 
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.howItWorks.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>Scam Shield</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                KNOWLEDGE BASE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Plain-English security breakdowns of the 11 most common mobile fraud patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scam types (e.g. UPI, Digital Arrest, Job)..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-2.5">
        {filteredTopics.map((topic) => {
          const isExpanded = expandedId === topic.id;
          return (
            <div
              key={topic.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : topic.id)}
                className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-850 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{topic.icon}</span>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{topic.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-400">
                        {topic.category}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {topic.howItWorks}
                    </p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />}
              </button>

              {isExpanded && (
                <div className="p-4 border-t border-slate-800/80 space-y-3.5 text-xs bg-slate-950/60">
                  {/* How it Works */}
                  <div className="space-y-1">
                    <span className="font-bold text-white uppercase tracking-wider text-[10px] text-cyan-400 block">
                      How It Works
                    </span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {topic.howItWorks}
                    </p>
                  </div>

                  {/* Warning Signs */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-white uppercase tracking-wider text-[10px] text-amber-400 block">
                      Warning Signs
                    </span>
                    <div className="space-y-1">
                      {topic.warningSigns.map((sign, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-slate-300 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{sign}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* What Attackers Want */}
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/40 space-y-1 text-rose-200 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-rose-400 block">
                      What Attackers Want
                    </span>
                    <p className="leading-relaxed">
                      {topic.whatAttackersWant}
                    </p>
                  </div>

                  {/* How To Stay Safe */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-white uppercase tracking-wider text-[10px] text-emerald-400 block">
                      How to Stay Safe
                    </span>
                    <div className="space-y-1">
                      {topic.howToStaySafe.map((safeTip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-slate-300 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{safeTip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
