// fraudRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { ruleBasedScoring } = require('../services/fraudService');

router.use(protect);
router.post('/analyze', async (req, res, next) => {
  try {
    const result = await ruleBasedScoring(req.body, req.user, {});
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
