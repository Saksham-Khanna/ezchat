import CryptoJS from 'crypto-js';

export const getConversationKey = (user1Id: string, user2Id: string) => {
  const sortedIds = [user1Id, user2Id].sort();
  const salt = "ezchat_premium_v2_salt";
  return CryptoJS.SHA256(sortedIds.join("_") + salt).toString();
};

export const encryptMessage = (text: string, key: string) => {
  // Passthrough for new messages as per user request to stop frontend encryption
  return text;
};

export const decryptMessage = (ciphertext: string, key: string, fallbackKeys: string[] = []) => {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  if (!ciphertext.startsWith('U2FsdGVkX1')) return ciphertext; // Not encrypted with CryptoJS AES

  const tryDecrypt = (k: string) => {
    try {
      if (!k) return null;
      const bytes = CryptoJS.AES.decrypt(ciphertext, k);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || null;
    } catch {
      return null;
    }
  };

  // 1. Try primary key provided
  let result = tryDecrypt(key);
  if (result) return result;

  // 2. Try provided fallbacks
  for (const fKey of fallbackKeys) {
    if (!fKey) continue;
    result = tryDecrypt(fKey);
    if (result) return result;
  }

  // 3. Try "Universal" fallbacks (common configurations used previously)
  const commonKeys = [
     "messenger_encryption_secret_key", // Server's default ENCRYPTION_KEY if leaked/copied
     "default_secret_key",
     "ezchat_salt",
     "quickchat_salt"
  ];
  
  for (const cKey of commonKeys) {
    result = tryDecrypt(cKey);
    if (result) return result;
  }

  return ciphertext;
};
