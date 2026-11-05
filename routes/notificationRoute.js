const express = require('express');
const { protect } = require('../middleware/authMiddileware');
const { createNotification, getNotification, Readmessage, deleteNotifications } = require('../controllers/notificationController');
const router = express.Router();

router.post('/create',protect,createNotification);
router.get('/get-notification',protect,getNotification);
router.patch('/:id/read',protect,Readmessage);
router.delete('/:id',protect,deleteNotifications)


module.exports = router;