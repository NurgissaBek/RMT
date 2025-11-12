const User = require('../models/User');
const logger = require('../utils/logger');

// GET /api/admin/applications
exports.getTeacherApplications = async (req, res) => {
  try {
    const applicants = await User.find({ appliedForTeacher: true }).select('name email role appliedForTeacher createdAt');
    return res.status(200).json({ success: true, count: applicants.length, applicants });
  } catch (error) {
    logger.error('Admin list applications error', { user: req.user ? req.user.id : null, route: req.originalUrl, ip: req.ip, meta: { error: error.message, stack: error.stack } });
    return res.status(500).json({ success: false, message: 'Failed to fetch applications', error: error.message });
  }
};

// POST /api/admin/assign/:userId
exports.assignTeacher = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot change role of admin' });
    }

    if (user.role === 'teacher') {
      return res.status(400).json({ success: false, message: 'User is already a teacher' });
    }

    user.role = 'teacher';
    user.appliedForTeacher = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User promoted to teacher',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    logger.error('Admin assign teacher error', { user: req.user ? req.user.id : null, route: req.originalUrl, ip: req.ip, meta: { error: error.message, stack: error.stack } });
    return res.status(500).json({ success: false, message: 'Failed to assign teacher role', error: error.message });
  }
};

