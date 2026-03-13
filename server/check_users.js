require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({});
  console.log('Total users:', users.length);
  users.forEach(u => console.log(u.username, u._id.toString(), u.is_online));
  process.exit();
}
run();
