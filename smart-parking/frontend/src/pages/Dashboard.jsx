import React, { useEffect, useMemo, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../components/Notifications';

const AVAILABLE = '#22c55e';
const OCCUPIED = '#ef4444';
const RESERVED = '#f59e0b';
const UNKNOWN = '#64748b';

function normalizeSlots100(slots) {
  const arr = Array.isArray(slots) ? slots : [];
  const byNum = new Map();
  for (const s of arr) {
    const n = Number(s.slotNumber ?? s.number);
    if (!Number.isFinite(n)) continue;
    byNum.set(n, s);
  }
  return Array.from({ length: 100 }).map((_, i) => {
    const n = i + 1;
    const s = byNum.get(n);
    return {
      slotNumber: n,
      status: String(s?.status || 'unknown'),
      vehiclePlate: s?.vehiclePlate || s?.plate || '',
      entryTime: s?.entryTime || '',
      floor: s?.floor || (n <= 50 ? 'Ground' : 'First'),
    };
  });
}

function colorForStatus(status) {
  const st = String(status || '').toLowerCase();
  if (st === 'available') return AVAILABLE;
  if (st === 'occupied') return OCCUPIED;
  if (st === 'reserved') return RESERVED;
  return UNKNOWN;
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const api = import.meta.env.VITE_API_URL;
  const { token } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationContext);

  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [occupiedSearch, setOccupiedSearch] = useState('');
  const [tooltip, setTooltip] = useState(null);

  const fetchSlots = async () => {
    try {
      const res = await axios.get(`${api}/api/slots`);
      setSlots(Array.isArray(res.data) ? res.data : res.data?.slots || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    if (bookingOpen) return;
    const t = setInterval(fetchSlots, 5000);
    return () => clearInterval(t);
  }, [bookingOpen]);

  const normalized = useMemo(() => normalizeSlots100(slots), [slots]);

  const stats = useMemo(() => {
    let available = 0, occupied = 0, reserved = 0;
    for (const s of normalized) {
      const st = String(s.status).toLowerCase();
      if (st === 'available') available++;
      else if (st === 'occupied') occupied++;
      else if (st === 'reserved') reserved++;
    }
    return { total: 100, available, occupied, reserved };
  }, [normalized]);

  const openBooking = (slotNumber) => {
    if (!token) return;
    const s = normalized[slotNumber - 1];
    if (!s || String(s.status).toLowerCase() !== 'available') return;
    setSelectedSlot(slotNumber);
    setVehiclePlate('');
    setSuccessMsg('');
    setBookingOpen(true);
  };

  const closeBooking = () => {
    setBookingOpen(false);
    setSelectedSlot(null);
    setVehiclePlate('');
    setBookingLoading(false);
    setSuccessMsg('');
  };

  const bookSlot = async () => {
    if (!selectedSlot || !vehiclePlate.trim() || !token) return;
    setBookingLoading(true);
    try {
      await axios.post(
        `${api}/api/slots/book`,
        { slotNumber: selectedSlot, vehiclePlate: vehiclePlate.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Notify after successful booking
      addNotification?.(`Slot ${selectedSlot} booked for ${vehiclePlate.trim()}`);
      closeBooking();
      await fetchSlots();
    } catch (err) {
      setError(err?.response?.data?.message || 'Booking failed');
      setBookingLoading(false);
    }
  };

  const occupiedRows = useMemo(() => {
    return normalized
      .filter(s => String(s.status).toLowerCase() === 'occupied')
      .sort((a, b) => a.slotNumber - b.slotNumber);
  }, [normalized]);

  const filteredRows = useMemo(() => {
    const q = occupiedSearch.trim().toLowerCase();
    if (!q) return occupiedRows;
    return occupiedRows.filter(r =>
      String(r.vehiclePlate).toLowerCase().includes(q) ||
      String(r.slotNumber).includes(q)
    );
  }, [occupiedRows, occupiedSearch]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0b1220,#111b2e)', color: '#eaf0ff', padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginTop: 0 }}>🅿️ Dashboard</h2>
            <p style={{ opacity: 0.7, margin: 0, fontSize: 13 }}>Live updates every 5 seconds</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Stat label="Total" value={stats.total} color="#60a5fa" />
            <Stat label="Available" value={stats.available} color={AVAILABLE} />
            <Stat label="Occupied" value={stats.occupied} color={OCCUPIED} />
            <Stat label="Reserved" value={stats.reserved} color={RESERVED} />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: '1px solid rgba(255,75,75,.35)', background: 'rgba(255,75,75,.12)' }}>
            {error}
          </div>
        )}

        {loading && <div style={{ marginTop: 14, opacity: 0.7 }}>Loading slots...</div>}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[['Available', AVAILABLE], ['Occupied', OCCUPIED], ['Reserved', RESERVED]].map(([label, color]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div style={{ marginTop: 16, position: 'relative' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            {Array.from({ length: 10 }).map((_, rowIdx) => {
              const row = rowIdx + 1;
              const showRoad = row === 2 || row === 5 || row === 7;
              return (
                <React.Fragment key={row}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
                    {Array.from({ length: 10 }).map((__, colIdx) => {
                      const slotNumber = rowIdx * 10 + colIdx + 1;
                      const s = normalized[slotNumber - 1];
                      const status = s?.status;
                      const bg = colorForStatus(status);
                      const isAvailable = String(status).toLowerCase() === 'available';
                      const isOccupied = String(status).toLowerCase() === 'occupied';
                      const plate = s?.vehiclePlate || '';

                      return (
                        <div
                          key={slotNumber}
                          onClick={() => isAvailable && openBooking(slotNumber)}
                          onMouseEnter={() => setTooltip({ slotNumber, status, plate, floor: s?.floor, entryTime: s?.entryTime })}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            height: 48,
                            borderRadius: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            background: bg,
                            color: '#0b1220',
                            cursor: isAvailable ? 'pointer' : 'default',
                            position: 'relative',
                            transition: 'transform 0.1s',
                          }}
                          title={isOccupied ? `Slot ${slotNumber} | ${plate}` : `Slot ${slotNumber}`}
                        >
                          <div style={{ fontSize: isOccupied ? 10 : 12 }}>{slotNumber}</div>
                          {isOccupied && plate && (
                            <div style={{ fontSize: 8, opacity: 0.9, marginTop: 2 }}>
                              {plate.slice(0, 7)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {showRoad && (
                    <div style={{ height: 16, borderRadius: 10, background: 'rgba(148,163,184,.3)', border: '1px solid rgba(148,163,184,.2)' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 200,
              background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 14, padding: '12px 16px', color: '#eaf0ff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)', minWidth: 200
            }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Slot {tooltip.slotNumber}</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Status: {tooltip.status}</div>
              {tooltip.plate && <div style={{ fontSize: 13, opacity: 0.85 }}>Plate: {tooltip.plate}</div>}
              {tooltip.floor && <div style={{ fontSize: 13, opacity: 0.85 }}>Floor: {tooltip.floor}</div>}
              {tooltip.entryTime && <div style={{ fontSize: 12, opacity: 0.7 }}>Entry: {new Date(tooltip.entryTime).toLocaleString()}</div>}
            </div>
          )}
        </div>

        {/* Occupied Slots Table */}
        {occupiedRows.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>🚗 Occupied Slots ({occupiedRows.length})</h3>
              <input
                value={occupiedSearch}
                onChange={e => setOccupiedSearch(e.target.value)}
                placeholder="Search by plate or slot..."
                style={{
                  padding: '8px 14px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.07)',
                  color: '#eaf0ff', outline: 'none', width: 220
                }}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {['Slot #', 'Plate Number', 'Floor', 'Entry Time'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, opacity: 0.85 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(r => (
                    <tr key={r.slotNumber} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: OCCUPIED }}>{r.slotNumber}</td>
                      <td style={{ padding: '10px 14px' }}>{r.vehiclePlate || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{r.floor || '—'}</td>
                      <td style={{ padding: '10px 14px', opacity: 0.8 }}>
                        {r.entryTime ? new Date(r.entryTime).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 14, opacity: 0.6, textAlign: 'center' }}>No results found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {bookingOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 480, background: '#111b2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, color: '#eaf0ff', padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>Book Slot {selectedSlot}</h3>
              <label style={{ fontSize: 13, opacity: 0.85, display: 'block', marginBottom: 6 }}>Vehicle Plate Number</label>
              <input
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value)}
                placeholder="e.g., MH12AB1234"
                style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', color: '#eaf0ff', outline: 'none', boxSizing: 'border-box' }}
              />
              {successMsg && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.35)' }}>
                  {successMsg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={closeBooking} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={bookSlot} disabled={bookingLoading || !vehiclePlate.trim()} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#4f7cff', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: bookingLoading ? 0.7 : 1 }}>
                  {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}