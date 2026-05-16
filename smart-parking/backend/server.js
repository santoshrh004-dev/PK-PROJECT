// C:\Users\User\Desktop\PK\smart-parking\backend\server.js
const express = require('express');

const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://smartpark.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);



const corsOpts = {
  origin: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  },
  credentials: true,
};

app.use(cors(corsOpts));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'smart-parking-backend' });
});

const PORT = process.env.PORT || 5000;

const connectDb = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI missing in environment');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB connected');
};

const seedSlotsIfEmpty = async () => {
  const Slot = require('./models/Slot');
  const count = await Slot.countDocuments({});
  if (count > 0) return;

  const slots = [];
  for (let i = 1; i <= 100; i++) {
    slots.push({
      slotNumber: i,
      status: 'available',
      floor: i <= 50 ? 'Ground' : 'First',
    });
  }

  await Slot.insertMany(slots);
  console.log('Seeded 100 slots');
};

const mountRoutes = require('./routes/index');

const start = async () => {
  await connectDb();
  await seedSlotsIfEmpty();
  mountRoutes(app);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  });

  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
};

start().catch((e) => {
  console.error('Startup failed:', e);
  process.exit(1);
});

