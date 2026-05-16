// C:\Users\User\Desktop\PK\smart-parking\backend\models\Vehicle.js
const mongoose = require('mongoose');


const vehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: ['car', 'bike', 'truck', 'other'], default: 'car' },
    ownerName: { type: String, default: null, trim: true },
    phone: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);

