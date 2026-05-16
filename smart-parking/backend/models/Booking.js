const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },

    slotNumber: { type: Number, required: true },
    vehiclePlate: { type: String, required: true },

    entryTime: { type: Date, default: Date.now },
    exitTime: { type: Date, default: null },

    amount: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);

