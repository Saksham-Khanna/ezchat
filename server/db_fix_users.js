const mongoose = require('mongoose');
require('dotenv').config();

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateCvId() {
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `CV-${result}`;
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB for fix');
    const User = require('./models/User');
    const users = await User.find({ $or: [{ cv_id: { $exists: false } }, { cv_id: null }, { cv_id: "" }, { username: "" }, { username: null }] });
    
    console.log(`Found ${users.length} users with missing/empty data`);
    
    for (const user of users) {
      if (!user.cv_id) {
        user.cv_id = generateCvId();
      }
      if (!user.username) {
        user.username = `User_${user._id.toString().substring(0, 5)}`;
      }
      await user.save();
      console.log(`Fixed user: ${user._id} -> ${user.username} (${user.cv_id})`);
    }
    
    console.log('Database fix complete');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
