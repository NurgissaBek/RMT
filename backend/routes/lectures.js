const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture');
const { protect, authorize } = require('../middleware/auth');

// List lectures (students see published + assigned or unassigned)
router.get('/', protect, async (req, res) => {
  try {
    let query = { isPublished: true };
    if (req.user.role === 'teacher') {
      // teacher: see own lectures
      query = { createdBy: req.user.id };
    } else if (req.user.role === 'student') {
      // student: published and either unassigned or assigned to any of user's groups
      const user = req.user; // fetched by auth middleware
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
    res.json({ success: true, lecture });
  } catch (err) {
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unpublish/delete (soft)
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });
    if (lecture.createdBy.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    lecture.isPublished = false;
    await lecture.save();
    res.json({ success: true, message: 'Lecture unpublished' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

