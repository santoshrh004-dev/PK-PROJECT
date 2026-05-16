// C:\Users\User\Desktop\PK\smart-parking\frontend\src\components\VoiceAssistant.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function speak(msg) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = 'en-IN';
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const { logout = () => {} } = useContext(AuthContext);

  const recognitionRef = useRef(null);
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const SpeechRecognition = useMemo(() => {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r?.[0]?.transcript)
        .join(' ')
        .trim();

      if (!text) return;
      setTranscript(text);

      const t = normalize(text);

      if (/(book slot|book a slot|reserve slot)/.test(t)) {
        speak('Booking slot. Redirecting to dashboard.');
        navigate('/dashboard');
        return;
      }
      if (/entry gate|entry/.test(t) && !/exit/.test(t)) {
        speak('Opening entry gate.');
        navigate('/entry');
        return;
      }
      if (/exit gate|exit/.test(t)) {
        speak('Opening exit gate.');
        navigate('/exit');
        return;
      }
      if (/show slots|show slot|display slots|slots/.test(t)) {
        speak('Opening slot display.');
        navigate('/slots');
        return;
      }
      if (/admin/.test(t)) {
        speak('Opening admin panel.');
        navigate('/admin');
        return;
      }
      if (/logout|log out|sign out/.test(t)) {
        speak('Logging out.');
        logout();
        navigate('/');
        return;
      }

      speak('Command not recognized. Try book slot, entry gate, exit gate, show slots, admin, or logout.');
    };

    rec.onerror = () => {
      setListening(false);
      speak('Voice recognition error. Try again.');
    };

    rec.onend = () => {
      setListening(false);
    };

    // Cleanup
    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, [SpeechRecognition, navigate, logout]);

  const start = () => {
    if (!supported) return;
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      setTranscript('Listening...');
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // ignore
    }
    setListening(false);
  };

  if (!supported) return null;

  return (
    <div style={{ position: 'fixed', left: 18, bottom: 18, zIndex: 3200 }}>
      <div
        style={{
          marginBottom: 10,
          background: 'rgba(10,15,30,0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: '8px 10px',
          color: '#eaf0ff',
          maxWidth: 240,
          fontSize: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          userSelect: 'none',
          display: transcript ? 'block' : 'none',
        }}
      >
        {transcript || 'Tap mic and speak'}
      </div>

      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        aria-label="Voice assistant"
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.18)',
          background: listening ? 'rgba(239,68,68,0.95)' : 'rgba(96,165,250,0.95)',
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          boxShadow: listening ? '0 0 0 0 rgba(239,68,68,0.35)' : '0 10px 30px rgba(96,165,250,0.35)',
          animation: listening ? 'vaPulse 1.2s infinite' : 'none',
        }}
      >
        🎤
      </button>

      <style>{`
        @keyframes vaPulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); transform: translateY(0); }
          70% { box-shadow: 0 0 0 18px rgba(239,68,68,0); transform: translateY(-1px); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

