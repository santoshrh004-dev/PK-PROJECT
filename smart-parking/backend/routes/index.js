// C:\Users\User\Desktop\PK\smart-parking\backend\routes\index.js
const authRoutes = require('./auth');

const slotRoutes = require('./slots');
const bookingRoutes = require('./bookings');
const adminRoutes = require('./admin');
const paymentRoutes = require('./payments');

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/slots', slotRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);
};

