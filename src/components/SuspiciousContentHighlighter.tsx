import React from 'react';
import { AlertCircle, Clock, DollarSign, Key, Award, UserX, ExternalLink } from 'lucide-react';

export interface HighlightRule {
  category: 'urgency' | 'payment' | 'credential' | 'reward' | 'impersonation' | 'link';
  label: string;
  badgeBg: string;
  borderCol: string;
  regex: RegExp;
  icon: React.ComponentType<{ className?: string }>;
}

export const HIGHLIGHT_RULES: HighlightRule[] = [
  {
    category: 'urgency',
    label: 'Urgency Tactic',
    badgeBg: 'bg-rose-500/20 text-rose-300',
    borderCol: 'border-b-2 border-rose-500 bg-rose-500/10',
    regex: /\b(immediately|urgent|urgently|tonight(?:\s+at\s+[\d:]+\s*(?:pm|am)?)?|within\s+\d+\s*(?:hours?|mins?|days?)|permanently\s+blocked|suspended|will\s+be\s+(?:blocked|frozen|disconnected|deactivated)|expire[sd]?\s+today)\b/gi,
    icon: Clock
  },
  {
    category: 'payment',
    label: 'Payment / Fee Demand',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    borderCol: 'border-b-2 border-amber-500 bg-amber-500/10',
    regex: /\b(pay\s+(?:₹|inr|rs\.?)?\s*\d+|verification\s+fee|stamp\s+duty|registration\s+fee|processing\s+fee|re-delivery\s+fee|send\s+money|send\s+₹\s*\d+|charge\s+of\s+₹\s*\d+)\b/gi,
    icon: DollarSign
  },
  {
    category: 'credential',
    label: 'OTP / Credential Request',
    badgeBg: 'bg-red-500/20 text-red-300',
    borderCol: 'border-b-2 border-red-500 bg-red-500/10',
    regex: /\b(share\s+(?:the\s+)?(?:6-digit\s+)?otp|enter\s+(?:your\s+)?(?:upi\s+)?pin|cancellation\s+otp|share\s+password|verify\s+(?:your\s+)?pan|aadhaar\s+biometric|verify\s+credentials)\b/gi,
    icon: Key
  },
  {
    category: 'reward',
    label: 'Fake Reward / Bait',
    badgeBg: 'bg-purple-500/20 text-purple-300',
    borderCol: 'border-b-2 border-purple-500 bg-purple-500/10',
    regex: /\b(congratulations|lucky\s+draw|won\s+(?:the\s+)?(?:kbc|lottery|prize|₹|cash)|cash\s+prize|free\s+gift|bumper\s+prize|claim\s+your\s+refund\s+of\s+₹?\s*\d+)\b/gi,
    icon: Award
  },
  {
    category: 'impersonation',
    label: 'Impersonation / False Authority',
    badgeBg: 'bg-indigo-500/20 text-indigo-300',
    borderCol: 'border-b-2 border-indigo-500 bg-indigo-500/10',
    regex: /\b(senior\s+bank\s+manager|fraud\s+branch|electricity\s+officer|customs\s+department|income\s+tax\s+dept|sbi\s+yono|hdfc\s+security\s+team|trai\s+headquarters)\b/gi,
    icon: UserX
  },
  {
    category: 'link',
    label: 'Suspicious Link / Protocol',
    badgeBg: 'bg-cyan-500/20 text-cyan-300',
    borderCol: 'border-b-2 border-cyan-500 bg-cyan-500/10',
    regex: /(?:https?:\/\/|www\.)[^\s]+|upi:\/\/pay[^\s]+|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}[^\s]*|\b[a-zA-Z0-9-]+\.(?:xyz|top|tk|ml|ga|cf|gq|work|buzz|click)[^\s]*/gi,
    icon: ExternalLink
  }
];

interface Segment {
  text: string;
  rule?: HighlightRule;
}

interface SuspiciousContentHighlighterProps {
  text: string;
  className?: string;
}

export function SuspiciousContentHighlighter({ text, className = '' }: SuspiciousContentHighlighterProps) {
  if (!text) return null;

  // Find all matches with their index ranges
  interface MatchRange {
    start: number;
    end: number;
    rule: HighlightRule;
    matchText: string;
  }

  const ranges: MatchRange[] = [];

  HIGHLIGHT_RULES.forEach(rule => {
    // Clone regex with global flag
    const re = new RegExp(rule.regex.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      ranges.push({
        start: m.index,
        end: m.index + m[0].length,
        rule,
        matchText: m[0]
      });
    }
  });

  // Sort ranges by start index
  ranges.sort((a, b) => a.start - b.start);

  // Filter overlapping ranges (keep the first or longest)
  const nonOverlapping: MatchRange[] = [];
  let lastEnd = 0;
  for (const range of ranges) {
    if (range.start >= lastEnd) {
      nonOverlapping.push(range);
      lastEnd = range.end;
    }
  }

  // Build segments
  const segments: Segment[] = [];
  let currentIndex = 0;

  nonOverlapping.forEach(range => {
    if (range.start > currentIndex) {
      segments.push({
        text: text.substring(currentIndex, range.start)
      });
    }
    segments.push({
      text: text.substring(range.start, range.end),
      rule: range.rule
    });
    currentIndex = range.end;
  });

  if (currentIndex < text.length) {
    segments.push({
      text: text.substring(currentIndex)
    });
  }

  // Get unique rules that were matched for the legend
  const matchedRules = Array.from(new Set(nonOverlapping.map(r => r.rule)));

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Highlighted text container */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm font-sans leading-relaxed text-slate-200 break-words whitespace-pre-wrap select-text">
        {segments.map((seg, idx) => {
          if (!seg.rule) {
            return <span key={idx}>{seg.text}</span>;
          }

          const RuleIcon = seg.rule.icon;
          return (
            <span
              key={idx}
              className={`inline font-semibold px-1 py-0.5 rounded cursor-help transition ${seg.rule.borderCol}`}
              title={`${seg.rule.label}: "${seg.text}"`}
            >
              <span>{seg.text}</span>
              <span className={`inline-flex items-center gap-0.5 ml-1 px-1 py-0.2 rounded text-[10px] uppercase font-mono tracking-tight font-bold align-middle ${seg.rule.badgeBg}`}>
                <RuleIcon className="w-2.5 h-2.5" />
                {seg.rule.label.split(' ')[0]}
              </span>
            </span>
          );
        })}
      </div>

      {/* Legend showing detected indicators */}
      {matchedRules.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Detected Indicators:
          </span>
          {matchedRules.map((rule, i) => {
            const Icon = rule.icon;
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-700/60 ${rule.badgeBg}`}
              >
                <Icon className="w-3 h-3" />
                <span>{rule.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
