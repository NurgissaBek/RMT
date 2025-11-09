const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { shouldLogVisit } = require('../utils/visitTracker');

// List quizzes
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      // teacher: see own quizzes (all, including unpublished)
      query = { createdBy: req.user.id };
    } else if (req.user.role === 'student') {
      // for students: published and either unassigned or assigned to student's groups
      const user = await User.findById(req.user.id).populate('groups');
      const groupIds = (user.groups || []).map(g => g._id || g);
      query.$or = [ { assignedGroups: { $size: 0 } }, { assignedGroups: { $in: groupIds } } ];
      query.isPublished = true;
    }

    const quizzes = await Quiz.find(query)
      .populate('assignedGroups', 'name color')
      .sort('-createdAt');

    let submittedQuizIds = new Set();
    if (req.user.role === 'student') {
      const submissions = await QuizSubmission.find({ student: req.user.id }).select('quiz');
      submittedQuizIds = new Set(submissions.map(s => s.quiz.toString()));
    }

    // Mask answers for students, hide already completed quizzes
    const result = quizzes
      .filter(q => {
        if (req.user.role !== 'student') return true;
        return !submittedQuizIds.has(q._id.toString());
      })
      .map(q => {
        const doc = q.toObject();
        if (req.user.role === 'student') {
          doc.questions = doc.questions.map(({ text, choices, points }) => ({ text, choices, points }));
        }
        return doc;
      });

    res.json({ success: true, count: result.length, quizzes: result });
  } catch (err) {
    logger.error('Quizzes route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
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
    logger.error('Quizzes route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
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
      const alreadySubmitted = await QuizSubmission.findOne({ quiz: quiz._id, student: req.user.id });
      if (alreadySubmitted) {
        return res.status(403).json({ success: false, message: 'Quiz already submitted' });
      }
      doc.questions = doc.questions.map(({ text, choices, points }) => ({ text, choices, points }));
      // Логируем только первое открытие квиза студентом за период (чтобы избежать спама при обновлении страницы)
      if (shouldLogVisit(req.user.id, 'quiz', quiz._id.toString())) {
        const student = await User.findById(req.user.id).select('name');
        const studentName = student ? student.name : 'Unknown';
        await logger.info(`${studentName} opened quiz "${quiz.title}"`, {
          user: req.user.id,
          route: req.originalUrl,
          ip: req.ip,
          meta: { 
            quizId: quiz._id, 
            quizTitle: quiz.title,
            studentName: studentName
          }
        });
      }
    }
    res.json({ success: true, quiz: doc });
  } catch (err) {
    logger.error('Quizzes route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit quiz (student)
router.post('/:id/submit', protect, authorize('student'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('assignedGroups', '_id');
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({ success: false, message: 'Invalid answers' });
    }

    // Ensure student has access to this quiz
    const assignedGroupIds = (quiz.assignedGroups || []).map(g => g._id ? g._id.toString() : g.toString());
    if (assignedGroupIds.length > 0) {
      const studentGroupIds = (req.user.groups || []).map(g => g._id ? g._id.toString() : g.toString());
      const hasAccess = assignedGroupIds.some(id => studentGroupIds.includes(id));
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'You do not have access to this quiz' });
      }
    }

    const existingSubmission = await QuizSubmission.findOne({ quiz: quiz._id, student: req.user.id });
    if (existingSubmission) {
      return res.status(400).json({ success: false, message: 'Quiz already submitted' });
    }

    let score = 0; let max = 0;
    quiz.questions.forEach((q, i) => { max += (q.points || 1); if (answers[i] === q.correctIndex) score += (q.points || 1); });
    const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
    const sub = await QuizSubmission.create({
      quiz: quiz._id,
      student: req.user.id,
      answers,
      autoScore: score,
      score,
      maxScore: max,
      percentage,
      awardedPoints: score
    });

    // Update student points
    const student = await User.findById(req.user.id);
    if (student) {
      student.points = (student.points || 0) + score;
      student.stats = student.stats || {};
      student.stats.totalSubmissions = (student.stats.totalSubmissions || 0) + 1;
      student.stats.successfulSubmissions = (student.stats.successfulSubmissions || 0) + (score === max ? 1 : 0);
      if (!student.badges.some(b => b.name === 'First Quiz')) {
        student.badges.push({
          name: 'First Quiz',
          description: 'Прошел свой первый квиз',
          icon: '',
          rarity: 'common',
          earnedAt: new Date()
        });
      }
      await student.save();
    }
    
    // Логируем отправку квиза студентом с именем
    const studentName = student ? student.name : 'Unknown';
    await logger.info(`${studentName} submitted quiz "${quiz.title}"`, {
      user: req.user.id,
      route: req.originalUrl,
      ip: req.ip,
      meta: { 
        quizId: quiz._id, 
        quizTitle: quiz.title,
        score: score,
        maxScore: max,
        percentage: percentage,
        studentName: studentName
      }
    });
    
    res.status(201).json({ success: true, submission: sub });
  } catch (err) {
    logger.error('Quizzes route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Teacher: get quiz submissions
router.get('/:id/submissions', protect, authorize('teacher'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('assignedGroups', 'name color createdAt');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const submissions = await QuizSubmission.find({ quiz: req.params.id })
      .populate('student', 'name email points badges')
      .sort('-createdAt');

    res.json({ success: true, quiz, submissions });
  } catch (err) {
    logger.error('Quizzes route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Teacher: review quiz submission
router.put('/submissions/:submissionId/review', protect, authorize('teacher'), async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback = '', badges = [] } = req.body;

    const submission = await QuizSubmission.findById(submissionId)
      .populate({ path: 'quiz', select: 'title questions assignedGroups createdBy' })
      .populate('student', 'name email points badges');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const maxScore = submission.maxScore || submission.quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    const finalScore = Math.min(Math.max(Number(score ?? submission.score), 0), maxScore);

    const student = await User.findById(submission.student._id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const previousPoints = submission.awardedPoints || 0;
    const delta = finalScore - previousPoints;
    if (delta !== 0) {
      student.points = Math.max(0, (student.points || 0) + delta);
    }

    if (finalScore === maxScore && !student.badges.some(b => b.name === 'Quiz Master')) {
      student.badges.push({
        name: 'Quiz Master',
        description: 'Прошел квиз на максимальный балл',
        icon: '',
        rarity: 'rare',
        earnedAt: new Date()
      });
    }

    submission.score = finalScore;
    submission.teacherScore = finalScore;
    submission.awardedPoints = finalScore;
    submission.feedback = feedback;
    submission.status = 'reviewed';
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();
    submission.percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

    const normalizedBadges = Array.isArray(badges) ? badges.filter(b => b && b.name) : [];
    if (normalizedBadges.length > 0) {
      const now = new Date();
      submission.awardedBadges = normalizedBadges.map(badge => ({
        name: badge.name,
        description: badge.description || '',
        icon: badge.icon || '',
        rarity: ['common', 'rare', 'epic', 'legendary'].includes(badge.rarity) ? badge.rarity : 'common',
        awardedBy: req.user.id,
        awardedAt: now
      }));

      normalizedBadges.forEach(badge => {
        const alreadyHas = student.badges?.some(existing => existing.name === badge.name);
        if (!alreadyHas) {
          student.badges.push({
            name: badge.name,
            description: badge.description || '',
            icon: badge.icon || '',
            rarity: ['common', 'rare', 'epic', 'legendary'].includes(badge.rarity) ? badge.rarity : 'common',
            earnedAt: now
          });
        }
      });
    } else {
      submission.awardedBadges = [];
    }

    await submission.save();
    await student.save();

    const updatedSubmission = await QuizSubmission.findById(submissionId)
      .populate('student', 'name email points badges')
      .populate('quiz', 'title');

    // Не логируем действия преподавателя по проверке квизов - только действия студентов

    res.json({ success: true, submission: updatedSubmission });
  } catch (err) {
    logger.error('Quizzes route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete quiz (teacher who created)
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (quiz.createdBy.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    
    // Удаляем все submissions этого квиза
    await QuizSubmission.deleteMany({ quiz: quiz._id });
    
    // Удаляем квиз
    await quiz.deleteOne();
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) {
    logger.error('Quizzes route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
