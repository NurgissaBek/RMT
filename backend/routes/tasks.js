const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { shouldLogVisit } = require('../utils/visitTracker');

// GET /api/tasks — list tasks
// Students see tasks for their groups OR global tasks (no groups assigned)
router.get('/', protect, async (req, res) => {
  try {
    let filters = { isActive: true };

    if (req.user.role === 'teacher') {
      filters.createdBy = req.user.id;
    }

    if (req.user.role === 'student') {
      const user = await User.findById(req.user.id).populate('groups');
      const userGroupIds = (user?.groups || []).map(g => g._id || g);
      const or = [
        { assignedGroups: { $exists: false } },
        { assignedGroups: { $size: 0 } }
      ];
      if (userGroupIds.length > 0) or.push({ assignedGroups: { $in: userGroupIds } });
      filters = { ...filters, $or: or };
    }

    if (req.query.bloomLevel) filters.bloomLevel = req.query.bloomLevel;
    if (req.query.difficulty) filters.difficulty = req.query.difficulty;
    if (req.query.language) filters.programmingLanguage = req.query.language;

    let tasks = await Task.find(filters)
      .populate('createdBy', 'name email')
      .populate('assignedGroups', 'name color')
      .sort('-createdAt');

    // Students: hide tasks already submitted
    if (req.user.role === 'student') {
      const submitted = await Submission.find({ student: req.user.id }).select('task');
      const submittedIds = new Set(submitted.map(s => String(s.task)));
      tasks = tasks.filter(t => !submittedIds.has(String(t._id)));
    }

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    logger.error('Tasks route error', { user: req.user?.id || null, route: req.originalUrl, ip: req.ip, meta: { error: error.message, stack: error.stack } });
    res.status(500).json({ success: false, message: 'Error fetching tasks', error: error.message });
  }
});

// GET /api/tasks/:id — single task
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedGroups', 'name color');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (req.user.role === 'student' && shouldLogVisit(req.user.id, 'task', String(task._id))) {
      const student = await User.findById(req.user.id).select('name');
      await logger.info(`${student?.name || 'Unknown'} opened task "${task.title}"`, {
        user: req.user.id, route: req.originalUrl, ip: req.ip, meta: { taskId: task._id, taskTitle: task.title }
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching task', error: error.message });
  }
});

// GET /api/tasks/:id/stats — teacher stats
router.get('/:id/stats', protect, authorize('teacher'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const totalSubmissions = await Submission.countDocuments({ task: req.params.id });
    const uniqueStudents = await Submission.distinct('student', { task: req.params.id });
    const approvedSubmissions = await Submission.countDocuments({ task: req.params.id, status: 'approved' });
    const solvedByStudents = await Submission.distinct('student', { task: req.params.id, status: 'approved' });
    const pendingSubmissions = await Submission.countDocuments({ task: req.params.id, status: 'pending' });
    const rejectedSubmissions = await Submission.countDocuments({ task: req.params.id, status: 'rejected' });
    const approved = await Submission.find({ task: req.params.id, status: 'approved' }).select('pointsAwarded');
    const avgPoints = approved.length ? approved.reduce((s, d) => s + (d.pointsAwarded || 0), 0) / approved.length : 0;
    const recentSubmissions = await Submission.find({ task: req.params.id }).sort('-createdAt').limit(10).populate('student', 'name email');

    res.json({ success: true, stats: { totalSubmissions, uniqueStudentsAttempted: uniqueStudents.length, approvedSubmissions, solvedByStudents: solvedByStudents.length, pendingSubmissions, rejectedSubmissions, averagePoints: Math.round(avgPoints * 10) / 10, recentSubmissions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
});

// POST /api/tasks — create; empty groups => global
router.post('/', protect, authorize('teacher'), async (req, res) => {
  try {
    const {
      title, description, bloomLevel, difficulty, points, programmingLanguage,
      examples, hints, deadline, assignedGroups,
      autoCheckEnabled, timeLimitMs, memoryLimitMb, timeLimit, memoryLimit,
      checker, testCases, testGroups
    } = req.body;

    if (!title || !description || !bloomLevel || !difficulty) {
      return res.status(400).json({ success: false, message: 'Please fill required fields' });
    }

    const task = await Task.create({
      title,
      description,
      bloomLevel,
      difficulty,
      points: points || 10,
      programmingLanguage: programmingLanguage || 'python',
      examples: examples || [],
      hints: hints || [],
      deadline: deadline || null,
      assignedGroups: Array.isArray(assignedGroups) ? assignedGroups : [],
      createdBy: req.user.id,
      autoCheckEnabled: !!autoCheckEnabled,
      timeLimitMs: typeof timeLimitMs === 'number' ? timeLimitMs : (typeof timeLimit === 'number' ? timeLimit * 1000 : 0),
      memoryLimitMb: typeof memoryLimitMb === 'number' ? memoryLimitMb : (typeof memoryLimit === 'number' ? memoryLimit : 0),
      checker: checker || undefined,
      testCases: Array.isArray(testCases) ? testCases : undefined,
      testGroups: Array.isArray(testGroups) ? testGroups : undefined
    });

    res.status(201).json({ success: true, message: 'Task created', task });
  } catch (error) {
    logger.error('Tasks route error', { user: req.user?.id || null, route: req.originalUrl, ip: req.ip, meta: { error: error.message, stack: error.stack } });
    res.status(500).json({ success: false, message: 'Error creating task', error: error.message });
  }
});

// PUT /api/tasks/:id — update; clearing groups makes global
router.put('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (String(task.createdBy) !== String(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed to edit this task' });

    const allowed = ['title','description','bloomLevel','difficulty','points','programmingLanguage','examples','hints','deadline','assignedGroups','isActive','autoCheckEnabled','timeLimitMs','memoryLimitMb','timeLimit','memoryLimit','checker','testCases','testGroups'];
    const updatable = {};
    for (const k of allowed) if (req.body[k] !== undefined) updatable[k] = req.body[k];
    if (updatable.timeLimitMs === undefined && typeof updatable.timeLimit === 'number') updatable.timeLimitMs = updatable.timeLimit * 1000;
    if (updatable.memoryLimitMb === undefined && typeof updatable.memoryLimit === 'number') updatable.memoryLimitMb = updatable.memoryLimit;

    task = await Task.findByIdAndUpdate(req.params.id, updatable, { new: true, runValidators: true })
      .populate('assignedGroups', 'name color');
    res.json({ success: true, message: 'Task updated', task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating task', error: error.message });
  }
});

// DELETE /api/tasks/:id — soft delete
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (String(task.createdBy) !== String(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    task.isActive = false;
    await task.save();
    res.json({ success: true, message: 'Task archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting task', error: error.message });
  }
});

module.exports = router;
