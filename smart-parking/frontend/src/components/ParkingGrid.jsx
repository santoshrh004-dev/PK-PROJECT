// C:\Users\User\Desktop\PK\smart-parking\frontend\src\components\ParkingGrid.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

function colorForStatus(status) {
  const st = String(status || '').toLowerCase();
  if (st === 'available') return '#22c55e';
  if (st === 'occupied') return '#ef4444';
  if (st === 'reserved') return '#f59e0b';
  return '#64748b';
}

function normalizeSlot(slot) {
  const slotNumber = slot.slotNumber ?? slot.number ?? slot.slotId?.slotNumber ?? slot._id;
  const status = slot.status;
  return { slotNumber: Number(slotNumber), status };
}

export default function ParkingGrid({ slots, onError, refresh, token, api: apiProp }) {
  const api = apiProp || import.meta.env.VITE_API_URL;


  const normalized = useMemo(() => {
    const arr = Array.isArray(slots) ? slots : [];
    const mapped = arr.map(normalizeSlot).filter((s) => Number.isFinite(s.slotNumber));
    // Ensure 1..100 order
    mapped.sort((a, b) => a.slotNumber - b.slotNumber);
    return mapped;
  }, [slots]);

  const slotByNum = useMemo(() => {
    const m = new Map();
    for (const s of normalized) m.set(s.slotNumber, s);
    return m;
  }, [normalized]);

  const [selected, setSelected] = useState(null);
  const [plate, setPlate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const [pulse, setPulse] = useState({}); // slotNumber -> boolean

  useEffect(() => {
    // Close modal if selected slot is no longer available
    if (!selected) return;
    const current = slotByNum.get(selected);
    if (current && String(current.status).toLowerCase() !== 'available') setSelected(null);
  }, [slotByNum, selected]);

  const availableCount = useMemo(() => normalized.filter((s) => String(s.status).toLowerCase() === 'available').length, [normalized]);

  const openModal = (slotNumber) => {
    const s = slotByNum.get(slotNumber);
    if (!s) return;
    if (String(s.status).toLowerCase() !== 'available') return;
    setSelected(slotNumber);
    setPlate('');
    setBookingLoading(false);
  };

  const book = async () => {
    if (!selected) return;
    if (!plate.trim()) return;
    if (!token) {
      onError?.('Please login to book a slot');
      return;
    }

    setBookingLoading(true);
    try {
      await axios.post(
        `${api}/api/slots/book`,
        { vehiclePlate: plate.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );


      setPulse((p) => ({ ...p, [selected]: true }));
      setTimeout(() => setPulse((p) => ({ ...p, [selected]: false })), 700);

      setSelected(null);
      await refresh?.();
    } catch (err) {
      onError?.(err?.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ opacity: 0.9 }}>
          Available slots: <b>{availableCount}</b>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(10, 1fr)', rowGap: 10 }}>
          {Array.from({ length: 10 }).map((_, rowIdx) => {
            const row = rowIdx + 1;
            const showRoad = row === 2 || row === 5 || row === 7;

            const cells = Array.from({ length: 10 }).map((__, colIdx) => {
              const col = colIdx + 1;
              const slotNumber = (row - 1) * 10 + col;
              const s = slotByNum.get(slotNumber);
              const status = s?.status;
              const isAvailable = String(status || '').toLowerCase() === 'available';

              const bg = colorForStatus(status);

              return (
                <div
                  key={slotNumber}
                  role="button"
                  tabIndex={0}
                  onClick={() => isAvailable && openModal(slotNumber)}
                  onKeyDown={(e) => e.key === 'Enter' && isAvailable && openModal(slotNumber)}
                  style={{
                    height: 46,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 14,
                    background: bg,
                    color: '#0b1220',
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    transform: pulse[slotNumber] ? 'scale(1.04)' : 'scale(1.0)',
                    transition: 'transform .2s ease',
                    boxShadow: isAvailable ? '0 10px 24px rgba(34,197,94,.18)' : '0 10px 24px rgba(0,0,0,.18)',
                    outline: pulse[slotNumber] ? '3px solid rgba(255,255,255,.55)' : 'none',
                  }}
                  aria-label={`Slot ${slotNumber} ${status || 'unknown'}`}
                >
                  {slotNumber}
                </div>
              );
            });

            return (
              <React.Fragment key={row}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 10 }}>{cells}</div>
                {showRoad ? <Road key={`road-${row}`} /> : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0 }}>Book Slot {selected}</h3>
            <p style={{ opacity: 0.85, marginTop: -6 }}>Enter vehicle plate number to confirm booking.</p>

            <label style={{ display: 'block', marginTop: 12, fontSize: 14, opacity: 0.9 }}>Vehicle Plate</label>
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="e.g., MH12AB1234"
              style={inputStyle}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ ...btnSecondary, padding: '10px 14px' }}
                disabled={bookingLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={book}
                style={{ ...btnPrimary, padding: '10px 14px', opacity: bookingLoading ? 0.8 : 1 }}
                disabled={bookingLoading || !plate.trim()}
              >
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>

            <p style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
              Note: Server must implement <code>/api/slots/book</code>.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 16,
};

const modalStyle = {
  width: '100%',
  maxWidth: 520,
  background: 'rgba(17,27,46,.96)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 18,
  color: '#eaf0ff',
  padding: 18,
  backdropFilter: 'blur(10px)',
};

const inputStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,.16)',
  background: 'rgba(255,255,255,.08)',
  color: '#eaf0ff',
  outline: 'none',
  marginTop: 8,
};

const btnPrimary = {
  background: '#4f7cff',
  border: 'none',
  color: '#fff',
  borderRadius: 14,
  fontWeight: 900,
  cursor: 'pointer',
};

const btnSecondary = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  color: '#fff',
  borderRadius: 14,
  fontWeight: 900,
  cursor: 'pointer',
};

function Road() {
  return (
    <div style={{ height: 24, borderRadius: 12, background: 'rgba(148,163,184,.35)', border: '1px solid rgba(148,163,184,.25)', margin: '0 2px' }} />
  );
}

