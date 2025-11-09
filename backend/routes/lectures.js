const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { shouldLogVisit } = require('../utils/visitTracker');

// List lectures (students see published + assigned or unassigned)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      // teacher: see own lectures (all, including unpublished)
      query = { createdBy: req.user.id };
    } else if (req.user.role === 'student') {
      // student: published and either unassigned or assigned to any of user's groups
      const User = require('../models/User');
      const user = await User.findById(req.user.id).populate('groups');
      const groupIds = (user.groups || []).map(g => g._id || g);
      query.$or = [ { assignedGroups: { $size: 0 } }, { assignedGroups: { $in: groupIds } } ];
      query.isPublished = true;
    }
    const lectures = await Lecture.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedGroups', 'name color')
      .sort('-createdAt');
    res.json({ success: true, count: lectures.length, lectures });
  } catch (err) {
    logger.error('Lectures route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create lecture (teacher)
router.post('/', protect, authorize('teacher'), async (req, res) => {
  try {
    const { title, description, content, videoUrl, resources, assignedGroups, isPublished } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const lecture = await Lecture.create({
      title, description: description || '', content: content || '', videoUrl: videoUrl || '',
      resources: resources || [], assignedGroups: assignedGroups || [], isPublished: isPublished !== false,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, lecture });
  } catch (err) {
    logger.error('Lectures route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get lecture by id (auth)
router.get('/:id', protect, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedGroups', 'name color');
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });
    
    // Логируем только первое открытие лекции студентом за период (чтобы избежать спама при обновлении страницы)
    if (req.user.role === 'student' && shouldLogVisit(req.user.id, 'lecture', lecture._id.toString())) {
      const student = await User.findById(req.user.id).select('name');
      const studentName = student ? student.name : 'Unknown';
      await logger.info(`${studentName} opened lecture "${lecture.title}"`, {
        user: req.user.id,
        route: req.originalUrl,
        ip: req.ip,
        meta: { 
          lectureId: lecture._id, 
          lectureTitle: lecture.title,
          studentName: studentName
        }
      });
    }
    
    res.json({ success: true, lecture });
  } catch (err) {
    logger.error('Lectures route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update lecture (teacher who created)
router.put('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    let lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });
    if (lecture.createdBy.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    lecture = await Lecture.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedGroups', 'name color');
    res.json({ success: true, lecture });
  } catch (err) {
    logger.error('Lectures route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete lecture (hard delete)
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });
    if (lecture.createdBy.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    
    // Удаляем лекцию полностью
    await lecture.deleteOne();
    res.json({ success: true, message: 'Lecture deleted' });
  } catch (err) {
    logger.error('Lectures route error', {
      user: req.user ? req.user.id : null,
      route: req.originalUrl,
      ip: req.ip,
      meta: { error: err.message, stack: err.stack }
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

