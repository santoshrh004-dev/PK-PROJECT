// C:\Users\User\Desktop\PK\smart-parking\backend\models\Slot.js
const mongoose = require('mongoose');


const slotSchema = new mongoose.Schema(
  {
    slotNumber: { type: Number, required: true, unique: true, min: 1 },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved'],
      default: 'available',
    },
    vehiclePlate: { type: String, default: null, trim: true },
    entryTime: { type: Date, default: null },
    floor: { type: String, enum: ['Ground', 'First'], required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Slot', slotSchema);

