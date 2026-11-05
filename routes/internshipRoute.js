const express = require('express');
const { protect } = require('../middleware/authMiddileware');
const { createInternship, singleInternship, MyInternship, Allinternship } = require('../controllers/internshipController');
const router = express.Router();

router.post('/create',protect,createInternship);
router.get('/allIntern',protect,Allinternship);
router.get('/singleIntern',protect,singleInternship);
router.get('/myIntern',protect,MyInternship);


module.exports = router;