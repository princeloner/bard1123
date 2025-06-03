const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});
const path = require('path');
require('dotenv').config();

// Подключаем базу данных
const connectDB = require('./config/database');

// Middleware для обработки CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для всех остальных запросов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Подключаем базу данных
connectDB()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

// Подключаем игровую логику
const gameSocket = require('./controllers/gameSocket');
gameSocket(io);

// Настройка Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Обработка игровых событий
  socket.on('telegram-ping', (data) => {
    socket.emit('telegram-pong', { timestamp: Date.now() });
  });

  socket.on('telegram-shot', (data) => {
    socket.broadcast.emit('telegram-shot', data);
  });

  socket.on('telegram-shot-start', (data) => {
    socket.broadcast.emit('telegram-shot-start', data);
  });

  socket.on('telegram-shot-cancel', () => {
    socket.broadcast.emit('telegram-shot-cancel');
  });
});

// Обработка ошибок
io.on('error', (error) => {
  console.error('Socket.IO error:', error);
});

const PORT = process.env.PORT || 3001;

// Проверяем, запущен ли сервер в Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  http.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}