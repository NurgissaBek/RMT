const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { applyForTeacher, revokeTeacherApplication } = require('../controllers/userController');

// POST /api/users/apply-teacher
router.post('/apply-teacher', protect, applyForTeacher);

// Revoke teacher application
router.delete('/apply-teacher', protect, revokeTeacherApplication);

module.exports = router;
