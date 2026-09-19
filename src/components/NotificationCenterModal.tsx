import React, { useState } from 'react';
import { 
  Bell, ShieldAlert, ShieldCheck, AlertTriangle, Link2, 
  X, Check, Trash2, Info, Sparkles, PhoneCall
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenItem?: (type: string) => void;
}

interface SecurityNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  isRead: boolean;
}

const DEFAULT_NOTIFICATIONS: SecurityNotification[] = [
  {
    id: 'notif_1',
    title: 'Critical Scam Pattern Flagged',
    body: 'High-risk message matching "Bank KYC Deactivation" intercepted with spoofed link.',
    time: '5m ago',
    type: 'CRITICAL',
    isRead: false
  },
  {
    id: 'notif_2',
    title: 'Suspicious Sender Quarantined',
    body: 'Sender "VM-SBINB" was added to your blocked quarantine list.',
    time: '25m ago',
    type: 'WARNING',
    isRead: false
  },
  {
    id: 'notif_3',
    title: 'Potential Phishing URL Analyzed',
    body: 'Raw IP endpoint detected in Smart URL Guard. Execution prevented safely.',
    time: '1h ago',
    type: 'WARNING',
    isRead: true
  },
  {
    id: 'notif_4',
    title: 'Security Score Increased',
    body: 'Your MobiGuard posture index reached 82/100 after running the security check.',
    time: '2h ago',
    type: 'SUCCESS',
    isRead: true
  }
];

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenItem
}) => {
  const [notifications, setNotifications] = useState<SecurityNotification[]>(() => {
    try {
      const saved = localStorage.getItem('mobiguard_notifications');
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  if (!isOpen) return null;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    localStorage.setItem('mobiguard_notifications', JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem('mobiguard_notifications', JSON.stringify([]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Security Alerts</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-cyan-300">
                  SIMULATED
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">Prototype push notification feed</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-850 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            {notifications.filter(n => !n.isRead).length} unread alerts
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Mark all read</span>
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={clearAll}
              className="text-slate-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No recent notifications.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl border transition ${
                  notif.type === 'CRITICAL'
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    : notif.type === 'WARNING'
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : notif.type === 'SUCCESS'
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                } ${!notif.isRead ? 'ring-1 ring-cyan-500/40' : 'opacity-80'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {notif.type === 'CRITICAL' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : notif.type === 'WARNING' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : notif.type === 'SUCCESS' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                        {notif.body}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 whitespace-nowrap">
                    {notif.time}
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Prototype Disclosure */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2 mt-2">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              <strong>Demo Notification Notice:</strong> These alerts illustrate MobiGuard's background threat notification experience on mobile OS platforms.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
