const express = require('express');
const router = express.Router();
const translate = require('google-translate-api-x');

// Translate Message (Hindi <-> English)
// Uses free Google Translate API — no API key needed, no quota limits
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    // targetLang: 'hi' for Hindi, 'en' for English

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'No text provided' });
    }

    const target = targetLang || 'hi'; // default to Hindi

    const result = await translate(text, { to: target });

    res.json({ 
      translatedText: result.text,
      detectedLang: result.from.language.iso,
      targetLang: target
    });
  } catch (error) {
    console.error('Translation Error:', error.message || error);
    res.status(500).json({ message: 'Error translating message' });
  }
});

module.exports = router;
