export interface DemoExample {
  id: string;
  title: string;
  category: string;
  label: string;
  messageText: string;
  optionalUrl?: string;
  sender: string;
  expectedThreatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK';
  description: string;
  type: 'SMS' | 'URL' | 'QR' | 'PAYMENT' | 'CALL' | 'CHAT';
}

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: 'demo_kyc',
    title: 'Fake Bank KYC Threat',
    category: 'Bank / KYC Scam',
    label: 'Fake KYC Expiry',
    sender: 'VM-SBINB',
    messageText: 'Dear SBI user, your NetBanking account will be permanently blocked tonight at 9:30 PM due to expired KYC. Pay ₹99 verification fee immediately and update your PAN card: https://sbi-kyc-verify.xyz/login',
    optionalUrl: 'https://sbi-kyc-verify.xyz/login',
    expectedThreatLevel: 'HIGH RISK',
    description: 'Uses urgency tactics ("blocked tonight"), demands an upfront verification fee, and includes a spoofed domain with a suspicious .xyz TLD.',
    type: 'SMS'
  },
  {
    id: 'demo_delivery',
    title: 'Fake Delivery & Refund Scam',
    category: 'Delivery / Refund Scam',
    label: 'Delivery / Refund',
    sender: '+91 98234 11209',
    messageText: 'Your courier parcel #IN-90821 could not be delivered due to wrong address. Pay ₹25 re-delivery fee or claim your immediate refund of ₹1,850: upi://pay?pa=courier99@ybl&am=25&tn=delivery_fee',
    optionalUrl: 'upi://pay?pa=courier99@ybl&am=25&tn=delivery_fee',
    expectedThreatLevel: 'HIGH RISK',
    description: 'Impersonates delivery logistics, contradictions between fee payment and refund, and embeds a UPI debit request from an unverified mobile number.',
    type: 'SMS'
  },
  {
    id: 'demo_prize',
    title: 'Prize & Reward Scam',
    category: 'Lottery / Prize Bait',
    label: 'Prize / Reward',
    sender: 'WHATSAPP-WIN',
    messageText: 'CONGRATULATIONS! Your mobile number won the KBC Lucky Draw prize of ₹25,00,000! To claim your cash prize, send registration stamp duty of ₹1,500 via UPI within 2 hours.',
    expectedThreatLevel: 'HIGH RISK',
    description: 'Classic advance-fee fraud with unrealistic lottery reward, artificial 2-hour deadline, and upfront fee demand before receiving non-existent winnings.',
    type: 'CHAT'
  },
  {
    id: 'demo_job',
    title: 'Fake Part-Time Job Offer',
    category: 'Task / Job Fraud',
    label: 'Job Offer Trap',
    sender: '+91 91234 56789',
    messageText: 'Amazon part-time remote job: Earn ₹3,500–₹8,000 daily by rating hotels and YouTube videos from home! No experience required. Deposit ₹500 security fee to unlock your daily assignment: https://t.me/amazon_job_agent',
    optionalUrl: 'https://t.me/amazon_job_agent',
    expectedThreatLevel: 'HIGH RISK',
    description: 'Deceptive high daily income promise, demands upfront refundable security deposit, and directs the victim to an anonymous Telegram handle.',
    type: 'CHAT'
  },
  {
    id: 'demo_investment',
    title: 'Fake Investment & Crypto Multiplier',
    category: 'Investment Scam',
    label: 'Investment Trap',
    sender: '+44 7911 123456',
    messageText: 'Guaranteed 300% return in 48 hours! Join VIP SEBI-certified institutional trading pool. Transfer minimum ₹5,000 to trade desk upi://pay?pa=vipgrowth@axisbank&am=5000&tn=inv_deposit for daily automated payouts.',
    optionalUrl: 'upi://pay?pa=vipgrowth@axisbank&am=5000&tn=inv_deposit',
    expectedThreatLevel: 'HIGH RISK',
    description: 'Promises unrealistic guaranteed returns (300% in 48 hrs), misuses financial authority credentials, and solicits immediate non-refundable UPI transfers.',
    type: 'PAYMENT'
  },
  {
    id: 'demo_customer_support',
    title: 'Fake Customer Support Scam',
    category: 'Impersonation / Support',
    label: 'Fake Support',
    sender: 'PHONEPE-CARE',
    messageText: 'PhonePe Helpdesk: Your recent transaction of ₹4,200 failed but amount was deducted. Download AnyDesk or TeamViewer QuickSupport immediately so our executive can reverse payment to your bank: http://phonepe-support-desk.online',
    optionalUrl: 'http://phonepe-support-desk.online',
    expectedThreatLevel: 'HIGH RISK',
    description: 'Impersonates payment gateway support and attempts to trick the user into installing remote desktop control software (AnyDesk) to hijack device.',
    type: 'CHAT'
  },
  {
    id: 'demo_phishing_login',
    title: 'Phishing Login Link',
    category: 'Account Credential Theft',
    label: 'Phishing Login',
    sender: 'HDFC-ALERT',
    messageText: 'Urgent security notice: Unusual sign-in detected on your HDFC account from unknown device in Moscow. Verify your credentials immediately to avoid account suspension: http://192.168.1.105/hdfcbank-login/auth.html',
    optionalUrl: 'http://192.168.1.105/hdfcbank-login/auth.html',
    expectedThreatLevel: 'HIGH RISK',
    description: 'Fear-inducing security alert directing user to a raw IP address over unencrypted HTTP posing as a major financial institution.',
    type: 'URL'
  },
  {
    id: 'demo_suspicious_qr',
    title: 'Suspicious QR Payment Trap',
    category: 'QR / UPI Debit Trap',
    label: 'Suspicious QR',
    sender: 'OLX-BUYER',
    messageText: 'I am sending you QR code to receive ₹12,000 for your used iPhone. Please scan this QR code and enter your UPI PIN to accept money into your bank account immediately.',
    optionalUrl: 'upi://pay?pa=olxrefund_hub@icici&pn=OLX%20Escrow&am=12000&cu=INR&tn=Accept_Payment',
    expectedThreatLevel: 'HIGH RISK',
    description: 'Fraudulent reversed UPI collect trap claiming you need to scan a QR and enter your UPI PIN to receive money (UPI PIN is ONLY needed to send money).',
    type: 'QR'
  },
  {
    id: 'demo_safe_bank',
    title: 'Safe Bank Notification',
    category: 'Authentic Banking Notification',
    label: 'Safe Bank Alert',
    sender: 'AX-HDFCBK',
    messageText: 'Your A/C ending in 4108 is debited for INR 450.00 on 19-Sep-2026 at SWIGGY BANGALORE. Avail Bal: INR 18,420.50. Call 18002026161 if not done by you.',
    expectedThreatLevel: 'SAFE',
    description: 'Standard authentic Indian bank transaction SMS with no clickable links, no urgency demands, no requests for passwords, and includes official toll-free helpline.',
    type: 'SMS'
  },
  {
    id: 'demo_safe_delivery',
    title: 'Safe Delivery Notification',
    category: 'Authentic Courier Notification',
    label: 'Safe Delivery',
    sender: 'BLUEDART',
    messageText: 'Your Blue Dart shipment 8847291034 is out for delivery with courier associate Rajesh (+919876500000). Share delivery OTP 3918 only when parcel is physically handed over.',
    expectedThreatLevel: 'SAFE',
    description: 'Standard courier delivery update containing expected tracking number, rider details, and authentic instruction to share OTP only upon physical receipt.',
    type: 'SMS'
  }
];
