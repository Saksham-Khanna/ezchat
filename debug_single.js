const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

async function check() {
  try {
    await mongoose.connect('mongodb://localhost:27017/quickchat');
    const msgId = '69a67783189f452de0a2aa0f'; // The failing one
    const msg = await mongoose.connection.db.collection('messages').findOne({ _id: new mongoose.Types.ObjectId(msgId) });
    
    if (!msg) {
        // Try as string if objectId fails
        const msg2 = await mongoose.connection.db.collection('messages').findOne({ _id: msgId });
        if (!msg2) { console.log('Message not found'); process.exit(); }
        msg = msg2;
    }

    console.log(`Ciphertext: ${msg.content}`);
    console.log(`Sender: ${msg.sender_id}`);
    console.log(`Recipient: ${msg.recipient_id}`);

    const id1 = msg.sender_id.toString();
    const id2 = msg.recipient_id.toString();
    const sorted = [id1, id2].sort().join("_");
    
    const possibleKeys = [
       "messenger_encryption_secret_key",
       "default_secret_key",
       sorted,
       id1 + "_" + id2,
       id2 + "_" + id1,
       id1,
       id2,
       "ezchat_premium_v2_salt",
       "quickchat_salt"
    ];
    
    const salts = ["ezchat_premium_v2_salt", "ezchat_v2_salt", "ezchat_v1_salt", "ezchat_premium_v1_salt", "ezchat_salt", "secret", "key", ""];
    for (const salt of salts) {
      possibleKeys.push(CryptoJS.SHA256(sorted + salt).toString());
      possibleKeys.push(CryptoJS.SHA256(id1 + "_" + id2 + salt).toString());
      possibleKeys.push(CryptoJS.SHA256(id2 + "_" + id1 + salt).toString());
      possibleKeys.push(sorted + "_" + salt); // Direct concat
      possibleKeys.push(id1 + "_" + id2 + "_" + salt);
    }
    
    for (const key of possibleKeys) {
      try {
        const bytes = CryptoJS.AES.decrypt(msg.content, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (decrypted) {
          console.log(`SUCCESS! Decrypted: "${decrypted}"`);
          console.log(`Key used: ${key}`);
          process.exit();
        }
      } catch(e) {}
    }
    console.log('STILL FAILED');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
