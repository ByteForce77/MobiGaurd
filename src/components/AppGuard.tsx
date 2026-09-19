import React, { useState } from 'react';
import { 
  Smartphone, ShieldAlert, ShieldCheck, AlertTriangle, ArrowLeft, 
  Eye, Lock, AlertCircle, Info, CheckCircle2, ChevronDown, ChevronUp,
  Camera, Mic, MapPin, Users, MessageSquare, Bell, Sliders
} from 'lucide-react';

interface AppGuardProps {
  onBack?: () => void;
}

interface SimulatedApp {
  id: string;
  name: string;
  category: string;
  icon: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  permissions: string[];
  riskExplanation: string;
  recommendedAction: string;
}

const SIMULATED_APPS: SimulatedApp[] = [
  {
    id: 'app_1',
    name: 'Super Flashlight Bright LED',
    category: 'Utilities',
    icon: '🔦',
    riskLevel: 'HIGH',
    permissions: ['SMS Reading (RECEIVE_SMS)', 'Accessibility Service', 'Contacts Access', 'Camera'],
    riskExplanation: 'A utility flashlight app has no legitimate technical reason to request SMS messages or Android Accessibility Service. Accessibility permissions can allow malicious apps to log keystrokes, hijack one-time passwords (OTPs), and click buttons without your consent.',
    recommendedAction: 'Uninstall immediately. Use your phone\'s built-in quick settings flashlight.'
  },
  {
    id: 'app_2',
    name: 'QuickCash 5-Min Instant Loan',
    category: 'Finance / Lending',
    icon: '💸',
    riskLevel: 'HIGH',
    permissions: ['Contacts Access (Full Book)', 'Photo & Storage Access', 'Call Logs', 'Location'],
    riskExplanation: 'Predatory lending apps request full contacts and photo gallery access to harass victims\' relatives and friends with defaming morphed photos during debt extortion.',
    recommendedAction: 'Revoke contacts and photo permissions immediately. Report to RBI Sachet portal if harassing calls occur.'
  },
  {
    id: 'app_3',
    name: 'AnyClean Phone Booster 2026',
    category: 'Tools',
    icon: '🧹',
    riskLevel: 'MEDIUM',
    permissions: ['Usage Stats', 'Draw Over Other Apps (Overlay)', 'Notifications'],
    riskExplanation: 'App overlay permission enables fake system dialogs over legitimate banking apps (overlay phishing) to steal credentials.',
    recommendedAction: 'Revoke "Display over other apps" permission in Android Settings.'
  },
  {
    id: 'app_4',
    name: 'HDFC Mobile Banking',
    category: 'Official Banking',
    icon: '🏦',
    riskLevel: 'LOW',
    permissions: ['SMS (Sim Binding / OTP)', 'Phone State (Device Binding)', 'Biometrics'],
    riskExplanation: 'Verified financial application utilizing standard NPCI security guidelines for device binding and multi-factor authentication.',
    recommendedAction: 'Verified Safe. Keep app updated via official Google Play Store only.'
  },
  {
    id: 'app_5',
    name: 'WhatsApp Messenger',
    category: 'Communication',
    icon: '💬',
    riskLevel: 'LOW',
    permissions: ['Camera', 'Microphone', 'Contacts', 'Storage'],
    riskExplanation: 'Standard communication permissions matching user-initiated messaging and calling functionality.',
    recommendedAction: 'Safe. Review media auto-download settings to prevent unwanted malicious attachments.'
  }
];

const PERMISSION_METRICS = [
  {
    name: 'Accessibility Service',
    icon: Sliders,
    risk: 'High Risk' as const,
    appsCount: 1,
    description: 'Can read screen text, intercept keystrokes, and interact with other banking apps automatically. Most dangerous permission on Android.'
  },
  {
    name: 'SMS / Read Messages',
    icon: MessageSquare,
    risk: 'High Risk' as const,
    appsCount: 2,
    description: 'Allows reading incoming bank OTPs, two-factor authentication codes, and financial transaction alerts.'
  },
  {
    name: 'Contacts & Address Book',
    icon: Users,
    risk: 'Review Recommended' as const,
    appsCount: 3,
    description: 'Full access to your personal phonebook. Often exfiltrated by fraudulent lending and marketing apps.'
  },
  {
    name: 'Camera & Microphone',
    icon: Camera,
    risk: 'Review Recommended' as const,
    appsCount: 4,
    description: 'Live audio/video capture. Should strictly belong to verified communications and camera tools.'
  },
  {
    name: 'Precise Geolocation',
    icon: MapPin,
    risk: 'Low Risk' as const,
    appsCount: 2,
    description: 'Tracks real-time device coordinates. Should be restricted to "While using the app" only.'
  },
  {
    name: 'System Notifications',
    icon: Bell,
    risk: 'Low Risk' as const,
    appsCount: 5,
    description: 'Can display alerts and status icons. Spam utility apps use this to push fake viral threats.'
  }
];

export const AppGuard: React.FC<AppGuardProps> = ({ onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState<'apps' | 'permissions'>('apps');
  const [expandedAppId, setExpandedAppId] = useState<string | null>('app_1');

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
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <span>App & Permission Guard</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                PROTOTYPE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Audit installed app permissions, accessibility abuse, and risky side-loaded APKs.
            </p>
          </div>
        </div>
      </div>

      {/* Required Prototype Simulation Banner */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-bold text-slate-200 block">
            Prototype Simulation — Native Android Permission Inspection Required
          </span>
          <span>
            Browsers cannot enumerate native installed packages or inspect Android system permissions (`PackageManager`). This dashboard demonstrates the security posture engine of the upcoming MobiGuard Android native client.
          </span>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveSubTab('apps')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'apps' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Installed Apps Audit (5)
        </button>
        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'permissions' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Permission Risk Matrix
        </button>
      </div>

      {/* Content: Installed Apps */}
      {activeSubTab === 'apps' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Simulated Installed Packages
            </span>
            <span className="text-[10px] text-rose-400 font-mono font-semibold">
              2 High Exposure Risks
            </span>
          </div>

          <div className="space-y-2">
            {SIMULATED_APPS.map((app) => {
              const isExpanded = expandedAppId === app.id;
              return (
                <div
                  key={app.id}
                  className={`rounded-2xl border transition-all ${
                    app.riskLevel === 'HIGH'
                      ? 'bg-slate-900/90 border-rose-800/40'
                      : app.riskLevel === 'MEDIUM'
                      ? 'bg-slate-900/90 border-amber-800/40'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <button
                    onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                    className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl shrink-0">{app.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{app.name}</h4>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                            app.riskLevel === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-300'
                              : app.riskLevel === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {app.riskLevel} RISK
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {app.category} · {app.permissions.length} permissions
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                          Requested Sensitive Permissions:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {app.permissions.map((perm, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                perm.includes('Accessibility') || perm.includes('SMS') || perm.includes('Contacts')
                                  ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                                  : 'bg-slate-950 text-slate-300 border border-slate-800'
                              }`}
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          Why It Was Flagged
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {app.riskExplanation}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          Recommended Action
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {app.recommendedAction}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content: Permission Risk Matrix */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Android Permission Exposure Overview
            </span>
          </div>

          <div className="space-y-2">
            {PERMISSION_METRICS.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.appsCount} simulated apps granted
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      item.risk === 'High Risk'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : item.risk === 'Review Recommended'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {item.risk}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
