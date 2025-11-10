const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  questions: [{
    text: { type: String, required: true },
    choices: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    points: { type: Number, default: 1 }
  }],
  assignedGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  isPublished: { type: Boolean, default: true },
  // When true, students can view their answers with correct/incorrect breakdown
  solutionsPublished: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', QuizSchema);

