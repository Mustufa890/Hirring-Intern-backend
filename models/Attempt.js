
const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },

  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },

  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedAnswer: {
      type: Number,
      required: true
    }
  }],

  score: {
    type: Number,
    default: 0
  },

  totalMarks: {
    type: Number,
    default: 0
  },

  percentage: {
    type: Number,
    default: 0
  },

  passed: {
    type: Boolean,
    default: false
  },

  skillBreakdown: [{
    skill: {
      type: String,
      required: true
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    }
  }],

  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'evaluated', 'expired'],
    default: 'in-progress'
  },

  startedAt: {
    type: Date,
    default: Date.now
  },

  expiresAt: {
    type: Date,
    required: true
  },

  submittedAt: {
    type: Date
  }

}, { timestamps: true });

module.exports = mongoose.model('Attempt', attemptSchema);
