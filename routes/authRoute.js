const express = require('express');
const { signup, login, changePassword, forgotPassword, resetPassword, refreshToken, logout, getProfile, roleCheck } = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddileware');
const router = express.Router();


router.post('/signup',signup)
router.post('/login',login)
router.get('/profile', protect, getProfile)
router.get('/admin', protect, isAdmin, roleCheck)
router.put('/change-password',changePassword)
router.post('/forgot-password',forgotPassword)
router.post('/reset-password/:token',resetPassword)
router.post('/logout',logout)
router.post('/refresh-token/:token',protect,refreshToken)
module.exports = router;