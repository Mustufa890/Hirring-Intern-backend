
const Message = require('../models/Message');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');

exports.getMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid Conversation ID'
      });
    }

    const userId = String(req.user.id || req.user._id);

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found or access denied'
      });
    }

    const messages = await Message.find({
      conversation: id
    })
      .populate('sender', 'name companyName email role')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      message: 'Messages fetched successfully',
      messages
    });

  } catch (err) {
    console.error('Get Messages Error:', err);

    return res.status(500).json({
      error: err.message
    });
  }
};
