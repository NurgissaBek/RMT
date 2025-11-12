const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/authRoles');
const { getTeacherApplications, assignTeacher } = require('../controllers/adminController');

// GET /api/admin/applications
router.get('/applications', protect, isAdmin, getTeacherApplications);

// POST /api/admin/assign/:userId
router.post('/assign/:userId', protect, isAdmin, assignTeacher);

module.exports = router;

