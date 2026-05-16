const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./models/User');

  const email = 'admin@smartpark.com';
  const role = 'admin';

  const existing = await User.findOne({ email });
  if (existing) {
    await User.updateOne({ email }, { role });
    console.log('Updated existing user to admin');
  } else {
    const password = await bcrypt.hash('admin1234', 10);
    await User.create({ name: 'Admin', email, password, role });
    console.log('Admin created!');
  }

  console.log('Email: admin@smartpark.com');
  console.log('Password: admin1234');
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});

