// C:\Users\User\Desktop\PK\smart-parking\frontend\src\pages\Admin.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function RequireAdmin({ children }) {
  const { user } = useContext(AuthContext);
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function formatINR(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  } catch {
    return `₹${num}`;
  }
}

function Th({ children }) {
  return (
    <th style={{ padding: '10px 8px', fontSize: 12, opacity: 0.85, fontWeight: 950, textAlign: 'left' }}>
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td style={{ padding: '10px 8px', fontSize: 13, verticalAlign: 'top' }}>
      {children}
    </td>
  );
}

function statusBadge(status) {
  const st = String(status || '').toLowerCase();
  const map = {
    available: { bg: 'rgba(34,197,94,.16)', bd: 'rgba(34,197,94,.35)' },
    occupied: { bg: 'rgba(239,68,68,.16)', bd: 'rgba(239,68,68,.35)' },
    reserved: { bg: 'rgba(245,158,11,.16)', bd: 'rgba(245,158,11,.35)' },
  };
  const { bg, bd } = map[st] || { bg: 'rgba(148,163,184,.16)', bd: 'rgba(148,163,184,.28)' };
  return { bg, bd };
}

const btn = {
  primary: {
    background: 'rgba(79,124,255,.18)',
    border: '1px solid rgba(79,124,255,.45)',
    color: '#eaf0ff',
    padding: '10px 14px',
    borderRadius: 14,
    fontWeight: 950,
    cursor: 'pointer',
  },
  secondary: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#eaf0ff',
    padding: '10px 14px',
    borderRadius: 14,
    fontWeight: 950,
    cursor: 'pointer',
  },
  tiny: {
    padding: '8px 10px',
    borderRadius: 12,
    fontWeight: 950,
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#eaf0ff',
  },
};

export default function Admin() {
  const api = import.meta.env.VITE_API_URL;
  const { user } = useContext(AuthContext);

  const [tab, setTab] = useState('slots');

  const [slotFilter, setSlotFilter] = useState('all');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');

  const totalRevenue = useMemo(() => {
    let sum = 0;
    for (const b of bookings) {
      const amt = b.amount ?? b.totalAmount ?? b.total ?? 0;
      const ps = String(b.paymentStatus ?? b.payment?.status ?? b.payment ?? '');
      const paidLike = ps.toLowerCase() === 'paid' || ps.toLowerCase() === 'success' || ps.toLowerCase() === 'confirmed';
      if (paidLike) sum += Number(amt) || 0;
    }
    return sum;
  }, [bookings]);

  const refreshSlots = async () => {
    setSlotsLoading(true);
    setSlotsError('');
    try {
      const res = await axios.get(`${api}/api/admin/slots`);
      const list = Array.isArray(res.data) ? res.data : res.data?.slots || res.data?.data || [];
      setSlots(list);
    } catch (e) {
      setSlotsError(e?.response?.data?.message || e?.message || 'Failed to fetch slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const refreshBookings = async (search = '') => {
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const qs = search ? `?plate=${encodeURIComponent(search.trim())}` : '';
      const res = await axios.get(`${api}/api/admin/bookings${qs}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.bookings || res.data?.data || [];
      setBookings(list);
    } catch (e) {
      setBookingsError(e?.response?.data?.message || e?.message || 'Failed to fetch bookings');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    refreshSlots();
    refreshBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSlots = useMemo(() => {
    const list = Array.isArray(slots) ? slots : [];
    if (slotFilter === 'all') return list;
    return list.filter((s) => String(s.status || '').toLowerCase() === String(slotFilter).toLowerCase());
  }, [slots, slotFilter]);

  const overrideSlot = async (slotNumber, status) => {
    try {
      await axios.patch(`${api}/api/slots/override`, { slotNumber, status });
      await refreshSlots();
    } catch (e) {
      setSlotsError(e?.response?.data?.message || e?.message || 'Override failed');
    }
  };

  const releaseAll = async () => {
    try {
      await axios.post(`${api}/api/admin/release-all`);
      await refreshSlots();
    } catch (e) {
      setSlotsError(e?.response?.data?.message || e?.message || 'Release all failed');
    }
  };

  const submitSearch = () => refreshBookings(bookingSearch);

  return (
    <RequireAdmin>
      <div style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui', background: 'linear-gradient(135deg,#0b1220,#111b2e)', color: '#eaf0ff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Admin Panel</h2>
              <p style={{ margin: '6px 0 0', opacity: 0.85 }}>Manage slots and bookings.</p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={tab === 'slots' ? btn.primary : btn.secondary} onClick={() => setTab('slots')}>
                Slot Manager
              </button>
              <button type="button" style={tab === 'bookings' ? btn.primary : btn.secondary} onClick={() => setTab('bookings')}>
                Bookings
              </button>
            </div>
          </div>

          {tab === 'slots' ? (
            <div style={{ marginTop: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ opacity: 0.85, fontSize: 14 }}>Filter by status</label>
                  <select
                    value={slotFilter}
                    onChange={(e) => setSlotFilter(e.target.value)}
                    style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.08)', color: '#eaf0ff' }}
                  >
                    <option value="all">All</option>
                    <option value="available">available</option>
                    <option value="occupied">occupied</option>
                    <option value="reserved">reserved</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" style={btn.secondary} onClick={releaseAll}>
                    Release All
                  </button>
                  <button type="button" style={btn.secondary} onClick={refreshSlots}>
                    Refresh
                  </button>
                </div>
              </div>

              {slotsError ? (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: 'rgba(255,75,75,.12)', border: '1px solid rgba(255,75,75,.35)' }}>
                  {slotsError}
                </div>
              ) : null}

              <div style={{ marginTop: 14, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                  <thead>
                    <tr>
                      <Th>Slot#</Th>
                      <Th>Floor</Th>
                      <Th>Status</Th>
                      <Th>Plate</Th>
                      <Th>Entry Time</Th>
                      <Th>Override</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotsLoading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 12, opacity: 0.85 }}>
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      filteredSlots.map((s) => {
                        const slotNumber = s.slotNumber ?? s.number;
                        const floor = s.floor ?? (Number(slotNumber) <= 50 ? 'Ground' : 'First');
                        const status = String(s.status || 'unknown');
                        const plate = s.vehiclePlate ?? s.vehicle?.plate ?? s.plate ?? '';
                        const entryTime = s.entryTime ?? s.booking?.entryTime ?? '';
                        const { bg, bd } = statusBadge(status);

                        return (
                          <tr key={String(slotNumber)} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <Td>{slotNumber}</Td>
                            <Td>{floor}</Td>
                            <Td>
                              <span style={{ padding: '6px 10px', borderRadius: 999, fontWeight: 950, fontSize: 12, background: bg, border: `1px solid ${bd}` }}>
                                {status}
                              </span>
                            </Td>
                            <Td>{plate || <span style={{ opacity: 0.65 }}>—</span>}</Td>
                            <Td>{entryTime ? new Date(entryTime).toLocaleString() : <span style={{ opacity: 0.65 }}>—</span>}</Td>
                            <Td>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button type="button" style={{ ...btn.tiny, background: 'rgba(34,197,94,.18)', borderColor: 'rgba(34,197,94,.35)' }} onClick={() => overrideSlot(Number(slotNumber), 'available')}>
                                  Available
                                </button>
                                <button type="button" style={{ ...btn.tiny, background: 'rgba(245,158,11,.18)', borderColor: 'rgba(245,158,11,.35)' }} onClick={() => overrideSlot(Number(slotNumber), 'reserved')}>
                                  Reserved
                                </button>
                                <button type="button" style={{ ...btn.tiny, background: 'rgba(239,68,68,.18)', borderColor: 'rgba(239,68,68,.35)' }} onClick={() => overrideSlot(Number(slotNumber), 'occupied')}>
                                  Occupied
                                </button>
                              </div>
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === 'bookings' ? (
            <div style={{ marginTop: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ opacity: 0.85, fontSize: 14 }}>Total revenue</div>
                  <div style={{ fontWeight: 1000, fontSize: 26, marginTop: 4, color: '#60a5fa' }}>{formatINR(totalRevenue)}</div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search plate"
                    style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.08)', color: '#eaf0ff', minWidth: 240 }}
                  />
                  <button type="button" style={btn.secondary} onClick={submitSearch}>
                    Search
                  </button>
                </div>
              </div>

              {bookingsError ? (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: 'rgba(255,75,75,.12)', border: '1px solid rgba(255,75,75,.35)' }}>
                  {bookingsError}
                </div>
              ) : null}

              <div style={{ marginTop: 14, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                  <thead>
                    <tr>
                      <Th>Slot</Th>
                      <Th>Plate</Th>
                      <Th>Entry</Th>
                      <Th>Exit</Th>
                      <Th>Duration</Th>
                      <Th>Amount</Th>
                      <Th>Payment</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsLoading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 12, opacity: 0.85 }}>
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => {
                        const slot = b.slotNumber ?? b.slot?.slotNumber ?? '';
                        const plate = b.vehiclePlate ?? b.vehicle?.plate ?? b.plate ?? '';
                        const entry = b.entryTime ?? b.entry?.time ?? b.createdAt;
                        const exit = b.exitTime ?? b.exit?.time ?? null;
                        const amount = b.amount ?? b.totalAmount ?? b.total ?? 0;
                        const pay = b.paymentStatus ?? b.payment?.status ?? '';

                        let durationStr = <span style={{ opacity: 0.65 }}>—</span>;
                        if (entry && exit) {
                          const ms = Math.max(0, new Date(exit) - new Date(entry));
                          const mins = Math.max(1, Math.round(ms / 60000));
                          durationStr = `${mins} min`;
                        }

                        return (
                          <tr key={String(b._id || `${slot}-${plate}-${entry}`)} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <Td>{slot}</Td>
                            <Td>{plate || <span style={{ opacity: 0.65 }}>—</span>}</Td>
                            <Td>{entry ? new Date(entry).toLocaleString() : <span style={{ opacity: 0.65 }}>—</span>}</Td>
                            <Td>{exit ? new Date(exit).toLocaleString() : <span style={{ opacity: 0.65 }}>—</span>}</Td>
                            <Td>{durationStr}</Td>
                            <Td>{formatINR(amount)}</Td>
                            <Td>
                              <span style={{ padding: '6px 10px', borderRadius: 999, fontWeight: 950, fontSize: 12, background: pay === 'paid' ? 'rgba(34,197,94,.18)' : 'rgba(148,163,184,.18)', border: '1px solid rgba(255,255,255,.14)' }}>
                                {pay || '—'}
                              </span>
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 20, opacity: 0.6, fontSize: 12 }}>
            Logged in as: {user?.email || user?.name || 'admin'}
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
}

