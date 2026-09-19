export interface UrlFinding {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
}

export interface UrlAnalysisResult {
  originalUrl: string;
  normalizedUrl: string;
  domain: string;
  protocol: string;
  isHttps: boolean;
  isIpAddress: boolean;
  isShortener: boolean;
  suspiciousTld: string | null;
  impersonatedBrand: string | null;
  riskScore: number; // 0 - 100
  threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK';
  findings: UrlFinding[];
  recommendedAction: string;
  reputationMethod: string;
  reputationDisclaimer: string;
}

const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.work', 
  '.click', '.cc', '.buzz', '.fit', '.gdn', '.loan', '.racing', '.date'
];

const KNOWN_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'shorturl.at', 'is.gd', 
  'cutt.ly', 'ow.ly', 'buff.ly', 'goo.gl', 'bl.ink'
];

const LEGITIMATE_BRAND_DOMAINS: Record<string, string[]> = {
  sbi: ['onlinesbi.sbi', 'sbi.co.in'],
  hdfc: ['hdfcbank.com'],
  icici: ['icicibank.com'],
  axis: ['axisbank.com'],
  kotak: ['kotak.com'],
  pnb: ['pnbindia.in'],
  paytm: ['paytm.com'],
  phonepe: ['phonepe.com'],
  google: ['google.com', 'google.co.in', 'g.co'],
  amazon: ['amazon.in', 'amazon.com', 'amzn.to'],
  flipkart: ['flipkart.com'],
  apple: ['apple.com'],
  airtel: ['airtel.in'],
  jio: ['jio.com'],
  netflix: ['netflix.com'],
  microsoft: ['microsoft.com']
};

export function extractUrls(text: string): string[] {
  if (!text) return [];
  // Match http(s):// URLs or standalone domain patterns like domain.com/path
  const urlRegex = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`]+|[a-zA-Z0-9][-a-zA-Z0-9]{1,62}\.(?:com|org|net|in|co|xyz|top|tk|ml|ga|cf|gq|info|io|biz|site|online|shop|club|app)[^\s<>"'{}|\\^`]*/gi;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches.map(m => m.trim().replace(/[.,;:)\]]+$/, ''))));
}

export function analyzeUrl(inputUrl: string, contextText?: string): UrlAnalysisResult {
  let cleaned = inputUrl.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    // If URL parsing fails, create a fallback
    return {
      originalUrl: inputUrl,
      normalizedUrl: cleaned,
      domain: inputUrl.split('/')[0] || inputUrl,
      protocol: 'unknown',
      isHttps: false,
      isIpAddress: false,
      isShortener: false,
      suspiciousTld: null,
      impersonatedBrand: null,
      riskScore: 65,
      threatLevel: 'SUSPICIOUS',
      findings: [{
        type: 'WARNING',
        title: 'Malformed or Non-Standard URL',
        description: 'This web address has an irregular structure and could not be parsed safely as a standard URL.'
      }],
      recommendedAction: 'Do not visit this address. Verify through official websites or official apps.',
      reputationMethod: 'Local Structural Analysis',
      reputationDisclaimer: 'Evaluated locally on-device. Not verified against remote threat blacklists.'
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const protocol = parsed.protocol.toLowerCase();
  const isHttps = protocol === 'https:';

  const findings: UrlFinding[] = [];
  let score = 0;

  // 1. IP Address Hostname Check
  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (isIpAddress) {
    score += 55;
    findings.push({
      type: 'CRITICAL',
      title: 'Raw IP Address Hostname',
      description: `The link leads directly to a numeric server IP (${hostname}) instead of a registered, verified domain name. Legitimate organizations virtually never use direct IP links.`
    });
  }

  // 2. HTTP instead of HTTPS
  if (!isHttps) {
    score += 25;
    findings.push({
      type: 'WARNING',
      title: 'Unencrypted Connection (HTTP)',
      description: 'The link does not use modern HTTPS encryption. Any passwords or personal details entered could be intercepted.'
    });
  }

  // 3. Known URL Shortener
  const isShortener = KNOWN_SHORTENERS.some(s => hostname === s || hostname.endsWith('.' + s));
  if (isShortener) {
    score += 35;
    findings.push({
      type: 'WARNING',
      title: 'Shortened Link Used',
      description: `This link uses a redirection service (${hostname}) to conceal its final destination. Scammers often use shorteners to bypass automated security filters.`
    });
  }

  // 4. Suspicious Top-Level Domain (TLD)
  const suspiciousTld = SUSPICIOUS_TLDS.find(tld => hostname.endsWith(tld)) || null;
  if (suspiciousTld) {
    score += 45;
    findings.push({
      type: 'CRITICAL',
      title: `High-Risk TLD (${suspiciousTld})`,
      description: `The domain ends in "${suspiciousTld}", a top-level domain frequently associated with disposable, low-cost phishing infrastructure.`
    });
  }

  // 4b. Excessive Subdomains or Misleading Structure
  const domainParts = hostname.split('.');
  if (domainParts.length > 3 && !isIpAddress) {
    score += 25;
    findings.push({
      type: 'WARNING',
      title: 'Excessive Subdomain Depth',
      description: `Domain contains ${domainParts.length} nested levels (${hostname}). Phishers often abuse deep subdomains to mask unauthorized hosting services.`
    });
  }

  // 4c. Misleading Hyphenated Domain (Brand Mimicking)
  if (hostname.includes('-') && !isShortener) {
    const hasSusWord = /(?:kyc|bank|login|verify|update|secure|alert|support|claim)/i.test(hostname);
    if (hasSusWord) {
      score += 35;
      findings.push({
        type: 'WARNING',
        title: 'Deceptive Keyword Combination',
        description: 'Domain combines hyphens with sensitive keywords (e.g., kyc, verify, login) to mimic legitimate institutional infrastructure.'
      });
    }
  }

  // 5. Brand Impersonation / Typosquatting
  let impersonatedBrand: string | null = null;
  const combinedContext = ((contextText || '') + ' ' + hostname + ' ' + pathname).toLowerCase();

  for (const [brand, legitDomains] of Object.entries(LEGITIMATE_BRAND_DOMAINS)) {
    const isBrandMentioned = combinedContext.includes(brand);
    const isLegitDomain = legitDomains.some(ld => hostname === ld || hostname.endsWith('.' + ld));

    if (isBrandMentioned && !isLegitDomain) {
      // Check if the domain itself is pretending to be the brand
      if (hostname.includes(brand)) {
        impersonatedBrand = brand.toUpperCase();
        score += 60;
        findings.push({
          type: 'CRITICAL',
          title: `Brand Impersonation (${brand.toUpperCase()})`,
          description: `The domain "${hostname}" contains the brand name "${brand.toUpperCase()}", but is not an authorized official domain (${legitDomains.join(', ')}).`
        });
        break;
      }
    }
  }

  // 6. Sensitive Path Keywords
  const sensitiveKeywords = ['login', 'signin', 'verify', 'update-kyc', 'kyc', 'account', 'banking', 'secure', 'claim', 'refund'];
  const matchedKeywords = sensitiveKeywords.filter(kw => pathname.includes(kw));
  if (matchedKeywords.length > 0 && score > 20) {
    score += 20;
    findings.push({
      type: 'WARNING',
      title: 'Credential / Sensitive Action Path',
      description: `The URL path mentions sensitive actions [${matchedKeywords.join(', ')}] on an unverified domain.`
    });
  }

  // Normalize score
  score = Math.min(100, Math.max(0, score));

  let threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK';
  let recommendedAction: string;

  if (score >= 60) {
    threatLevel = 'HIGH RISK';
    recommendedAction = 'Do not click or open this link. It exhibits strong indicators of a malicious phishing destination designed to capture credentials or install unauthorized software.';
  } else if (score >= 30) {
    threatLevel = 'SUSPICIOUS';
    recommendedAction = 'Exercise extreme caution. Do not enter passwords, OTPs, or financial details on this website. Verify the organization through official channels first.';
  } else {
    threatLevel = 'SAFE';
    recommendedAction = 'No immediate phishing flags detected for this web address. Still remain vigilant and check the browser address bar before entering credentials.';
  }

  return {
    originalUrl: inputUrl,
    normalizedUrl: cleaned,
    domain: hostname,
    protocol,
    isHttps,
    isIpAddress,
    isShortener,
    suspiciousTld,
    impersonatedBrand,
    riskScore: score,
    threatLevel,
    findings,
    recommendedAction,
    reputationMethod: 'Local Structural Heuristics',
    reputationDisclaimer: 'Evaluated locally without external blacklist API lookups.'
  };
}
