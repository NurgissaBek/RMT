const User = require('../models/User');
const logger = require('../utils/logger');

// POST /api/users/apply-teacher
exports.applyForTeacher = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'teacher' || user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Only students can apply for teacher' });
    }

    if (user.appliedForTeacher) {
      return res.status(400).json({ success: false, message: 'Application already submitted' });
    }

    user.appliedForTeacher = true;
    await user.save();

    return res.status(200).json({ success: true, message: 'Application submitted', appliedForTeacher: true });
  } catch (error) {
    logger.error('Apply teacher error', { user: req.user ? req.user.id : null, route: req.originalUrl, ip: req.ip, meta: { error: error.message, stack: error.stack } });
    return res.status(500).json({ success: false, message: 'Unable to submit application', error: error.message });
  }
};

// DELETE /api/users/apply-teacher
exports.revokeTeacherApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'student') {
      return res.status(400).json({ success: false, message: 'Only students can revoke application' });
    }

    if (!user.appliedForTeacher) {
      return res.status(400).json({ success: false, message: 'No application to revoke' });
    }

    user.appliedForTeacher = false;
    await user.save();

    return res.status(200).json({ success: true, message: 'Application revoked', appliedForTeacher: false });
  } catch (error) {
    logger.error('Revoke teacher application error', { user: req.user ? req.user.id : null, route: req.originalUrl, ip: req.ip, meta: { error: error.message, stack: error.stack } });
    return res.status(500).json({ success: false, message: 'Unable to revoke application', error: error.message });
  }
};
