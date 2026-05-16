const express = require('express');

const router = express.Router();

const requireAuth = require('../middleware/auth');

const Booking = require('../models/Booking');
const Slot = require('../models/Slot');

// GET /api/bookings/my -> auth required
router.get('/my', requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).sort({ entryTime: -1 });
    return res.json({ bookings });
  } catch {
    return res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/by-plate/:plate
router.get('/by-plate/:plate', async (req, res) => {
  try {
    const plate = String(req.params.plate || '').trim().toUpperCase();
    if (!plate) return res.status(400).json({ message: 'plate required' });

    const booking = await Booking.findOne({ 
      vehiclePlate: req.params.plate.trim().toUpperCase(),
      exitTime: null 
    })
    if (!booking) return res.status(404).json({ message: 'Active booking not found' })
    return res.json({ booking })

  } catch {
    return res.status(500).json({ message: 'Failed to fetch booking' });
  }
});

// GET /api/bookings/by-slot/:slotNumber
router.get('/by-slot/:slotNumber', async (req, res) => {
  try {
    // Search: Booking.findOne({ slotNumber: Number(slotNumber), exitTime: null })
    const slotNumber = Number(req.params.slotNumber);
    if (!slotNumber) return res.status(400).json({ message: 'slotNumber required' });

    const booking = await Booking.findOne({ slotNumber: Number(slotNumber), exitTime: null }).populate(
      'slotId',
      'slotNumber status'
    );

    if (!booking) return res.status(404).json({ message: 'Active booking not found' });

    return res.json({
      booking: {
        _id: booking._id,
        slotNumber: booking.slotNumber,
        vehiclePlate: booking.vehiclePlate,
        entryTime: booking.entryTime,
        exitTime: booking.exitTime,
        paymentStatus: booking.paymentStatus,
        amount: booking.amount,
        slot: booking.slotId
          ? {
              _id: booking.slotId._id,
              slotNumber: booking.slotId.slotNumber,
              status: booking.slotId.status,
            }
          : null,
      },
    });
  } catch {
    return res.status(500).json({ message: 'Failed to fetch booking' });
  }
});

// GET /api/bookings/analytics -> admin only
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

    // hourlyData: 0-23
    const hourlyData = Array.from({ length: 24 }).map((_, hour) => ({ hour, count: 0 }));

    // dailyRevenue: last 7 days (Mon..Sun labels)
    // We also keep an internal window index so we don't rely on weekday string matching.
    const dailyRevenue = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      return { date: label, revenue: 0, _windowIdx: i };
    });

    // slotStatusCount from live slots
    const slotStatusCount = { available: 0, occupied: 0, reserved: 0 };
    const slots = await Slot.find();
    for (const s of slots) {
      const st = String(s.status || '').toLowerCase();
      if (st === 'available') slotStatusCount.available += 1;
      else if (st === 'occupied') slotStatusCount.occupied += 1;
      else if (st === 'reserved') slotStatusCount.reserved += 1;
    }

    // peakHours: 6..22 inclusive (17 bins)
    const peakHours = Array.from({ length: 17 }).map((_, idx) => ({ hour: 6 + idx, count: 0 }));

    const allBookings = await Booking.find({});

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const b of allBookings) {
      const entry = new Date(b.entryTime);
      if (Number.isNaN(entry.getTime())) continue;

      // hourly occupancy (by entry time)
      const h = entry.getHours();
      if (hourlyData[h]) hourlyData[h].count += 1;

      // daily revenue for paid bookings only (last 7 days window)
      const entryDayStart = new Date(entry);
      entryDayStart.setHours(0, 0, 0, 0);
      const deltaDays = Math.floor((todayStart - entryDayStart) / 86400000);

      // deltaDays: 0 => today, 6 => 6 days ago
      if (deltaDays >= 0 && deltaDays <= 6 && b.paymentStatus === 'paid') {
        const idx = 6 - deltaDays; // map to 0..6 where 0 is oldest
        const bucket = dailyRevenue[idx];
        if (bucket) bucket.revenue += Number(b.amount || 0);
      }

      // peak hours (6am-10pm inclusive)
      if (h >= 6 && h <= 22) {
        const pi = h - 6;
        if (peakHours[pi]) peakHours[pi].count += 1;
      }
    }

    // remove internal helper keys before returning
    const cleanedDailyRevenue = dailyRevenue.map(({ _windowIdx, ...rest }) => rest);

    return res.json({
      analytics: {
        hourlyData,
        dailyRevenue: cleanedDailyRevenue,
        slotStatusCount,
        peakHours,
      },
    });
  } catch {
    return res.status(500).json({ message: 'Failed to build analytics' });
  }
});

module.exports = router;

