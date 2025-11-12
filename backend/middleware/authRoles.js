// Role-based access middleware
// Assumes `protect` middleware has already populated `req.user`

module.exports.isAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Authorization error', error: err.message });
  }
};

module.exports.isTeacher = (req, res, next) => {
  try {
    if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Teacher access required'
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Authorization error', error: err.message });
  }
};

