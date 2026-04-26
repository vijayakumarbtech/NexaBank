const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { Notification } = require('../models');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { userId: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
