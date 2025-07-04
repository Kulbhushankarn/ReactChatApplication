const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'document'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachmentUrl: {
    type: String,
    default: ''
  },
  attachmentType: {
    type: String,
    default: ''
  },
  read: {
    type: Boolean,
    default: false
  },
  deletedFor: [
    {
      user: { type: String, required: true },
      deletedForEveryone: { type: Boolean, default: false }
    }
  ]
}, {
  timestamps: true
});

// Indexes for faster querying of conversations
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'deletedFor.user': 1 });

module.exports = mongoose.model('Message', messageSchema);