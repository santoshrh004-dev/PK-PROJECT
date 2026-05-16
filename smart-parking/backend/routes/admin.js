const express = require('express');

const router = express.Router();

const requireAuth = require('../middleware/auth');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  return next();
}

// GET /api/admin/slots -> all slots with full details
router.get('/slots', requireAuth, adminOnly, async (req, res) => {
  try {
    const slots = await Slot.find()
      .sort({ slotNumber: 1 })
      .lean();

    // Return in the format expected by frontend: { slots: [...] }
    return res.json({ slots });
  } catch {
    return res.status(500).json({ message: 'Failed to fetch slots' });
  }
});

// GET /api/admin/bookings -> all bookings + total revenue
router.get('/bookings', requireAuth, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .sort({ entryTime: -1 })
      .populate('slotId', 'slotNumber status')
      .lean();

    const totalRevenue = bookings
      .filter((b) => b.paymentStatus === 'paid' || b.paymentStatus === 'success' || b.payment?.status === 'paid')
      .reduce((sum, b) => sum + Number(b.amount || b.totalAmount || b.total || 0), 0);

    return res.json({ bookings, totalRevenue });
  } catch {
    return res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// PATCH /api/admin/slots/override -> force change slot status
// body:{slotNumber, status}
router.patch('/slots/override', requireAuth, adminOnly, async (req, res) => {
  try {
    const slotNumber = Number(req.body?.slotNumber);
    const status = String(req.body?.status || '');
    if (!slotNumber || !['available', 'occupied', 'reserved'].includes(status)) {
      return res.status(400).json({ message: 'Valid slotNumber and status required' });
    }

    const slot = await Slot.findOne({ slotNumber });
    if (!slot) return res.status(404).json({ message: 'Slot not found' });

    slot.status = status;
    if (status === 'available') {
      slot.vehiclePlate = null;
      slot.entryTime = null;
      slot.bookedBy = null;
    }

    await slot.save();
    return res.json({ ok: true, slot });
  } catch {
    return res.status(500).json({ message: 'Override failed' });
  }
});

// POST /api/admin/slots/release-all -> set all slots to available
router.post('/slots/release-all', requireAuth, adminOnly, async (req, res) => {
  try {
    await Slot.updateMany(
      {},
      { $set: { status: 'available', vehiclePlate: null, entryTime: null, bookedBy: null } }
    );

    // Keep historical bookings intact; just free current slot states.
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: 'Release all failed' });
  }
});





module.exports = router;

