// C:\Users\User\Desktop\PK\smart-parking\frontend\src\pages\Analytics.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

const COLORS = {
  magenta: '#e94560',
  green: '#22c55e',
  amber: '#f59e0b',
  blue: '#60a5fa',
};

function formatINR(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  } catch {
    return `₹${num}`;
  }
}

function Panel({ children }) {
  return (
    <section
      style={{
        background: 'rgba(26,26,46,0.65)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 20,
        padding: 16,
      }}
    >
      {children}
    </section>
  );
}

export default function Analytics() {
  const api = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${api}/api/bookings/analytics`);
        setData(res.data?.analytics ?? res.data);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [api]);

  const charts = useMemo(() => {
    const safe = data || {};

    const hourlyOccupancy = Array.isArray(safe.hourlyOccupancy)
      ? safe.hourlyOccupancy
      : Array.isArray(safe.hourlyData)
        ? safe.hourlyData
        : [];

    const hourly = Array.from({ length: 24 }).map((_, h) => {
      const found = hourlyOccupancy.find((x) => Number(x.hour) === h || String(x.hour) === String(h));
      const value = found?.value ?? found?.count ?? 0;
      return { hour: h, value: Number(value) };
    });

    const dailyRevenueArr = Array.isArray(safe.dailyRevenue) ? safe.dailyRevenue : [];
    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const found = dailyRevenueArr[i] || dailyRevenueArr.find((x) => String(x.date) === String(dailyRevenueArr[i]?.date));
      return {
        day: found?.date ?? found?.day ?? `Day ${i + 1}`,
        value: Number(found?.revenue ?? found?.value ?? 0),
      };
    });

    const slotStatus = safe.slotStatus || safe.slotStatusCount || {};
    const pie = [
      { name: 'available', value: Number(slotStatus.available ?? 0) },
      { name: 'occupied', value: Number(slotStatus.occupied ?? 0) },
      { name: 'reserved', value: Number(slotStatus.reserved ?? 0) },
    ];

    const peakHoursArr = Array.isArray(safe.peakHours) ? safe.peakHours : [];
    const peak = Array.from({ length: 17 }).map((_, i) => {
      const hour = 6 + i;
      const found = peakHoursArr.find((x) => Number(x.hour) === hour || String(x.hour) === String(hour));
      const value = found?.count ?? found?.value ?? 0;
      return { hour, value: Number(value) };
    });

    return { hourly, last7, pie, peak };
  }, [data]);

  const tooltipStyle = {
    background: 'rgba(10,15,30,.92)',
    border: '1px solid rgba(255,255,255,.12)',
    padding: 10,
    borderRadius: 12,
  };

  return (
    <div style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui', background: 'linear-gradient(135deg,#070b16,#0b1220)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', color: '#eaf0ff' }}>
        <h2 style={{ marginTop: 0 }}>Analytics</h2>
        <p style={{ margin: '6px 0 0', opacity: 0.85 }}>Live performance indicators for SmartPark.</p>

        {error ? (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: 'rgba(255,75,75,.12)', border: '1px solid rgba(255,75,75,.35)' }}>
            {error}
          </div>
        ) : null}

        {loading ? <div style={{ marginTop: 12, opacity: 0.85 }}>Loading analytics...</div> : null}

        {!loading && !error ? (
          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <Panel>
              <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 10 }}>Hourly Occupancy (24 hours)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.hourly} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.10)" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="rgba(255,255,255,.7)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,.7)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={(props) => {
                      if (!props?.payload?.length) return null;
                      return (
                        <div style={tooltipStyle}>
                          <div style={{ fontWeight: 900, color: '#eaf0ff', opacity: 0.9 }}>{props.label}:00</div>
                          <div style={{ marginTop: 4, fontWeight: 1000, color: '#eaf0ff' }}>{props.payload?.[0]?.value} occupied</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" name="Occupied" fill={COLORS.magenta} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 10 }}>Daily Revenue — last 7 days (₹)</div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={charts.last7} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.10)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,.7)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,.7)" tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v)} />
                  <Tooltip
                    content={(props) => {
                      if (!props?.payload?.length) return null;
                      return (
                        <div style={tooltipStyle}>
                          <div style={{ fontWeight: 900, color: '#eaf0ff', opacity: 0.9 }}>{props.label}</div>
                          <div style={{ marginTop: 4, fontWeight: 1000, color: '#eaf0ff' }}>{formatINR(props.payload?.[0]?.value)}</div>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="value" name="Revenue" stroke={COLORS.blue} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 10 }}>Slot Status (available/occupied/reserved)</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip
                    content={(props) => {
                      const item = props?.payload?.[0];
                      if (!item) return null;
                      return (
                        <div style={tooltipStyle}>
                          <div style={{ fontWeight: 900, color: '#eaf0ff', opacity: 0.9 }}>{item.name}</div>
                          <div style={{ marginTop: 4, fontWeight: 1000, color: '#eaf0ff' }}>{item.value}</div>
                        </div>
                      );
                    }}
                  />
                  <Pie data={charts.pie} dataKey="value" innerRadius={55} outerRadius={95}>
                    {charts.pie.map((p) => {
                      const fill = p.name === 'available' ? COLORS.green : p.name === 'occupied' ? COLORS.magenta : COLORS.amber;
                      return <Cell key={p.name} fill={fill} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 10 }}>Peak Hours (6am to 10pm)</div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={charts.peak} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.10)" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="rgba(255,255,255,.7)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,.7)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={(props) => {
                      if (!props?.payload?.length) return null;
                      return (
                        <div style={tooltipStyle}>
                          <div style={{ fontWeight: 900, color: '#eaf0ff', opacity: 0.9 }}>{props.label}:00</div>
                          <div style={{ marginTop: 4, fontWeight: 1000, color: '#eaf0ff' }}>{props.payload?.[0]?.value} slots</div>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="value" name="Peak" stroke={COLORS.green} fill="rgba(34,197,94,0.20)" />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        ) : null}
      </div>
    </div>
  );
}

