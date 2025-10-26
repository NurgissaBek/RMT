const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDatabase = require('./config/database');

dotenv.config();
connectDatabase();

const app = express();

app.use(express.json());
app.use(cors());

// Маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/groups', require('./routes/groups')); // НОВОЕ

app.get('/', (req, res) => {
    res.json({ 
        message: 'Gamified Programming Platform API',
        version: '2.0.0',
        features: [
            'Authentication',
            'Tasks with deadlines',
            'Submissions with edit/delete',
            'Groups management',
            'Task assignment to groups',
            'Detailed statistics'
        ]
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});