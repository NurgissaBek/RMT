const mongoose = require('mongoose');

const QuizSubmissionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{ type: Number, required: true }],
  autoScore: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['submitted', 'reviewed'],
    default: 'submitted'
  },
  feedback: {
    type: String,
    default: ''
  },
  awardedPoints: {
    type: Number,
    default: 0
  },
  awardedBadges: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common'
    },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    awardedAt: { type: Date, default: Date.now }
  }],
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

QuizSubmissionSchema.index({ quiz: 1, student: 1 });

module.exports = mongoose.model('QuizSubmission', QuizSubmissionSchema);

