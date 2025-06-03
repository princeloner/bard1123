const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
require('dotenv').config();

// Подключаем базу данных
const connectDB = require('./config/database');

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

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});