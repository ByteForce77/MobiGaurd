import jsQR from 'jsqr';
import { parseUpiUri, UpiDetails, KNOWN_BRANDS } from './fraudEngine';
import { analyzeUrl, UrlAnalysisResult } from './urlAnalyzer';

export interface QrSafetyResult {
  safetyVerdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  riskScore: number; // 0 - 100
  title: string;
  summary: string;
  reasons: string[];
  recommendations: string[];
  isUrl: boolean;
  url?: string;
  urlAnalysis?: UrlAnalysisResult;
  isUpi: boolean;
  upiDetails?: UpiDetails & {
    isDebitTrap?: boolean;
    isSuspiciousVpa?: boolean;
    warningNote?: string;
  };
  payloadType: 'UPI_PAYMENT' | 'WEB_URL' | 'APP_INSTALL_LINK' | 'WIFI_CONFIG' | 'VCARD' | 'PLAIN_TEXT';
}

// Global cached BarcodeDetector to avoid GC churn in continuous scan loop
let cachedBarcodeDetector: any = null;
let barcodeDetectorChecked = false;
let barcodeDetectorSupported = false;

function getBarcodeDetector(): any {
  if (barcodeDetectorChecked) {
    return barcodeDetectorSupported ? cachedBarcodeDetector : null;
  }
  barcodeDetectorChecked = true;
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      cachedBarcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      barcodeDetectorSupported = true;
      return cachedBarcodeDetector;
    } catch {
      barcodeDetectorSupported = false;
      cachedBarcodeDetector = null;
    }
  }
  return null;
}

// Reusable offscreen canvas for zero-allocation video frame decoding
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

function getOffscreenCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
    offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!offscreenCanvas || !offscreenCtx) return null;
  return { canvas: offscreenCanvas, ctx: offscreenCtx };
}

/**
 * High-performance, multi-engine real-time QR code decoder from video elements.
 * Uses hardware BarcodeDetector where available (Android Chrome/Edge),
 * with dual-pass jsQR (center reticle crop + scaled full frame) fallback.
 */
export async function decodeQrFromVideo(video: HTMLVideoElement): Promise<string | null> {
  if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return null;
  }

  // 1. Hardware BarcodeDetector API (Android Chrome & modern Chromium)
  const detector = getBarcodeDetector();
  if (detector) {
    try {
      const barcodes = await detector.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch {
      // Continue to jsQR fallback
    }
  }

  // 2. High-speed jsQR fallback with center reticle optimization
  const offscreen = getOffscreenCanvas();
  if (!offscreen) return null;
  const { canvas, ctx } = offscreen;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Pass A: Center Reticle Crop (Focus where the user aims their camera)
  // This reduces pixel processing by up to 75% for sub-10ms response time
  try {
    const cropSize = Math.round(Math.min(vw, vh) * 0.65);
    const sx = Math.round((vw - cropSize) / 2);
    const sy = Math.round((vh - cropSize) / 2);

    const targetSize = Math.min(cropSize, 420);
    canvas.width = targetSize;
    canvas.height = targetSize;

    ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);
    const cropImageData = ctx.getImageData(0, 0, targetSize, targetSize);

    const cropCode = jsQR(cropImageData.data, cropImageData.width, cropImageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    if (cropCode && cropCode.data && cropCode.data.trim()) {
      return cropCode.data.trim();
    }
  } catch {
    // Continue to full frame
  }

  // Pass B: Full frame downscaled (if the QR is held near the edges)
  try {
    const maxDim = 540;
    let sw = vw;
    let sh = vh;
    if (sw > maxDim || sh > maxDim) {
      if (sw > sh) {
        sh = Math.round((sh * maxDim) / sw);
        sw = maxDim;
      } else {
        sw = Math.round((sw * maxDim) / sh);
        sh = maxDim;
      }
    }

    canvas.width = sw;
    canvas.height = sh;
    ctx.drawImage(video, 0, 0, sw, sh);

    const fullImageData = ctx.getImageData(0, 0, sw, sh);
    const fullCode = jsQR(fullImageData.data, fullImageData.width, fullImageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    if (fullCode && fullCode.data && fullCode.data.trim()) {
      return fullCode.data.trim();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Decodes QR code from an HTMLImageElement (Gallery upload or captured screenshot).
 */
export async function decodeQrFromImageElement(img: HTMLImageElement): Promise<string | null> {
  // 1. Hardware BarcodeDetector API
  const detector = getBarcodeDetector();
  if (detector) {
    try {
      const barcodes = await detector.detect(img);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch {
      // Continue to canvas fallback
    }
  }

  // 2. Multi-resolution Canvas jsQR
  const offscreen = getOffscreenCanvas();
  if (!offscreen) return null;
  const { canvas, ctx } = offscreen;

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width <= 0 || height <= 0) return null;

  // Scale down ultra-high-resolution mobile camera pictures (12MP - 108MP) to avoid memory crashes
  const maxDim = 1000;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    if (code && code.data && code.data.trim()) {
      return code.data.trim();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Comprehensive On-Device Security & Fraud Analyzer for QR Code payloads.
 * Evaluates UPI payment traps, malicious web URLs, phishing lookalikes,
 * APK malware downloads, and social engineering triggers.
 */
export function analyzeQrPayload(payload: string): QrSafetyResult {
  const raw = payload.trim();
  const lower = raw.toLowerCase();
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  // 1. Check if UPI payment link
  const upi = parseUpiUri(raw);
  if (upi.isUpi) {
    let isDebitTrap = false;
    let isSuspiciousVpa = false;
    let warningNote = '';

    const note = (upi.tn || '').toLowerCase();
    const amountNum = parseFloat(upi.am || '0');
    const payee = (upi.pn || '').toLowerCase();
    const vpa = (upi.pa || '').toLowerCase();

    // Critical Scam Trap: "Refund / Cashback / Prize" with an Amount debit
    if ((note.includes('refund') || note.includes('cashback') || note.includes('prize') || note.includes('reward') || note.includes('deposit') || note.includes('kyc')) && amountNum > 0) {
      isDebitTrap = true;
      riskScore = 98;
      warningNote = `DEBIT TRAP: Note says "${upi.tn}" but scanning this executes a payment of ₹${amountNum} FROM your account!`;
      reasons.push(warningNote);
      reasons.push('Entering your UPI PIN always DEDUCTS money, never credits money.');
      recommendations.push('DO NOT enter your UPI PIN under any circumstance.');
      recommendations.push('Cancel the transaction immediately in your banking app.');
    } else if (note.includes('refund') || note.includes('cashback')) {
      isDebitTrap = true;
      riskScore = 85;
      warningNote = 'Refund/Cashback label detected in payment intent.';
      reasons.push('Genuine refunds do not require scanning a QR code or entering a PIN.');
      recommendations.push('Verify directly with your official merchant support.');
    }

    // Suspicious VPA Handles
    const suspiciousHandles = ['@ybl', '@axl', '@ibl', '@paytm', '@upi'];
    const corporateKeywords = ['amazon', 'flipkart', 'swiggy', 'zomato', 'electricity', 'airtel', 'jio', 'tneb', 'bses', 'tatapower', 'hdfc', 'sbi', 'icici'];
    
    // Check if brand is impersonated in VPA or Payee Name
    const impersonatedBrand = corporateKeywords.find(b => lower.includes(b));
    if (impersonatedBrand) {
      const isOfficialMerchant = vpa.includes('merchant') || vpa.includes('corp') || (vpa.endsWith('@icici') && vpa.includes('flipkart')) || (vpa.endsWith('@okhdfcbank') && vpa.includes('amazon'));
      if (!isOfficialMerchant && (vpa.includes('random') || /\d{5,}/.test(vpa))) {
        isSuspiciousVpa = true;
        riskScore = Math.max(riskScore, 80);
        reasons.push(`Suspected Impersonation: Claims to be "${impersonatedBrand.toUpperCase()}", but the UPI VPA is a personal account (${upi.pa}).`);
        recommendations.push('Official companies never ask payments to personal UPI accounts.');
      }
    }

    // Unverified / generic personal UPI
    if (riskScore === 0) {
      if (!upi.pn || upi.pn.trim().length === 0) {
        riskScore = 35;
        reasons.push('Unverified Payee Name: The QR does not specify a registered merchant name.');
        recommendations.push('Check the recipient name displayed on your banking screen before authorizing.');
      } else {
        // Safe standard merchant QR
        riskScore = 10;
        reasons.push(`Payee: ${upi.pn} (${upi.pa})`);
        if (amountNum > 0) {
          reasons.push(`Fixed Payment Amount: ₹${amountNum}`);
        } else {
          reasons.push('User-specified payment amount');
        }
        recommendations.push('Review the recipient name and amount before confirming your UPI PIN.');
      }
    }

    const safetyVerdict = riskScore >= 70 ? 'DANGEROUS' : riskScore >= 30 ? 'SUSPICIOUS' : 'SAFE';
    const title = safetyVerdict === 'DANGEROUS' 
      ? 'DANGEROUS: Fraudulent UPI Payment Intent'
      : safetyVerdict === 'SUSPICIOUS'
      ? 'SUSPICIOUS: Unverified UPI Payment Code'
      : 'SAFE: Standard UPI Payment QR';

    return {
      safetyVerdict,
      riskScore,
      title,
      summary: isDebitTrap 
        ? 'CRITICAL ALERT: This QR code is engineered to drain funds from your bank account.' 
        : safetyVerdict === 'SUSPICIOUS'
        ? 'Caution: The payee or payment parameters contain unverified indicators.'
        : 'Valid UPI payment payload. Always verify payee name on your banking app.',
      reasons,
      recommendations: recommendations.length > 0 ? recommendations : ['Verify payee before paying.'],
      isUrl: false,
      isUpi: true,
      upiDetails: {
        ...upi,
        isDebitTrap,
        isSuspiciousVpa,
        warningNote: warningNote || undefined
      },
      payloadType: 'UPI_PAYMENT'
    };
  }

  // 2. Check if Web URL
  const isWebUrl = lower.startsWith('http://') || lower.startsWith('https://') || /^(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/.*)?$/.test(raw);
  if (isWebUrl) {
    const fullUrl = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    const urlAnalysis = analyzeUrl(fullUrl);

    riskScore = urlAnalysis.riskScore;

    // Check for APK Download in QR
    if (lower.endsWith('.apk') || lower.includes('.apk?') || lower.includes('/download/apk') || lower.includes('app-download')) {
      riskScore = Math.max(riskScore, 95);
      reasons.push('MALICIOUS APK DOWNLOAD: QR initiates a direct Android APK app download.');
      reasons.push('Sideloading unverified APKs can grant remote access or install spyware/banking trojans.');
      recommendations.push('DO NOT install or download APK files from unknown QR codes.');
    }

    // Check for Unencrypted HTTP
    if (fullUrl.startsWith('http://')) {
      riskScore = Math.max(riskScore, 50);
      reasons.push('Unencrypted Connection: QR link uses HTTP instead of secure HTTPS.');
    }

    // Lookalike / Phishing Indicators from URL Analyzer
    if (urlAnalysis.findings && urlAnalysis.findings.length > 0) {
      urlAnalysis.findings.forEach(f => {
        const desc = `${f.title}: ${f.description}`;
        if (!reasons.includes(desc)) reasons.push(desc);
      });
    }

    // URL Shorteners in QR codes (High risk obscuration)
    const shorteners = ['bit.ly', 'tinyurl.com', 'is.gd', 'cutt.ly', 'rb.gy', 't.co', 'ow.ly'];
    const isShortened = shorteners.some(s => lower.includes(s));
    if (isShortened) {
      riskScore = Math.max(riskScore, 65);
      reasons.push('Obfuscated Shortened Link: Destination URL is disguised using a URL shortener.');
      recommendations.push('Inspect the unshortened destination link before visiting.');
    }

    if (riskScore === 0) {
      riskScore = 15;
      reasons.push('Standard HTTPS encrypted web URL');
      reasons.push(`Destination domain: ${urlAnalysis.domain}`);
      recommendations.push('Review the web destination below before choosing to visit.');
    }

    const safetyVerdict = riskScore >= 70 ? 'DANGEROUS' : riskScore >= 35 ? 'SUSPICIOUS' : 'SAFE';
    const title = safetyVerdict === 'DANGEROUS'
      ? 'DANGEROUS: Deceptive Phishing or Malware URL'
      : safetyVerdict === 'SUSPICIOUS'
      ? 'SUSPICIOUS: Unverified or Shortened Web Link'
      : 'SAFE: Valid Web Address';

    return {
      safetyVerdict,
      riskScore,
      title,
      summary: safetyVerdict === 'DANGEROUS'
        ? 'High risk detected. MobiGuard blocked automatic navigation to protect your device.'
        : safetyVerdict === 'SUSPICIOUS'
        ? 'Caution: This link uses high-risk domains, shorteners, or unverified hosts.'
        : 'Legitimate web link with valid structure and standard security protocols.',
      reasons,
      recommendations: recommendations.length > 0 ? recommendations : ['Review destination domain carefully.'],
      isUrl: true,
      url: fullUrl,
      urlAnalysis,
      isUpi: false,
      payloadType: lower.endsWith('.apk') ? 'APP_INSTALL_LINK' : 'WEB_URL'
    };
  }

  // 3. Wi-Fi Configuration QR (WIFI:T:WPA;S:mynetwork;P:mypass;;)
  if (lower.startsWith('wifi:')) {
    return {
      safetyVerdict: 'SAFE',
      riskScore: 10,
      title: 'SAFE: Wi-Fi Network Credentials',
      summary: 'Standard Wi-Fi network configuration QR code.',
      reasons: ['Contains local network SSID and authentication format.'],
      recommendations: ['Only connect if you trust the physical premises offering this Wi-Fi.'],
      isUrl: false,
      isUpi: false,
      payloadType: 'WIFI_CONFIG'
    };
  }

  // 4. vCard / Contact Card
  if (lower.includes('begin:vcard')) {
    return {
      safetyVerdict: 'SAFE',
      riskScore: 15,
      title: 'SAFE: Electronic Contact Card (vCard)',
      summary: 'Contains standard contact details (Name, Phone, Email).',
      reasons: ['Standard vCard format for phone address book import.'],
      recommendations: ['Review contact details before saving to your device.'],
      isUrl: false,
      isUpi: false,
      payloadType: 'VCARD'
    };
  }

  // 5. Plain Text / Other Data
  const textScamWords = ['congratulations', 'won', 'lottery', 'prize', 'kyc', 'blocked', 'arrest', 'police', 'customs', 'urgent', 'discontinue'];
  let textScamMatches = 0;
  textScamWords.forEach(w => {
    if (lower.includes(w)) textScamMatches++;
  });

  if (textScamMatches >= 2) {
    riskScore = 75;
    reasons.push(`Suspicious Phrasing: Detected ${textScamMatches} high-urgency scam indicator words.`);
    recommendations.push('Do not follow instructions in unsolicited QR message payloads.');
  } else if (textScamMatches === 1) {
    riskScore = 40;
    reasons.push('Contains urgent or promotional keywords.');
  } else {
    riskScore = 5;
    reasons.push('Plain text content with no active execution payloads.');
    recommendations.push('No immediate security hazards detected.');
  }

  const safetyVerdict = riskScore >= 70 ? 'DANGEROUS' : riskScore >= 35 ? 'SUSPICIOUS' : 'SAFE';
  return {
    safetyVerdict,
    riskScore,
    title: safetyVerdict === 'DANGEROUS' 
      ? 'DANGEROUS: High-Risk Text Payload' 
      : safetyVerdict === 'SUSPICIOUS' 
      ? 'SUSPICIOUS: Unverified Message' 
      : 'SAFE: Plain Text Content',
    summary: 'Decoded text content from QR code.',
    reasons,
    recommendations,
    isUrl: false,
    isUpi: false,
    payloadType: 'PLAIN_TEXT'
  };
}
