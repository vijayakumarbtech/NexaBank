// blockchainRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getChain, validateChain } = require('../services/blockchainService');

router.use(protect);

router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const chain = await getChain(parseInt(limit), (page - 1) * limit);
    res.json({ success: true, chain });
  } catch (error) {
    next(error);
  }
});

router.get('/validate', authorize('admin'), async (req, res, next) => {
  try {
    const result = await validateChain();
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
