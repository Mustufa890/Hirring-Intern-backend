const express = require('express');
const { protect } = require('../middleware/authMiddileware');
const { applyInternship, MyApplication, CompanyApplication, updateApplication, ApplicationId } = require('../controllers/applicationController');
const router = express.Router();


router.post('/apply',protect,applyInternship);
router.get('/myApplication',protect,MyApplication);
router.get('/company',protect,CompanyApplication);
router.patch('/:id/status',protect,updateApplication);
router.get('/:id',protect,ApplicationId);



module.exports = router;