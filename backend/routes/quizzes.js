const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const { protect, authorize } = require('../middleware/auth');

// List quizzes
router.get('/', protect, async (req, res) => {
  try {
    let query = { isPublished: true };
    if (req.user.role === 'teacher') {
      query = { createdBy: req.user.id };
    } else if (req.user.role === 'student') {
      // for students: published and assigned to their groups or unassigned
      const groupIds = (req.user.groups || []).map(g => g._id || g);
      query.$or = [ { assignedGroups: { $size: 0 } }, { assignedGroups: { $in: groupIds } } ];
    }
    const quizzes = await Quiz.find(query).sort('-createdAt');
    // Mask answers for students
    const result = quizzes.map(q => {
      const doc = q.toObject();
      if (req.user.role === 'student') {
        doc.questions = doc.questions.map(({ text, choices, points }) => ({ text, choices, points }));
      }
      return doc;
    });
    res.json({ success: true, count: result.length, quizzes: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create quiz (teacher)
router.post('/', protect, authorize('teacher'), async (req, res) => {
  try {
    const { title, description, questions, assignedGroups, isPublished } = req.body;
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Title and questions are required' });
    }
    const quiz = await Quiz.create({
      title, description: description || '', questions, assignedGroups: assignedGroups || [],
      isPublished: isPublished !== false, createdBy: req.user.id
    });
    res.status(201).json({ success: true, quiz });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get quiz by id
router.get('/:id', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    let doc = quiz.toObject();
    if (req.user.role === 'student') {
      doc.questions = doc.questions.map(({ text, choices, points }) => ({ text, choices, points }));
    }
    res.json({ success: true, quiz: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit quiz (student)
router.post('/:id/submit', protect, authorize('student'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({ success: false, message: 'Invalid answers' });
    }
    let score = 0; let max = 0;
    quiz.questions.forEach((q, i) => { max += (q.points || 1); if (answers[i] === q.correctIndex) score += (q.points || 1); });
    const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
    const sub = await QuizSubmission.create({ quiz: quiz._id, student: req.user.id, answers, score, maxScore: max, percentage });
    res.status(201).json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
