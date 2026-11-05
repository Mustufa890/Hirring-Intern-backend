const { default: mongoose } = require("mongoose");

const assessmentSchema = new mongoose.Schema({

    internship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Internship',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
   options: {
  type: [String],
  required: true,
  validate: {
    validator: value => value.length >= 2,
    message: 'At least two options are required'
  }
},
correctAnswer: {
  type: Number,
  required: true,
  min: 0
},
    skill: {
      type: String,
      required: true
    },
    marks: {
      type: Number,
      default: 1
    }
  }],
  duration: {
    type: Number,
    required: true
  },
  passingScore: {
  type: Number,
  default: 70,
  min: 0,
  max: 100
},
  isActive: {
    type: Boolean,
    default: true
  }

},{timestamps:true})

module.exports = mongoose.model("Assessment",assessmentSchema)