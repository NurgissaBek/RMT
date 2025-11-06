const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const leaderboard = await User.find({ role: 'student' })
            .select('name email points badges')
            .sort('-points')
            .limit(limit);

        res.status(200).json({
            success: true,
            count: leaderboard.length,
            leaderboard
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении leaderboard',
            error: error.message
        });
    }
});

module.exports = router;