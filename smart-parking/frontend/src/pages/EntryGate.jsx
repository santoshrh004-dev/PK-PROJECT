// C:\Users\User\Desktop\PK\smart-parking\frontend\src\pages\EntryGate.jsx
import React, { useMemo, useRef, useState, useContext } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';
import { AuthContext } from '../context/AuthContext';




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


export default function EntryGate() {
  const api = import.meta.env.VITE_API_URL;
  const { token } = useContext(AuthContext);

  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);

  const [assignedSlot, setAssignedSlot] = useState(null);
  const [entryTime, setEntryTime] = useState(null);
  const [floor, setFloor] = useState('');
  const [error, setError] = useState('');
  const [successPulse, setSuccessPulse] = useState(false);

  const qrValue = useMemo(() => {
    if (!assignedSlot || !entryTime) return '';
    return `SMARTPARKING:ENTRY:${assignedSlot}:${cleanPlate(plate)}:${new Date(entryTime).toISOString()}`;
  }, [assignedSlot, entryTime, plate]);

  function cleanPlate(p) {
    return String(p || '').trim().toUpperCase();
  }

  const generatePlate = () => {
    setError('');
    setAssignedSlot(null);
    setEntryTime(null);
    setFloor('');
    setPlate(randomPlate());
  };

  const resetForNewEntry = () => {
    setError('');
    setAssignedSlot(null);
    setEntryTime(null);
    setFloor('');
    setPlate('');
  };

  const bookSlot = async () => {
    setError('');
    setLoading(true);
    setAssignedSlot(null);
    setEntryTime(null);
    setFloor('');

    try {
      const clean = String(plate || '').trim().toUpperCase();
      if (!clean) throw new Error('Enter vehicle plate number');
      if (!token) throw new Error('Please login to record entry');

      const res = await axios.post(
        `${api}/api/slots/book`,
        { vehiclePlate: clean },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data || {};
      const slotNum = data.slotNumber ?? data.slot?.slotNumber ?? data.slotId?.slotNumber;
      const time = data.entryTime ?? data.booking?.entryTime;
      if (!slotNum) throw new Error('No slot assigned');

      setAssignedSlot(Number(slotNum));
      setEntryTime(time || new Date().toISOString());

      const f = data.floor;
      if (f) setFloor(f);
      else setFloor(Number(slotNum) <= 50 ? 'Ground' : 'First');

      setSuccessPulse(true);
      setTimeout(() => setSuccessPulse(false), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const timeLabel = entryTime ? new Date(entryTime).toLocaleString() : '';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');

  const startCamera = async () => {

    setOcrError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch (e) {
      setOcrError('Camera permission denied / camera not available');
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    try {
      const v = videoRef.current;
      const s = v?.srcObject;
      if (s && typeof s.getTracks === 'function') {
        s.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {
      // ignore
    }
    setCameraOn(false);
  };

  const normalizePlateFromOcr = (raw) => {
    const up = String(raw || '').toUpperCase();
    // Common plate normalization: keep A-Z and digits
    const cleaned = up.replace(/[^A-Z0-9]/g, '');
    if (!cleaned) return '';

    // Try to get something like XX00AA0000 (len ~ 10-13)
    // Return best guess by taking longest substring
    const candidates = [cleaned];
    let best = '';
    for (const c of candidates) {
      if (c.length > best.length) best = c;
    }

    // If too short, just return cleaned
    if (best.length < 6) return best;

    // Attempt to format similar to MH12AB1234: state(2) + district(2) + letters(2) + number(4)
    // If length == 11/12/13, just return last 10 where possible.
    if (best.length > 10) {
      best = best.slice(best.length - 10);
    }

    return best;
  };

  const detectPlate = async (imageDataUrl) => {
    setOcrStatus('');
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
    setOcrBusy(true);
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

      ctx.drawImage(video, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setOcrPreview(dataUrl);

      await detectPlate(dataUrl);
    } catch {
      setOcrError('OCR failed. Please enter plate manually.');
    } finally {
      setOcrBusy(false);
    }
  };




  return (
    <div style={{ minHeight: '100vh', padding: 24, fontFamily: 'system-ui', background: 'linear-gradient(135deg,#0b1220,#111b2e)', color: '#eaf0ff' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Entry Gate</h2>

        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, backdropFilter: 'blur(10px)' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, opacity: 0.95 }}>📷 Capture Plate (Auto OCR)</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
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
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#eaf0ff', padding: '10px 12px', borderRadius: 14 }}
                  >
                    {cameraOn ? 'Stop Camera' : 'Start Camera'}
                  </button>
                  <button
                    type="button"
                    onClick={runOcrOnFrame}
                    disabled={!cameraOn || ocrBusy || loading}
                    style={{ background: '#4f7cff', border: 'none', color: '#fff', padding: '10px 12px', borderRadius: 14, fontWeight: 800 }}
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

              <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: 10, background: 'rgba(0,0,0,0.15)', minHeight: 250 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>🖼️ Captured Image</div>
                {ocrPreview ? (
                  <img src={ocrPreview} alt="OCR Preview" style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)' }} />
                ) : (
                  <div style={{ opacity: 0.8 }}>No capture yet.</div>
                )}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 14, color: 'rgba(234,240,255,.85)' }}>Vehicle Plate Number (OCR or Manual)</label>
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
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
                }}
              />

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={generatePlate}
                  disabled={loading || ocrBusy}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#eaf0ff', padding: '10px 16px', borderRadius: 14 }}
                >
                  Auto Generate (Testing)
                </button>

                <button
                  type="button"
                  onClick={bookSlot}
                  disabled={loading || ocrBusy}
                  style={{ background: '#4f7cff', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 14, fontWeight: 800, boxShadow: '0 12px 32px rgba(79,124,255,.25)' }}
                >
                  {loading ? 'Recording...' : 'Record Entry'}
                </button>
              </div>

              {error ? (
                <div style={{ marginTop: 12, background: 'rgba(255,75,75,.12)', border: '1px solid rgba(255,75,75,.35)', padding: 10, borderRadius: 12 }}>
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>


        {assignedSlot ? (
          <div
            style={{
              marginTop: 18,
              padding: 18,
              borderRadius: 20,
              background: 'rgba(46, 204, 113, 0.14)',
              border: '1px solid rgba(46, 204, 113, 0.45)',
              boxShadow: successPulse ? '0 0 0 10px rgba(46,204,113,0.15)' : 'none',
              transition: 'box-shadow .2s ease',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Entry Recorded ✅</h3>
            <p style={{ margin: '6px 0 0', opacity: 0.95 }}>
              Slot Number: <b>{assignedSlot}</b>
            </p>
            <p style={{ margin: '6px 0 0', opacity: 0.95 }}>
              Vehicle Plate: <b>{cleanPlate(plate)}</b>
            </p>
            <p style={{ margin: '6px 0 0', opacity: 0.85 }}>
              Entry Time: <b>{timeLabel}</b>
            </p>
            <p style={{ margin: '6px 0 0', opacity: 0.85 }}>
              Floor: <b>{floor}</b>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', justifyItems: 'center', marginTop: 14 }}>
              {qrValue ? <QRCode value={qrValue} size={220} /> : null}
            </div>

            <button
              type="button"
              onClick={resetForNewEntry}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#eaf0ff',
                cursor: 'pointer',
                fontWeight: 900,
              }}
            >
              New Entry
            </button>
          </div>

        ) : null}
      </div>
    </div>
  );
}

