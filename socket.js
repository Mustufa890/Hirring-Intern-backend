const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const Application = require('./models/Application');
const Internship = require('./models/Internship');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      if (!decoded.id && !decoded._id) {
        return next(new Error('Invalid user information'));
      }

      socket.user = decoded;
      next();

    } catch (error) {
      console.error('Socket Authentication Error:', error.message);
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(
      socket.user.id || socket.user._id
    );

    const userRole = socket.user.role;

    console.log('Socket Connected:', userId, userRole);

    socket.join(`user-${userId}`);

    const verifyConversationAccess = async (conversationId) => {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        throw new Error('Invalid Conversation ID');
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      if (conversation.participants.length !== 2) {
        throw new Error('Invalid conversation participants');
      }

      const internship = await Internship.findById(
        conversation.internship
      );

      if (!internship) {
        throw new Error('Internship not found');
      }

      const companyId = String(internship.company);

      const hasCompany = conversation.participants.some(
        participant => String(participant) === companyId
      );

      if (!hasCompany) {
        throw new Error('Company is not a conversation participant');
      }

      const candidate = conversation.participants.find(
        participant => String(participant) !== companyId
      );

      if (!candidate) {
        throw new Error('Invalid candidate');
      }

      const candidateId = String(candidate);

      if (userRole === 'company') {
        if (companyId !== userId) {
          throw new Error('You do not own this internship');
        }
      } else if (userRole === 'candidate') {
        if (candidateId !== userId) {
          throw new Error('Invalid candidate access');
        }
      } else {
        throw new Error('Unauthorized role');
      }

      const application = await Application.findOne({
        internship: conversation.internship,
        applicant: candidateId,
        status: 'shortlisted'
      });

      if (!application) {
        throw new Error('Only shortlisted candidates can chat');
      }

      return {
        conversation,
        internship,
        candidateId,
        companyId
      };
    };

    socket.on('joinConversation', async (conversationId, callback) => {
      try {
        console.log('Join Conversation Request:', conversationId);

        await verifyConversationAccess(conversationId);

        const room = `conversation-${conversationId}`;

        await socket.join(room);

        console.log('Conversation Joined:', room);

        socket.emit('joinedConversation', {
          conversationId,
          message: 'Conversation joined successfully'
        });

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Conversation joined successfully'
          });
        }

      } catch (error) {
        console.error('Join Conversation Error:', error.message);

        if (typeof callback === 'function') {
          callback({
            success: false,
            message: error.message
          });
        }

        socket.emit('chatError', {
          message: error.message
        });
      }
    });

    socket.on('sendMessage', async (data, callback) => {
      try {
        const { conversationId, text } = data || {};

        if (!conversationId || !text?.trim()) {
          throw new Error('Conversation ID and message are required');
        }

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          throw new Error('Invalid Conversation ID');
        }

        if (text.trim().length > 5000) {
          throw new Error('Message cannot exceed 5000 characters');
        }

        const room = `conversation-${conversationId}`;

        if (!socket.rooms.has(room)) {
          throw new Error('Join conversation first');
        }

        const { conversation } = await verifyConversationAccess(
          conversationId
        );

        const savedMessage = await Message.create({
          conversation: conversationId,
          sender: userId,
          text: text.trim()
        });

        const populatedMessage = await Message.findById(
          savedMessage._id
        ).populate(
          'sender',
          'name companyName email role'
        );

        await Conversation.findByIdAndUpdate(
          conversationId,
          {
            $set: {
              updatedAt: new Date()
            }
          }
        );

        io.to(room).emit('newMessage', populatedMessage);

        const otherParticipant = conversation.participants.find(
          participant => String(participant) !== userId
        );

        if (otherParticipant) {
          io.to(`user-${String(otherParticipant)}`).emit(
            'chatNotification',
            {
              conversationId,
              message: populatedMessage
            }
          );
        }

        console.log('Message Sent:', savedMessage._id);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: populatedMessage
          });
        }

      } catch (error) {
        console.error('Send Message Error:', error.message);

        if (typeof callback === 'function') {
          callback({
            success: false,
            message: error.message
          });
        }

        socket.emit('chatError', {
          message: error.message
        });
      }
    });

    socket.on('leaveConversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation-${conversationId}`);
        console.log('Conversation Left:', conversationId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket Disconnected:', userId, reason);
    });
  });

  return io;
};

module.exports = { initSocket };