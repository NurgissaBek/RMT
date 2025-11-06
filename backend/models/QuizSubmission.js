const mongoose = require('mongoose');

const QuizSubmissionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{ type: Number, required: true }],
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

QuizSubmissionSchema.index({ quiz: 1, student: 1 });

module.exports = mongoose.model('QuizSubmission', QuizSubmissionSchema);

