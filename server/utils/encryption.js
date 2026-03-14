const CryptoJS = require('crypto-js');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key';

const encrypt = (text) => {
  // Passthrough for new messages as per user request
  return text;
};

const decrypt = (ciphertext) => {
  if (!ciphertext) return "";
  if (!ciphertext.startsWith('U2FsdGVkX1')) return ciphertext;

  const decryptWith = (key) => {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || null;
    } catch (e) {
      return null;
    }
  };

  // Try configured key
  let result = decryptWith(ENCRYPTION_KEY);
  if (result) return result;

  // Try legacy default key fallback
  result = decryptWith('default_secret_key');
  if (result) return result;

  return ciphertext;
};

module.exports = { encrypt, decrypt };
