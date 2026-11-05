const Assessment = require('../models/Assessment');
const Internship = require('../models/Internship');
const Application = require('../models/Application');
const Attempt = require('../models/Attempt');
const mongoose = require('mongoose');



exports.createAssessment = async (req, res) => {
  try {
    const {
      internshipId,
      title,
      description,
      questions,
      duration,
      passingScore
    } = req.body;

    const userId = req.user.id || req.user._id;

    if (req.user.role !== 'company') {
      return res.status(403).json({
        message: 'Only companies can create assessments'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(internshipId)) {
      return res.status(400).json({
        message: 'Invalid internship ID'
      });
    }

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      !Array.isArray(questions) ||
      questions.length === 0 ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      (
        passingScore !== undefined &&
        (
          !Number.isFinite(passingScore) ||
          passingScore < 0 ||
          passingScore > 100
        )
      )
    ) {
      return res.status(400).json({
        message: 'Invalid assessment data'
      });
    }

    const validQuestions = questions.every(question =>
      question &&
      typeof question.question === 'string' &&
      question.question.trim() &&
      Array.isArray(question.options) &&
      question.options.length >= 2 &&
      question.options.every(
        option => typeof option === 'string' && option.trim()
      ) &&
      Number.isInteger(question.correctAnswer) &&
      question.correctAnswer >= 0 &&
      question.correctAnswer < question.options.length &&
      typeof question.skill === 'string' &&
      question.skill.trim() &&
      Number.isFinite(question.marks ?? 1) &&
      (question.marks ?? 1) > 0
    );

    if (!validQuestions) {
      return res.status(400).json({
        message: 'One or more questions contain invalid data'
      });
    }

    const internship = await Internship.findById(internshipId);

    if (!internship) {
      return res.status(404).json({
        message: 'Internship not found'
      });
    }

    if (String(internship.company) !== String(userId)) {
      return res.status(403).json({
        message: 'You cannot create assessment for this internship'
      });
    }

    const existingAssessment = await Assessment.findOne({
      internship: internshipId
    });

    if (existingAssessment) {
      return res.status(409).json({
        message: 'Assessment already exists for this internship'
      });
    }

    const assessment = await Assessment.create({
      internship: internshipId,
      company: userId,
      title: title.trim(),
      description: description || '',
      questions: questions.map(question => ({
        ...question,
        marks: question.marks ?? 1
      })),
      duration,
      passingScore: passingScore ?? 70,
      isActive: true
    });

    return res.status(201).json({
      message: 'Assessment created successfully',
      assessment
    });

  } catch (error) {
    console.error('Create Assessment Error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Assessment already exists for this internship'
      });
    }

    return res.status(500).json({
      message: error.message
    });
  }
};


// ==========================================
// GET AVAILABLE ASSESSMENTS
// ==========================================

exports.getAvailableAssessments = async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        message: 'Only candidates can access assessments'
      });
    }

    const candidateId = req.user.id || req.user._id;

    console.log('Candidate ID:', candidateId);

    // Find reviewed or shortlisted applications
    const applications = await Application.find({
      applicant: candidateId,
      status: {
        $in: ['reviewed', 'shortlisted']
      }
    }).select('_id internship status');

    console.log('Applications Found:', applications.length);

    if (!applications.length) {
      return res.status(200).json({
        count: 0,
        assessments: []
      });
    }

    const internshipIds = applications
      .map(app => app.internship)
      .filter(Boolean);

    console.log('Internship IDs:', internshipIds);

    // Check all assessments for these internships
    const matchingAssessments = await Assessment.find({
      internship: {
        $in: internshipIds
      }
    }).select('_id title internship isActive company');

    console.log(
      'All Matching Assessments:',
      matchingAssessments
    );

    // Only active assessments
    const assessments = await Assessment.find({
      internship: {
        $in: internshipIds
      },
      isActive: true
    })
      .populate('internship', 'title status')
      .populate('company', 'name companyName email')
      .sort({ createdAt: -1 });

    console.log('Active Assessments Found:', assessments.length);

    return res.status(200).json({
      count: assessments.length,
      assessments
    });

  } catch (error) {
    console.error('Available Assessment Error:', error);

    return res.status(500).json({
      message: 'Failed to fetch assessments',
      error: error.message
    });
  }
};


// ==========================================
// START OR RESUME ASSESSMENT
// ==========================================


exports.startAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user._id;

    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        message: 'Only candidates can start assessments'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findOne({
      _id: id,
      isActive: true
    });

    if (!assessment) {
      return res.status(404).json({
        message: 'Assessment not found or inactive'
      });
    }

    const application = await Application.findOne({
      applicant: userId,
      internship: assessment.internship,
      status: {
        $in: ['reviewed', 'shortlisted']
      }
    });

    if (!application) {
      return res.status(403).json({
        message: 'You are not eligible for this assessment'
      });
    }

    // Check whether an attempt already exists
    let attempt = await Attempt.findOne({
      assessment: assessment._id,
      candidate: userId,
      application: application._id
    }).sort({ createdAt: -1 });

    // If an attempt already exists
    if (attempt) {

      // Already submitted or evaluated
      if (
        attempt.status === 'submitted' ||
        attempt.status === 'evaluated'
      ) {
        return res.status(409).json({
          message: 'You have already submitted this assessment'
        });
      }

      // Attempt already expired
      if (
        attempt.status === 'expired' ||
        new Date() >= new Date(attempt.expiresAt)
      ) {
        if (attempt.status !== 'expired') {
          attempt.status = 'expired';
          await attempt.save();
        }

        return res.status(400).json({
          message: 'Your assessment time has expired'
        });
      }

      // Resume existing in-progress attempt
      if (attempt.status === 'in-progress') {

        const questions = assessment.questions.map(question => ({
          _id: question._id,
          question: question.question,
          options: question.options,
          skill: question.skill,
          marks: question.marks ?? 1
        }));

        return res.status(200).json({
          message: 'Existing assessment attempt resumed',
          attemptId: attempt._id,
          expiresAt: attempt.expiresAt,
          title: assessment.title,
          description: assessment.description,
          duration: assessment.duration,
          passingScore: assessment.passingScore,
          questions
        });
      }

      return res.status(409).json({
        message: 'An existing attempt was found. Please contact support.'
      });
    }

    // No previous attempt: create a new one
    const startedAt = new Date();

    const expiresAt = new Date(
      startedAt.getTime() + assessment.duration * 60 * 1000
    );

    const totalMarks = assessment.questions.reduce(
      (total, question) => total + (question.marks ?? 1),
      0
    );

    attempt = await Attempt.create({
      assessment: assessment._id,
      application: application._id,
      candidate: userId,
      startedAt,
      expiresAt,
      answers: [],
      score: 0,
      totalMarks,
      percentage: 0,
      passed: false,
      skillBreakdown: [],
      status: 'in-progress'
    });

    // Never send correct answers to candidate
    const questions = assessment.questions.map(question => ({
      _id: question._id,
      question: question.question,
      options: question.options,
      skill: question.skill,
      marks: question.marks ?? 1
    }));

    return res.status(200).json({
      message: 'Assessment started successfully',
      attemptId: attempt._id,
      expiresAt: attempt.expiresAt,
      title: assessment.title,
      description: assessment.description,
      duration: assessment.duration,
      passingScore: assessment.passingScore,
      questions
    });

  } catch (error) {
    console.error('Start Assessment Error:', error);

    return res.status(500).json({
      message: 'Failed to start assessment',
      error: error.message
    });
  }
};



// ==========================================
// SUBMIT ASSESSMENT
// ==========================================

exports.submitAssessment = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id || req.user._id;

    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        message: 'Only candidates can submit assessments'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        message: 'Invalid attempt ID'
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        message: 'Answers must be an array'
      });
    }

    const attempt = await Attempt.findOne({
      _id: attemptId,
      candidate: userId,
      status: 'in-progress'
    });

    if (!attempt) {
      return res.status(404).json({
        message: 'Active attempt not found'
      });
    }

    const now = new Date();

    if (now >= attempt.expiresAt) {
      await Attempt.findOneAndUpdate(
        {
          _id: attempt._id,
          candidate: userId,
          status: 'in-progress'
        },
        {
          $set: { status: 'expired' }
        }
      );

      return res.status(400).json({
        message: 'Assessment time has expired'
      });
    }

    const assessment = await Assessment.findById(
      attempt.assessment
    );

    if (!assessment) {
      return res.status(404).json({
        message: 'Assessment not found'
      });
    }

    const answerMap = new Map();

    for (const answer of answers) {
      if (
        !answer ||
        !mongoose.Types.ObjectId.isValid(answer.questionId) ||
        !Number.isInteger(answer.selectedAnswer) ||
        answer.selectedAnswer < 0
      ) {
        return res.status(400).json({
          message: 'Invalid answer data'
        });
      }

      const questionId = String(answer.questionId);

      if (answerMap.has(questionId)) {
        return res.status(400).json({
          message: 'Duplicate question answers are not allowed'
        });
      }

      answerMap.set(
        questionId,
        answer.selectedAnswer
      );
    }

    const questionIds = assessment.questions.map(
      question => String(question._id)
    );

    for (const questionId of answerMap.keys()) {
      if (!questionIds.includes(questionId)) {
        return res.status(400).json({
          message: 'Invalid question ID'
        });
      }
    }

    let score = 0;
    let totalMarks = 0;

    const submittedAnswers = [];
    const skillStats = {};

    for (const question of assessment.questions) {
      const questionId = String(question._id);
      const selectedAnswer = answerMap.get(questionId);
      const marks = question.marks ?? 1;

      totalMarks += marks;

      if (!skillStats[question.skill]) {
        skillStats[question.skill] = {
          skill: question.skill,
          totalQuestions: 0,
          correctAnswers: 0,
          totalMarks: 0,
          obtainedMarks: 0
        };
      }

      const skill = skillStats[question.skill];

      skill.totalQuestions += 1;
      skill.totalMarks += marks;

      if (selectedAnswer !== undefined) {
        if (selectedAnswer >= question.options.length) {
          return res.status(400).json({
            message: 'Invalid selected option'
          });
        }

        submittedAnswers.push({
          questionId: question._id,
          selectedAnswer
        });

        if (selectedAnswer === question.correctAnswer) {
          score += marks;
          skill.correctAnswers += 1;
          skill.obtainedMarks += marks;
        }
      }
    }

    const percentage = totalMarks > 0
      ? Number(((score / totalMarks) * 100).toFixed(2))
      : 0;

    const passed = percentage >= assessment.passingScore;

    const skillBreakdown = Object.values(skillStats).map(skill => ({
      skill: skill.skill,
      totalQuestions: skill.totalQuestions,
      correctAnswers: skill.correctAnswers,
      percentage: skill.totalQuestions > 0
        ? Number(
            (
              (skill.correctAnswers / skill.totalQuestions) * 100
            ).toFixed(2)
          )
        : 0
    }));

    const submittedAt = new Date();

    const updatedAttempt = await Attempt.findOneAndUpdate(
      {
        _id: attempt._id,
        candidate: userId,
        status: 'in-progress',
        expiresAt: { $gt: submittedAt }
      },
      {
        $set: {
          answers: submittedAnswers,
          score,
          totalMarks,
          percentage,
          passed,
          skillBreakdown,
          status: 'evaluated',
          submittedAt
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedAttempt) {
      return res.status(409).json({
        message: 'Assessment has already been submitted or expired'
      });
    }

    return res.status(200).json({
      message: 'Assessment submitted successfully',
      result: {
        score: updatedAttempt.score,
        totalMarks: updatedAttempt.totalMarks,
        percentage: updatedAttempt.percentage,
        passed: updatedAttempt.passed,
        passingScore: assessment.passingScore,
        skillBreakdown: updatedAttempt.skillBreakdown,
        status: updatedAttempt.status,
        submittedAt: updatedAttempt.submittedAt
      }
    });

  } catch (error) {
    console.error('Submit Assessment Error:', error);

    return res.status(500).json({
      message: error.message
    });
  }
};


// ==========================================
// GET CANDIDATE / COMPANY ASSESSMENT RESULT
// ==========================================

exports.getAssessmentResult = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id || req.user._id;

    if (!['candidate', 'company'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'You are not allowed to view assessment results'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        message: 'Invalid attempt ID'
      });
    }

    const attempt = await Attempt.findById(attemptId)
      .populate('candidate', 'name email')
      .populate('application', 'status');

    if (!attempt) {
      return res.status(404).json({
        message: 'Assessment result not found'
      });
    }

    if (attempt.status !== 'evaluated') {
      return res.status(400).json({
        message: 'Assessment has not been evaluated yet'
      });
    }

    const assessment = await Assessment.findById(
      attempt.assessment
    ).select('title description passingScore company');

    if (!assessment) {
      return res.status(404).json({
        message: 'Assessment not found'
      });
    }

    if (req.user.role === 'candidate') {
      if (String(attempt.candidate?._id) !== String(userId)) {
        return res.status(403).json({
          message: 'You cannot access another candidate result'
        });
      }
    }

    if (req.user.role === 'company') {
      if (String(assessment.company) !== String(userId)) {
        return res.status(403).json({
          message: 'You cannot access this assessment result'
        });
      }
    }

    return res.status(200).json({
      message: 'Assessment result fetched successfully',
      result: {
        attemptId: attempt._id,
        assessment: {
          title: assessment.title,
          description: assessment.description,
          passingScore: assessment.passingScore
        },
        candidate: attempt.candidate,
        application: attempt.application,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        passed: attempt.passed,
        skillBreakdown: attempt.skillBreakdown,
        status: attempt.status,
        submittedAt: attempt.submittedAt
      }
    });

  } catch (error) {
    console.error('Get Assessment Result Error:', error);

    return res.status(500).json({
      message: error.message
    });
  }
};


// ==========================================
// COMPANY: GET INTERNSHIP ASSESSMENT RESULTS
// ==========================================

exports.getInternshipAssessmentResults = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const userId = req.user.id || req.user._id;

    if (req.user.role !== 'company') {
      return res.status(403).json({
        message: 'Only companies can view internship assessment results'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(internshipId)) {
      return res.status(400).json({
        message: 'Invalid internship ID'
      });
    }

    const internship = await Internship.findOne({
      _id: internshipId,
      company: userId
    }).select('title company');

    if (!internship) {
      return res.status(404).json({
        message: 'Internship not found or access denied'
      });
    }

    const assessment = await Assessment.findOne({
      internship: internshipId,
      company: userId
    }).select('title duration passingScore');

    if (!assessment) {
      return res.status(404).json({
        message: 'Assessment not found'
      });
    }

    const results = await Attempt.find({
      assessment: assessment._id,
      status: 'evaluated'
    })
      .populate('candidate', 'name email')
      .populate('application', 'status')
      .select(
        'candidate application score totalMarks percentage passed skillBreakdown submittedAt'
      )
      .sort({
        percentage: -1,
        submittedAt: 1
      });

    return res.status(200).json({
      message: 'Assessment results fetched successfully',
      internship,
      assessment,
      totalCandidates: results.length,
      results
    });

  } catch (error) {
    console.error('Internship Assessment Results Error:', error);

    return res.status(500).json({
      message: error.message
    });
  }
};
