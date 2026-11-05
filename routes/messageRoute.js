const express = require('express');
const { protect } = require('../middleware/authMiddileware');
const { getMessage} = require('../controllers/messageController');
const router = express.Router();

router.get('/:id',protect,getMessage);


module.exports = router;