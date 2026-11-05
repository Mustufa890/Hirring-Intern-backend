const express = require('express');
const { protect } = require('../middleware/authMiddileware');
const { createConversation, getMyConversation } = require('../controllers/conversationController');
const router = express.Router();


router.post('/create-Conversation',protect,createConversation);
router.get('/getConversation',protect,getMyConversation)

module.exports = router;