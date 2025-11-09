const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const connectDatabase = require('./config/database');
const requestLogger = require('./middleware/requestLogger');
const loggerUtil = require('./utils/logger');

dotenv.config();
connectDatabase();

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(requestLogger);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/quizzes', require('./routes/quizzes'));

// Root
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
      'Detailed statistics',
      'Live logging system'
    ]
  });
});

// HTTP server + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Attach socket to logger for live logs
loggerUtil.init(io);

io.on('connection', (socket) => {
  // Не логируем WebSocket подключения - это происходит слишком часто
  socket.on('disconnect', () => {
    // Не логируем отключения
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  loggerUtil.info(`Server listening on port ${PORT}`, {
    route: '/',
    meta: { port: PORT }
  });
});
