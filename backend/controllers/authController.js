const User = require('../models/User');
const logger = require('../utils/logger');

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      appliedForTeacher: false
    });

    const token = user.getSignedJwtToken();
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points
      }
    });
  } catch (error) {
    logger.error('Auth register error', { route: '/api/auth/register', ip: req.ip, meta: { error: error.message, stack: error.stack } });
    return res.status(500).json({ success: false, message: 'Registration error', error: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = user.getSignedJwtToken();
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        badges: user.badges,
        appliedForTeacher: user.appliedForTeacher
      }
    });
  } catch (error) {
    logger.error('Auth login error', { route: '/api/auth/login', ip: req.ip, meta: { error: error.message, stack: error.stack } });
    return res.status(500).json({ success: false, message: 'Login error', error: error.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        badges: user.badges,
        createdAt: user.createdAt,
        appliedForTeacher: user.appliedForTeacher
      }
    });
  } catch (error) {
    logger.error('Auth me error', { route: '/api/auth/me', ip: req.ip, meta: { error: error.message, stack: error.stack } });
    return res.status(500).json({ success: false, message: 'Fetch profile error', error: error.message });
  }
};
