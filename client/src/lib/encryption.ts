import CryptoJS from 'crypto-js';

// In a real Signal implementation, this would be a derived shared secret from a DH exchange.
// For this advanced demonstration, we derive a unique key per conversation using both users' identities.
export const getConversationKey = (user1Id: string, user2Id: string) => {
  // Sort IDs to ensure consistency regardless of who is sender/recipient
  const sortedIds = [user1Id, user2Id].sort();
  // Using a static salt for consistency across client instances. 
  // In a robust implementation, this salt would be part of the handshake.
  const salt = "ezchat_premium_v2_salt";
  return CryptoJS.SHA256(sortedIds.join("_") + salt).toString();
};

export const encryptMessage = (text: string, key: string) => {
  if (!text) return "";
  try {
    return CryptoJS.AES.encrypt(text, key).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    return text;
  }
};

export const decryptMessage = (ciphertext: string, key: string) => {
  if (!ciphertext) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails or results in empty string, return the original (might be a legacy or system message)
    return decrypted || ciphertext;
  } catch (error) {
    console.error("Decryption failed:", error);
    return ciphertext;
  }
};
