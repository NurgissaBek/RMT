// Routes for code submissions
const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const judge0 = require('../services/judge0Service');

// POST /api/submissions — create a submission (student)
router.post('/', protect, authorize('student'), async (req, res) => {
  try {
    const { taskId, code, language, timeSpent } = req.body;
    if (!taskId || !code || !language) {
      return res.status(400).json({ success: false, message: 'Please fill all fields' });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (task.deadline && new Date() > new Date(task.deadline)) {
      return res.status(400).json({ success: false, message: 'Deadline for this task has expired' });
    }

    const previous = await Submission.countDocuments({ student: req.user.id, task: taskId });
    let submission = await Submission.create({
      student: req.user.id,
      task: taskId,
      code,
      language,
      timeSpent: timeSpent || 0,
      attemptNumber: previous + 1
    });

    // Optional auto-check
    if (task.autoCheckEnabled) {
      try {
        const timeLimitMs = (typeof task.timeLimitMs === 'number' && task.timeLimitMs > 0)
          ? task.timeLimitMs : ((typeof task.timeLimit === 'number' ? task.timeLimit : 5) * 1000);
        const memoryLimitMb = (typeof task.memoryLimitMb === 'number' && task.memoryLimitMb > 0)
          ? task.memoryLimitMb : (typeof task.memoryLimit === 'number' ? task.memoryLimit : 128);

        const hasGroups = Array.isArray(task.testGroups) && task.testGroups.length > 0;
        const hasCases = Array.isArray(task.testCases) && task.testCases.length > 0;
        let result = null;
        if (hasGroups) {
          result = await judge0.checkSubmissionGrouped(code, language, task.testGroups, timeLimitMs, memoryLimitMb, task.checker);
        } else if (hasCases) {
          result = await judge0.checkSubmission(code, language, task.testCases, timeLimitMs / 1000, memoryLimitMb * 1000, task.checker);
        }

        if (result) {
          submission.autoCheck = true;
          submission.testResults = result.testResults;
          submission.autoScore = result.totalScore;
          submission.maxScore = result.maxScore;
          submission.percentage = result.percentage;
          submission.pointsAwarded = result.totalScore;
          submission.status = result.allPassed ? 'approved' : 'needs_revision';
          await submission.save();

          // award points to student if passed
          if (result.allPassed && result.totalScore > 0) {
            const student = await User.findById(req.user.id);
            if (student) {
              student.points = (student.points || 0) + result.totalScore;
              try {
                await student.addExperience(result.totalScore * 5);
                const streakInfo = await student.updateStreak();
                if (streakInfo?.bonusPoints) student.points += streakInfo.bonusPoints;
              } catch (_) {}
              await student.save();
            }
          }
        }
      } catch (e) {
        logger.error('Auto-check failed', { user: req.user?.id || null, route: req.originalUrl, ip: req.ip, meta: { error: e.message } });
      }
    }

    res.status(201).json({ success: true, submission });
  } catch (error) {
    logger.error('Submissions route error', { user: req.user?.id || null, route: req.originalUrl, ip: req.ip, meta: { error: error.message, stack: error.stack } });
    res.status(500).json({ success: false, message: 'Error creating submission', error: error.message });
  }
});

// GET /api/submissions/my — list current student submissions
router.get('/my', protect, authorize('student'), async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user.id })
      .populate('task', 'title points')
      .sort('-submittedAt');
    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching submissions', error: error.message });
  }
});

// PUT /api/submissions/:id — student edits own submission
router.put('/:id', protect, authorize('student'), async (req, res) => {
  try {
    const { code } = req.body;
    const submission = await Submission.findById(req.params.id).populate('task');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (String(submission.student) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    submission.code = typeof code === 'string' ? code : submission.code;
    submission.status = 'pending';
    submission.testResults = [];
    submission.pointsAwarded = 0;
    await submission.save();

    // Re-run auto-check if enabled
    const task = submission.task;
    if (task && task.autoCheckEnabled) {
      try {
        const timeLimitMs = (typeof task.timeLimitMs === 'number' && task.timeLimitMs > 0)
          ? task.timeLimitMs : ((typeof task.timeLimit === 'number' ? task.timeLimit : 5) * 1000);
        const memoryLimitMb = (typeof task.memoryLimitMb === 'number' && task.memoryLimitMb > 0)
          ? task.memoryLimitMb : (typeof task.memoryLimit === 'number' ? task.memoryLimit : 128);
        let result = null;
        const hasGroups = Array.isArray(task.testGroups) && task.testGroups.length > 0;
        const hasCases = Array.isArray(task.testCases) && task.testCases.length > 0;
        if (hasGroups) {
          result = await judge0.checkSubmissionGrouped(submission.code, submission.language, task.testGroups, timeLimitMs, memoryLimitMb, task.checker);
        } else if (hasCases) {
          result = await judge0.checkSubmission(submission.code, submission.language, task.testCases, timeLimitMs / 1000, memoryLimitMb * 1000, task.checker);
        }
        if (result) {
          submission.autoCheck = true;
          submission.testResults = result.testResults;
          submission.autoScore = result.totalScore;
          submission.maxScore = result.maxScore;
          submission.percentage = result.percentage;
          submission.pointsAwarded = result.totalScore;
          submission.status = result.allPassed ? 'approved' : 'needs_revision';
          await submission.save();
        }
      } catch (e) {
        logger.error('Auto-check failed (update)', { user: req.user?.id || null, route: req.originalUrl, ip: req.ip, meta: { error: e.message } });
      }
    }

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating submission', error: error.message });
  }
});

// GET /api/submissions/pending — only for this teacher
router.get('/pending', protect, authorize('teacher'), async (req, res) => {
  try {
    const teacherTaskIds = await Task.find({ createdBy: req.user.id }).select('_id');
    const ids = teacherTaskIds.map(t => t._id);
    const submissions = await Submission.find({ status: 'pending', task: { $in: ids } })
      .populate('student', 'name email')
      .populate('task', 'title difficulty points createdBy')
      .sort('-submittedAt');
    res.json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching pending submissions', error: error.message });
  }
});

// PUT /api/submissions/:id/review — teacher reviews own task submissions
router.put('/:id/review', protect, authorize('teacher'), async (req, res) => {
  try {
    const { status, pointsAwarded, feedback, badges = [] } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    const submission = await Submission.findById(req.params.id).populate('student').populate('task');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (String(submission.task.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to review submissions for this task' });
    }

    submission.status = status;
    submission.feedback = feedback || '';
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = Date.now();

    const student = await User.findById(submission.student._id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const prev = submission.pointsAwarded || 0;
    let newPoints = prev;
    if (status === 'approved') {
      const target = (pointsAwarded !== undefined && pointsAwarded !== null) ? Number(pointsAwarded) : (submission.task.points || 0);
      newPoints = Math.max(0, target);
    } else {
      newPoints = 0;
    }
    const delta = newPoints - prev;
    if (delta !== 0) student.points = Math.max(0, (student.points || 0) + delta);
    submission.pointsAwarded = newPoints;

    await submission.save();
    await student.save();
    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reviewing submission', error: error.message });
  }
});

// GET /api/submissions/stats/student — aggregate for dashboard
router.get('/stats/student', protect, authorize('student'), async (req, res) => {
  try {
    const totalSubmissions = await Submission.countDocuments({ student: req.user.id });
    const approvedSubmissions = await Submission.countDocuments({ student: req.user.id, status: 'approved' });
    const pendingSubmissions = await Submission.countDocuments({ student: req.user.id, status: 'pending' });
    const needsRevision = await Submission.countDocuments({ student: req.user.id, status: 'needs_revision' });
    res.json({ success: true, stats: { totalSubmissions, approvedSubmissions, pendingSubmissions, needsRevision } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
});

module.exports = router;

