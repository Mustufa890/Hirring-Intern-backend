
const Conversation = require('../models/Conversation');
const Internship = require('../models/Internship');
const Application = require('../models/Application');
const mongoose = require('mongoose');

// Create Conversation
exports.createConversation = async (req, res) => {
  try {
    const { internshipId, candidateId } = req.body;

    const userId = String(req.user.id || req.user._id);
    const userRole = req.user.role;

    // Validate role
    if (!['candidate', 'company'].includes(userRole)) {
      return res.status(403).json({
        message: 'Only candidates and companies can create conversations'
      });
    }

    // Validate internship ID
    if (!mongoose.Types.ObjectId.isValid(internshipId)) {
      return res.status(400).json({
        message: 'Invalid Internship ID'
      });
    }

    // Find internship
    const internship = await Internship.findById(internshipId);

    if (!internship) {
      return res.status(404).json({
        message: 'Internship not found'
      });
    }

    const companyId = String(internship.company);
    let selectedCandidateId;

    // Candidate creates conversation
    if (userRole === 'candidate') {
      selectedCandidateId = userId;

      if (candidateId && String(candidateId) !== userId) {
        return res.status(403).json({
          message: 'You cannot create another candidate conversation'
        });
      }
    }

    // Company creates conversation
    if (userRole === 'company') {
      if (companyId !== userId) {
        return res.status(403).json({
          message: 'You can only chat for your own internship'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return res.status(400).json({
          message: 'Valid Candidate ID is required'
        });
      }

      selectedCandidateId = String(candidateId);
    }

    // Check shortlisted application
    const application = await Application.findOne({
      internship: internshipId,
      applicant: selectedCandidateId,
      status: 'shortlisted'
    });

    if (!application) {
      return res.status(403).json({
        message: 'Only shortlisted candidates can start a conversation'
      });
    }

    // Check existing conversation
    let conversation = await Conversation.findOne({
      internship: internshipId,
      participants: {
        $all: [selectedCandidateId, companyId]
      }
    })
      .populate('participants', 'name companyName email role')
      .populate('internship', 'title status company');

    if (conversation) {
      return res.status(200).json({
        message: 'Conversation already exists',
        conversation
      });
    }

    // Create new conversation
    conversation = await Conversation.create({
      participants: [selectedCandidateId, companyId],
      internship: internshipId
    });

    // Populate conversation
    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name companyName email role')
      .populate('internship', 'title status company');

    return res.status(201).json({
      message: 'Conversation created successfully',
      conversation
    });

  } catch (err) {
    console.error('Create Conversation Error:', err);

    return res.status(500).json({
      message: err.message
    });
  }
};


// Get My Conversations
exports.getMyConversation = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name companyName email role')
      .populate('internship', 'title status company')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      count: conversations.length,
      conversations
    });

  } catch (error) {
    console.error('Get Conversation Error:', error);

    return res.status(500).json({
      message: error.message
    });
  }
};
