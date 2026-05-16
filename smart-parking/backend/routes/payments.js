const express = require('express');

const router = express.Router();

const requireAuth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');

function buildUpiString({ upiId, name, amount, ref }) {
  // Example: upi://pay?pa=merchant@upi&pn=Merchant&am=10&cu=INR&tr=ref
  const p = new URLSearchParams();
  p.set('pa', String(upiId));
  if (name) p.set('pn', String(name));
  if (amount != null) p.set('am', String(amount));
  p.set('cu', 'INR');
  if (ref) p.set('tr', String(ref));

  return `upi://pay?${p.toString()}`;
}

// POST /api/payments/generate-qr
// body: { bookingId } OR { slotNumber }
// returns: { upiString }
router.post('/generate-qr', requireAuth, async (req, res) => {
  try {
    const { bookingId, slotNumber } = req.body || {};

    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId);
    } else if (slotNumber != null) {
      const sn = Number(slotNumber);
      booking = await Booking.findOne({ slotNumber: sn, exitTime: null, userId: req.user.id });
    } else {
      return res.status(400).json({ message: 'bookingId or slotNumber required' });
    }

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Amount should come from booking.amount (assumed set by pricing logic elsewhere)
    const amount = Number(booking.amount || 0);

    // Demo merchant info (replace with real merchant details later if needed)
    const upiId = process.env.UPI_MERCHANT_ID || 'merchant@upi';
    const name = process.env.UPI_MERCHANT_NAME || 'SmartParking';

    const upiString = buildUpiString({ upiId, name, amount, ref: booking._id.toString() });

    return res.json({ upiString, bookingId: booking._id });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to generate QR' });
  }
});

// POST /api/payments/confirm
// body: { slotNumber, bookingId, amount? }
// - Find booking by bookingId OR by active slotNumber
// - Set exitTime = Date.now()
// - Calculate duration and amount
// - Set paymentStatus = "paid"
// - Release slot: status=available, vehiclePlate=null
// - Return receipt: { slotNumber, vehiclePlate, entryTime, exitTime, duration, amount }
router.post('/confirm', requireAuth, async (req, res) => {
  try {
    const { bookingId, slotNumber } = req.body || {};

    if (!bookingId && slotNumber == null) {
      return res.status(400).json({ message: 'bookingId or slotNumber required' });
    }

    const where = bookingId
      ? { _id: bookingId, userId: req.user.id }
      : { slotNumber: Number(slotNumber), userId: req.user.id };

    const booking = await Booking.findOne(where);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.exitTime) return res.status(409).json({ message: 'Booking already exited' });

    const exitMs = Date.now();
    const exitTime = new Date(exitMs);

    const entryMs = booking.entryTime ? new Date(booking.entryTime).getTime() : exitMs;
    const diffHours = Math.max(0, (exitMs - entryMs) / 36e5);
    const duration = Math.max(1, Math.ceil(diffHours));

    const base = 20;
    const perHour = 10;
    const amount = base + perHour * duration;

    booking.exitTime = exitTime;
    booking.duration = duration;
    booking.amount = amount;
    booking.paymentStatus = 'paid';
    booking.status = 'inactive';
    await booking.save();

    // Release slot
    const slot = await Slot.findOne({ slotNumber: booking.slotNumber });
    if (slot) {
      slot.status = 'available';
      slot.vehiclePlate = null;
      slot.entryTime = null;
      slot.bookedBy = null;
      await slot.save();
    }

    return res.json({
      receipt: {
        slotNumber: booking.slotNumber,
        vehiclePlate: booking.vehiclePlate,
        entryTime: booking.entryTime,
        exitTime: booking.exitTime,
        duration,
        amount,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: 'Payment confirm failed' });
  }
});


module.exports = router;

