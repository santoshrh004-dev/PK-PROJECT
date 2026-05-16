import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { NotificationContext } from '../components/Notifications';
import axios from 'axios';
import QRCode from 'react-qr-code';
import { AuthContext } from '../context/AuthContext';


function formatMoneyINR(amount) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

function normalizePlateFromOcr(raw) {
  const up = String(raw || '').toUpperCase();
  // keep A-Z and digits
  const cleaned = up.replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return '';

  // if too long, keep the last 10 chars (common plate length)
  let best = cleaned;
  if (best.length > 10) best = best.slice(best.length - 10);

  // If too short, return cleaned
  if (best.length < 6) return best;
  return best;
}

function randomPlate() {
  // Format: MH12AB1234
  const states = ['MH', 'DL', 'KA', 'TN', 'TG', 'GJ', 'RJ', 'UP'];
  const s = states[Math.floor(Math.random() * states.length)];
  const district = String(Math.floor(Math.random() * 90) + 10).padStart(2, '0');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const a = letters[Math.floor(Math.random() * letters.length)];
  const b = letters[Math.floor(Math.random() * letters.length)];
  const num = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
  return `${s}${district}${a}${b}${num}`;
}

export default function ExitGate() {
  const api = import.meta.env.VITE_API_URL;
  const { token } = useContext(AuthContext);

  // Vehicle Plate OR Slot Number (manual backup + OCR result)
  const [identifier, setIdentifier] = useState('');
  const [plate, setPlate] = useState('');

  const [paymentAmount, setPaymentAmount] = useState(null);
  const [slotNumber, setSlotNumber] = useState(null);
  const [qrValue, setQrValue] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [payCountdown, setPayCountdown] = useState(120);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);

  // Camera + OCR
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrPreview, setOcrPreview] = useState(null);

  useEffect(() => {
    return () => {
      // stop camera on unmount
      try {
        const v = videoRef.current;
        const s = v?.srcObject;
        if (s && typeof s.getTracks === 'function') s.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!paymentAmount || paymentSuccess) return;
    setPayCountdown(120);
    const t = setInterval(() => {
      setPayCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [paymentAmount, paymentSuccess]);

  const billBreakdown = useMemo(() => {
    if (!booking || paymentAmount == null) return null;
    const start = booking.entryTime ? new Date(booking.entryTime) : null;
    const end = new Date();
    const diffHours = start ? Math.max(0, (end - start) / 36e5) : 0;
    const hoursRounded = Math.max(1, Math.ceil(diffHours));
    const base = 20;
    const perHour = 10 * hoursRounded;
    const total = base + perHour;
    return { hours: hoursRounded, base, perHour, total };
  }, [booking, paymentAmount]);

  const buildUpiQr = (amount, slotNumberValue) => {
    const amt = String(amount);
    return `upi://pay?pa=smartpark@upi&pn=SmartPark&am=${encodeURIComponent(amt)}&cu=INR&tn=Slot-${encodeURIComponent(
      String(slotNumberValue)
    )}`;
  };

  const fetchBooking = async () => {
    setError('');
    setPaymentSuccess(false);
    setBooking(null);
    setQrValue('');
    setPaymentAmount(null);
    setSlotNumber(null);

    const id = String(identifier || '').trim();
    if (!id) {
      setError('Enter vehicle plate or slot number');
      return;
    }

    setLoading(true);
    try {
      const isSlot = !isNaN(Number(id));
      const url = isSlot
        ? `${api}/api/bookings/by-slot/${encodeURIComponent(id)}`
        : `${api}/api/bookings/by-plate/${encodeURIComponent(id)}`;

      const res = await axios.get(url);
      const b = res.data.booking || res.data;
      setBooking(b);

      const slot = b.slotNumber ?? b.slot?.slotNumber;
      setSlotNumber(slot ?? null);

      const total = b.totalAmount ?? b.amount ?? 30;
      setPaymentAmount(Number(total));
      setQrValue(buildUpiQr(Number(total), slot ?? ''));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch booking');
    } finally {
      setLoading(false);
    }
  };

  const { addNotification } = useContext(NotificationContext);

  const confirmPayment = async () => {
    if (!booking) return;
    if (!slotNumber) {
      setError('Slot number missing');
      return;
    }
    setError('');

    try {
      if (!token) throw new Error('Please login');

      await axios.post(
        `${api}/api/payments/confirm`,
        {
          bookingId: booking._id,
          slotNumber,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPaymentSuccess(true);
      addNotification?.('Payment confirmed');
      window.dispatchEvent(new CustomEvent('sp:notif:paid'));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Payment confirmation failed');
    }
  };

  const printReceipt = () => {
    const plateVal = booking?.vehiclePlate ?? '';
    const text = [
      'Smart Parking — Payment Receipt',
      `Plate: ${plateVal}`,
      `Slot: ${slotNumber ?? ''}`,
      `Amount: ${formatMoneyINR(paymentAmount)}`,
      `Time: ${new Date().toLocaleString()}`,
    ].join('\n');

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<pre>${text}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const startCamera = async () => {
    setOcrError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
       } catch (err) {
      setOcrError('Camera permission denied / camera not available');
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    try {
      const v = videoRef.current;
      const s = v?.srcObject;
      if (s && typeof s.getTracks === 'function') s.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch (err) {
      // ignore
    }
    setCameraOn(false);
  };

  const detectPlate = async (imageDataUrl) => {
    setOcrError('');
    setOcrBusy(true);
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append('upload', blob, 'plate.jpg');
      formData.append('regions', 'in');

      const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${import.meta.env.VITE_PLATE_API_KEY}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const plate = data.results[0].plate.toUpperCase();
        const confidence = Math.round(data.results[0].score * 100);
        setPlate(plate);
        setIdentifier(plate);
        setOcrPreview((prev) => prev);
        setOcrError(`✅ Detected: ${plate} (${confidence}% confidence)`);
      } else {
        setOcrError('❌ No plate detected - please enter manually');
      }
    } catch {
      setOcrError('❌ API error - please enter manually');
    } finally {
      setOcrBusy(false);
    }
  };

  const runOcrOnFrame = async () => {
    setOcrError('');
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error('Camera not ready');

      const w = video.videoWidth || 720;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // draw video frame
      ctx.drawImage(video, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setOcrPreview(dataUrl);

      await detectPlate(dataUrl);
    } catch {
      setOcrError('OCR failed. Please enter plate manually.');
      setOcrBusy(false);
    }
  };


  const autoGeneratePlateForTesting = () => {
    const p = randomPlate();
    setPlate(p);
    setIdentifier(p);
    setOcrError('');
  };

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: 'linear-gradient(135deg,#0b1220,#111b2e)', color: '#eaf0ff', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>🚪 Exit Gate</h2>

        {paymentSuccess ? (
          <div style={{ marginTop: 18, padding: 18, borderRadius: 16, background: 'rgba(46,204,113,0.14)', border: '1px solid rgba(46,204,113,0.45)' }}>
            <h3 style={{ margin: 0 }}>✅ Payment Successful!</h3>
            <p style={{ marginTop: 8, opacity: 0.9 }}>Slot released. Thank you!</p>
            <button
              onClick={() => window.location.assign('/dashboard')}
              style={{ marginTop: 12, padding: '10px 20px', borderRadius: 12, background: '#22c55e', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Camera + OCR Section */}
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 16, opacity: 0.95 }}>📷 Capture Plate (Auto OCR)</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: 10, background: 'rgba(0,0,0,0.15)' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', borderRadius: 12, display: 'block', background: '#0b1220' }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={cameraOn ? stopCamera : startCamera}
                      disabled={ocrBusy || loading}
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#eaf0ff', padding: '10px 12px', borderRadius: 14, cursor: 'pointer' }}
                    >
                      {cameraOn ? 'Stop Camera' : 'Start Camera'}
                    </button>

                    <button
                      type="button"
                      onClick={runOcrOnFrame}
                      disabled={!cameraOn || ocrBusy || loading}
                      style={{ background: '#4f7cff', border: 'none', color: '#fff', padding: '10px 12px', borderRadius: 14, fontWeight: 800, cursor: 'pointer' }}
                    >
                      {ocrBusy ? 'Reading...' : '📸 Capture Plate'}
                    </button>
                  </div>

                  {ocrError ? (
                    <div style={{ marginTop: 10, background: 'rgba(255,75,75,.12)', border: '1px solid rgba(255,75,75,.35)', padding: 10, borderRadius: 12 }}>
                      {ocrError}
                    </div>
                  ) : null}
                </div>

                <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: 10, background: 'rgba(0,0,0,0.15)', minHeight: 260 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>🖼️ OCR Preview</div>
                  {ocrPreview ? (
                    <img src={ocrPreview} alt="OCR Preview" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)' }} />
                  ) : (
                    <div style={{ opacity: 0.8 }}>No capture yet.</div>
                  )}
                  <div style={{ marginTop: 12, opacity: 0.85, fontSize: 13 }}>
                    Tip: ensure plate is centered and well-lit.
                  </div>
                </div>
              </div>

              {/* Manual input backup + auto generate */}
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 14, color: 'rgba(234,240,255,.85)' }}>Vehicle Plate Number (OCR or Manual)</label>
                <input
                  value={plate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPlate(v);
                    setIdentifier(v);
                  }}
                  placeholder="e.g., MH12AB1234"
                  style={{
                    marginTop: 8,
                    width: '100%',
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#eaf0ff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={autoGeneratePlateForTesting}
                    disabled={loading || ocrBusy}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#eaf0ff', padding: '10px 16px', borderRadius: 14, cursor: 'pointer' }}
                  >
                    Auto Generate (Testing)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // sync identifier from plate in case they typed differently
                      const clean = String(plate || '').trim().toUpperCase();
                      setIdentifier(clean);
                    }}
                    disabled={loading || ocrBusy}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#eaf0ff', padding: '10px 16px', borderRadius: 14, cursor: 'pointer' }}
                  >
                    Use Plate
                  </button>
                </div>
              </div>
            </div>

            {/* Booking + Payment UI (existing logic retained) */}
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 18 }}>
              <label style={{ fontSize: 14, color: 'rgba(234,240,255,.85)', display: 'block', marginBottom: 8 }}>
                Vehicle Plate OR Slot Number
              </label>

              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g., MH12AB1234 or 42"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#eaf0ff',
                  marginBottom: 10,
                  boxSizing: 'border-box',
                }}
              />

              <button
                onClick={fetchBooking}
                disabled={loading}
                style={{ padding: '10px 20px', borderRadius: 12, background: '#e94560', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                {loading ? 'Fetching...' : '🔍 Find Vehicle'}
              </button>

              {error && (
                <div style={{ marginTop: 10, background: 'rgba(255,75,75,.12)', border: '1px solid rgba(255,75,75,.35)', padding: 10, borderRadius: 12 }}>
                  {error}
                </div>
              )}
            </div>

            {booking && (
              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 18 }}>
                  <h3 style={{ marginTop: 0 }}>💳 Bill Breakdown</h3>
                  {billBreakdown && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                      <li>Base: {formatMoneyINR(billBreakdown.base)}</li>
                      <li>Duration: {billBreakdown.hours} hour(s)</li>
                      <li>Per Hour Charge: {formatMoneyINR(billBreakdown.perHour)}</li>
                      <li style={{ fontWeight: 800, fontSize: 18, marginTop: 8 }}>Total: {formatMoneyINR(billBreakdown.total)}</li>
                    </ul>
                  )}

                  <button
                    onClick={confirmPayment}
                    style={{ marginTop: 14, padding: '10px 20px', borderRadius: 12, background: '#22c55e', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ✅ Confirm Payment
                  </button>

                  <button
                    onClick={printReceipt}
                    style={{ marginTop: 8, marginLeft: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                  >
                    🖨️ Print Receipt
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, display: 'grid', justifyItems: 'center', gap: 12 }}>
                  <h3 style={{ marginTop: 0 }}>📱 UPI QR</h3>
                  {qrValue && <QRCode value={qrValue} size={160} />}

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{paymentAmount != null ? `Pay ${formatMoneyINR(paymentAmount)}` : ''}</div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>
                      ⏱ {String(Math.floor(payCountdown / 60)).padStart(2, '0')}:{String(payCountdown % 60).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

