
const express = require('express');
const { protect } = require('../middleware/authMiddileware');

const router = express.Router();

const {
  createAssessment,
  getAvailableAssessments,
  startAssessment,
  submitAssessment,
  getAssessmentResult,
  getInternshipAssessmentResults
} = require('../controllers/assessmentController');

router.post('/create', protect, createAssessment);

router.get('/available', protect, getAvailableAssessments);


router.post('/start/:id', protect, startAssessment);


router.post('/submit/:attemptId', protect, submitAssessment);


router.get('/result/:attemptId', protect, getAssessmentResult);


router.get('/internship-result/:internshipId', protect, getInternshipAssessmentResults);

module.exports = router;
