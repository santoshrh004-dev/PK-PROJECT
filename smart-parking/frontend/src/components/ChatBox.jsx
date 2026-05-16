// C:\Users\User\Desktop\PK\smart-parking\frontend\src\components\ChatBox.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QUICK_REPLIES = [
  { key: 'slot blocked', label: 'Slot blocked', reply: 'We will send staff immediately' },
  { key: 'payment issue', label: 'Payment issue', reply: 'Please check your UPI app' },
  { key: 'change slot', label: 'Change slot', reply: 'Please contact admin at counter' },
  { key: 'contact admin', label: 'Contact admin', reply: 'Admin has been notified' },
];

const keywordReply = (text) => {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return '';
  if (t.includes('blocked')) return 'We will send staff';
  if (t.includes('payment')) return 'Check your UPI app';
  if (t.includes('help')) return 'How can I help you?';
  if (t.includes('slot')) return 'Please share more details for your request.';
  return 'Thanks! We received your message. Our team will respond shortly.';
};

const formatTime = (d) => {
  try {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatBox() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');

  const [messages, setMessages] = useState(() => [
    { id: makeId(), from: 'bot', text: 'Hi! How can we help you today?', ts: new Date() },
  ]);

  const listRef = useRef(null);

  const quickButtons = useMemo(() => QUICK_REPLIES, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open, minimized]);

  const addMessage = (from, text) => {
    setMessages((prev) => [...prev, { id: makeId(), from, text, ts: new Date() }]);
  };

  const send = async (text) => {
    const t = String(text || '').trim();
    if (!t) return;

    addMessage('user', t);
    setInput('');

    await new Promise((r) => setTimeout(r, 200));

    // fixed responses by quick key/label
    const matchedQuick = quickButtons.find((q) => q.key === t || q.label === t);
    if (matchedQuick) {
      addMessage('bot', matchedQuick.reply);
      return;
    }

    // free text keyword matching
    const reply = keywordReply(t);
    if (reply) addMessage('bot', reply);
  };

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 3000 }}>
      {!open || minimized ? (
        <button
          type="button"
          aria-label="Open chat"
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(233,69,96,0.95)',
            color: '#fff',
            fontSize: 22,
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(233,69,96,0.35)',
          }}
        >
          💬
        </button>
      ) : null}

      {open && !minimized ? (
        <div
          style={{
            width: 320,
            height: 400,
            borderRadius: 16,
            overflow: 'hidden',
            background: 'rgba(10,15,30,0.92)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: '1px solid rgba(255,255,255,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(180deg, rgba(233,69,96,0.25), rgba(10,15,30,0))',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 1000, color: '#eaf0ff' }}>SmartPark Support</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Quick auto-replies</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#eaf0ff',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                _
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setMinimized(false);
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#eaf0ff',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: m.from === 'user' ? 'rgba(96,165,250,0.18)' : 'rgba(34,197,94,0.14)',
                    border: m.from === 'user' ? '1px solid rgba(96,165,250,0.25)' : '1px solid rgba(34,197,94,0.25)',
                  }}
                >
                  <div style={{ color: '#eaf0ff', fontWeight: 650, fontSize: 13 }}>{m.text}</div>
                  <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7, color: '#eaf0ff' }}>{formatTime(m.ts)}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {quickButtons.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => {
                    send(q.key);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#eaf0ff',
                    borderRadius: 999,
                    padding: '7px 10px',
                    cursor: 'pointer',
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                placeholder="Type your issue..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send(input);
                }}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#eaf0ff',
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => send(input)}
                style={{
                  width: 70,
                  height: 38,
                  borderRadius: 12,
                  border: '1px solid rgba(233,69,96,0.35)',
                  background: 'rgba(233,69,96,0.95)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 1000,
                }}
              >
                Send
              </button>
            </div>

            <div style={{ marginTop: 8, opacity: 0.7, fontSize: 11 }}>
              Try: blocked / payment / help
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

