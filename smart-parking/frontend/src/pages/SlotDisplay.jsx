// C:\Users\User\Desktop\PK\smart-parking\frontend\src\pages\SlotDisplay.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';

const AVAILABLE = '#22c55e';
const OCCUPIED = '#ef4444';
const RESERVED = '#f59e0b';

function colorForStatus(status) {
  const st = String(status || '').toLowerCase();
  if (st === 'available') return AVAILABLE;
  if (st === 'occupied') return OCCUPIED;
  if (st === 'reserved') return RESERVED;
  return '#334155';
}

function normalizeSlots100(slots) {
  const arr = Array.isArray(slots) ? slots : [];
  const byNum = new Map();
  for (const s of arr) {
    const n = Number(s.slotNumber ?? s.number ?? s._id);
    if (!Number.isFinite(n)) continue;
    byNum.set(n, s);
  }

  const out = [];
  for (let i = 1; i <= 100; i++) {
    const s = byNum.get(i);
    out.push({ slotNumber: i, status: String(s?.status || 'unknown') });
  }
  return out;
}

export default function SlotDisplay() {
  const api = import.meta.env.VITE_API_URL;

  const [slots, setSlots] = useState([]);
  const [lastAssigned, setLastAssigned] = useState(null);
  const [loadingError, setLoadingError] = useState('');

  const [pulseUntil, setPulseUntil] = useState(0);

  const refresh = async () => {
    try {
      setLoadingError('');
      const [slotsRes, lastRes] = await Promise.all([
        axios.get(`${api}/api/slots`),
        axios.get(`${api}/api/slots/last-assigned`),
      ]);

      const list = Array.isArray(slotsRes.data) ? slotsRes.data : slotsRes.data?.slots || [];
      setSlots(normalizeSlots100(list));

      const last = lastRes.data?.lastAssigned ?? lastRes.data ?? null;
      setLastAssigned(last);
      if (last && last.entryTime) setPulseUntil(Date.now() + 30_000);
    } catch (e) {
      setLoadingError(e?.response?.data?.message || e?.message || 'Failed to load display');
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalized = useMemo(() => normalizeSlots100(slots), [slots]);

  const availableCount = useMemo(() => {
    return normalized.filter((s) => String(s.status).toLowerCase() === 'available').length;
  }, [normalized]);

  const isBlinking = Date.now() < pulseUntil;

  const plate = lastAssigned?.vehiclePlate ? String(lastAssigned.vehiclePlate) : '—';
  const slotNum = lastAssigned?.slotNumber ? Number(lastAssigned.slotNumber) : null;
  const floor = lastAssigned?.floor ? String(lastAssigned.floor) : '—';

  const qrHref = `${window.location.origin}/dashboard`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(1200px circle at 10% 10%, rgba(79,124,255,.25), transparent 55%), #070b16',
        color: '#eaf0ff',
        padding: 22,
        fontFamily: 'system-ui',
      }}
    >
      <style>{`@keyframes spBlink {0%{opacity:1}50%{opacity:.2}100%{opacity:1}}.sp-blink{animation: spBlink .9s ease-in-out infinite;}`}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>🚗 SmartPark Live</div>
            <div
              className={isBlinking ? 'sp-blink' : ''}
              style={{
                fontSize: 48,
                fontWeight: 1000,
                lineHeight: 1.05,
                color: isBlinking ? AVAILABLE : '#eaf0ff',
                marginTop: 8,
                letterSpacing: -0.5,
              }}
            >
              🚗 {plate} → SLOT {slotNum ?? '—'} → {floor} FLOOR
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>AVAILABLE: {availableCount} / 100</div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>Auto refresh every 3s</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 10 }}>
              <a href={qrHref} style={{ display: 'inline-flex' }}>
                <QRCode value={qrHref} size={90} />
              </a>
            </div>
          </div>
        </div>

        {loadingError ? (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: 'rgba(255,75,75,.12)', border: '1px solid rgba(255,75,75,.35)' }}>
            {loadingError}
          </div>
        ) : null}

        <div style={{ marginTop: 18, padding: 16, borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            {Array.from({ length: 10 }).map((_, rowIdx) => {
              const row = rowIdx + 1;
              const showRoad = row === 2 || row === 5 || row === 7;

              return (
                <React.Fragment key={row}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
                    {Array.from({ length: 10 }).map((__, colIdx) => {
                      const num = rowIdx * 10 + colIdx + 1;
                      const s = normalized[num - 1];
                      return (
                        <div
                          key={num}
                          style={{
                            height: 30,
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 950,
                            fontSize: 12,
                            background: colorForStatus(s?.status),
                            color: '#08101f',
                            border: '1px solid rgba(255,255,255,.06)',
                          }}
                          title={`Slot ${num}: ${s?.status}`}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                  {showRoad ? (
                    <div style={{ height: 18, borderRadius: 12, background: 'rgba(148,163,184,.35)', border: '1px solid rgba(148,163,184,.25)' }} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

