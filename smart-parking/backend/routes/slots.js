const express = require('express');

const router = express.Router();

const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const requireAuth = require('../middleware/auth');

async function updateSlotWithPlate(slot, { plate, userId, now }) {
  slot.status = 'occupied';
  slot.vehiclePlate = plate;
  slot.entryTime = now;
  slot.bookedBy = userId;
  return slot.save();
}

// GET /api/slots -> public list of all slots (100)
router.get('/', async (req, res) => {
  try {
    const slots = await Slot.find().sort({ slotNumber: 1 });
    return res.json({ slots });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch slots' });
  }
});

// POST /api/slots/book -> auth required
// body: { vehiclePlate, slotNumber (optional) }
// - If slotNumber given: book that slot
// - If not: auto assign first available slot
router.post('/book', requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const rawPlate = payload.vehiclePlate ?? payload.plate;
    const vehiclePlate = String(rawPlate || '').trim().toUpperCase();
    if (!vehiclePlate) return res.status(400).json({ message: 'vehiclePlate is required' });

    const slotNumber =
      payload.slotNumber != null && payload.slotNumber !== '' ? Number(payload.slotNumber) : null;

    let slot;
    if (slotNumber) {
      slot = await Slot.findOne({ slotNumber });
      if (!slot) return res.status(404).json({ message: 'Slot not found' });
      if (String(slot.status).toLowerCase() !== 'available') {
        return res.status(409).json({ message: 'Slot is not available' });
      }
    } else {
      slot = await Slot.findOne({ status: 'available' }).sort({ slotNumber: 1 });
      if (!slot) return res.status(409).json({ message: 'No slots available' });
    }

    const now = new Date();

    // Update slot status
    slot.status = 'occupied';
    slot.vehiclePlate = vehiclePlate;
    slot.entryTime = now;
    slot.bookedBy = req.user.id;
    await slot.save();

    // ALSO create Booking record
    const booking = new Booking({
      userId: req.user.id,
      slotId: slot._id,
      slotNumber: slot.slotNumber,
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
      entryTime: new Date(),
      exitTime: null,
      paymentStatus: 'pending'
    })
    await booking.save();


    return res.json({ slot, booking });
  } catch (e) {
    return res.status(500).json({ message: 'Booking failed' });
  }
});

// POST /api/slots/release -> auth required, body:{slotNumber}
router.post('/release', requireAuth, async (req, res) => {
  try {
    const slotNumber = Number(req.body?.slotNumber);
    if (!slotNumber) return res.status(400).json({ message: 'slotNumber is required' });

    const slot = await Slot.findOne({ slotNumber });
    if (!slot) return res.status(404).json({ message: 'Slot not found' });

    // Mark any active booking as exited
    const active = await Booking.findOne({ slotNumber, exitTime: null });
    if (active) {
      active.exitTime = new Date();
      await active.save();
    }

    slot.status = 'available';
    slot.vehiclePlate = null;
    slot.entryTime = null;
    slot.bookedBy = null;
    await slot.save();

    return res.json({ message: 'Slot released' });
  } catch (e) {
    return res.status(500).json({ message: 'Release failed' });
  }
});

// PATCH /api/slots/override -> admin only
// body: {slotNumber, status}
router.patch('/override', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

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
    return res.json({ slot });
  } catch (e) {
    return res.status(500).json({ message: 'Override failed' });
  }
});

// GET /api/slots/last-assigned
// Find most recently booked (active) slot
// Return { slotNumber, vehiclePlate, floor, entryTime }
router.get('/last-assigned', async (req, res) => {
  try {
    const booking = await Booking.findOne({ exitTime: null })
      .sort({ entryTime: -1 })
      .populate('slotId', 'slotNumber floor')
      .exec();

    if (!booking) return res.json({ lastAssigned: null });

    const slotNumber = booking.slotNumber ?? booking.slotId?.slotNumber;
    const vehiclePlate = booking.vehiclePlate;
    const floor = booking.slotId?.floor || (Number(slotNumber) <= 50 ? 'Ground' : 'First');

    return res.json({
      lastAssigned: {
        slotNumber,
        vehiclePlate,
        floor,
        entryTime: booking.entryTime,
      },
    });
  } catch {
    return res.status(500).json({ message: 'Failed to fetch last assigned slot' });
  }
});

module.exports = router;

