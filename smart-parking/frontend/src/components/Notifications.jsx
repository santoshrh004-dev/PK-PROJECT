// C:\Users\User\Desktop\PK\smart-parking\frontend\src\components\Notifications.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

export const NotificationContext = createContext({
  notifications: [],
  addNotification: () => {},
  clearAll: () => {},
});

const MAX = 10;
const TOAST_MS = 3000;
const BEEP_FREQ = 800;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message) => {
    const ts = new Date();
    setNotifications((prev) => {
      const next = [...prev, { id: `${Date.now()}-${Math.random()}`, message, ts }];
      return next.slice(Math.max(0, next.length - MAX));
    });
  };

  const clearAll = () => setNotifications([]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

function formatTime(d) {
  try {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = BEEP_FREQ;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    window.setTimeout(() => ctx.close?.(), 250);
  } catch {
    // ignore
  }
}

export default function Notifications() {
  const context = useContext(NotificationContext);
  const {
    notifications,
    addNotification,
    clearAll,
  } = context || { notifications: [], addNotification: () => {}, clearAll: () => {} };

  const { token } = useContext(AuthContext);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const unreadCount = useMemo(() => notifications?.length || 0, [notifications]);

  const showToast = (message, title) => {
    setToast({ id: `${Date.now()}-${Math.random()}`, title, message, ts: new Date() });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  };

  useEffect(() => {
    if (!token) return;

    const onNotifBooked = (e) => {
      const plate = e?.detail?.plate || '';
      const msg = plate ? `Slot booked: ${plate}` : 'Slot booked';
      addNotification?.(msg);
      beep();
      showToast(msg, 'Slot booked');
    };

    const onNotifPaid = () => {
      const msg = 'Payment confirmed';
      addNotification?.(msg);
      beep();
      showToast(msg, 'Payment');
    };

    window.addEventListener('sp:notif:booked', onNotifBooked);
    window.addEventListener('sp:notif:paid', onNotifPaid);
    return () => {
      window.removeEventListener('sp:notif:booked', onNotifBooked);
      window.removeEventListener('sp:notif:paid', onNotifPaid);
    };
  }, [token, addNotification]);

  useEffect(() => {
    const onDown = (e) => {
      const el = e.target;
      if (el && el.closest && el.closest('[data-notif-root]')) return;
      setDropdownOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const items = Array.isArray(notifications) ? notifications : [];

  return (
    <div data-notif-root style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        aria-label="Notifications"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#eaf0ff',
          cursor: 'pointer',
          fontSize: 18,
          padding: '6px 8px',
          position: 'relative',
        }}
      >
        🔔
        {unreadCount > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 4,
              minWidth: 18,
              height: 18,
              padding: '0 6px',
              borderRadius: 999,
              background: '#e94560',
              color: '#fff',
              fontSize: 11,
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,.35)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {dropdownOpen ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 38,
            width: 340,
            background: 'rgba(10,15,30,.96)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: '1px solid rgba(255,255,255,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              color: '#eaf0ff',
            }}
          >
            <div style={{ fontWeight: 950 }}>Notifications</div>
            <button
              type="button"
              onClick={clearAll}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#eaf0ff',
                borderRadius: 12,
                padding: '6px 10px',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto', padding: 12, display: 'grid', gap: 10 }}>
            {items.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No new notifications</div>
            ) : (
              items
                .slice()
                .reverse()
                .map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 14,
                      padding: 10,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ fontSize: 16, marginTop: 2 }}>🔔</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 1000, color: '#eaf0ff' }}>{t.message}</div>
                      <div style={{ marginTop: 6, opacity: 0.65, fontSize: 11, color: '#eaf0ff' }}>{formatTime(t.ts)}</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div style={{ position: 'fixed', right: 18, top: 80, zIndex: 3000 }}>
          <div
            style={{
              width: 360,
              background: 'rgba(10,15,30,0.96)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{ fontWeight: 1000, color: '#eaf0ff' }}>{toast.title}</div>
            <div style={{ marginTop: 4, opacity: 0.85, color: '#eaf0ff', fontSize: 13 }}>{toast.message}</div>
            <div style={{ marginTop: 6, opacity: 0.65, color: '#eaf0ff', fontSize: 11 }}>{formatTime(toast.ts)}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

