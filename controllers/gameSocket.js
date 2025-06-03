const Game = require("./Game");
const User = require("../models/User");

const games = new Map();
// Хранение списка всех активных Telegram-комнат для матчмейкинга
const telegramRooms = new Map();
// Хранение информации о соединениях пользователей Telegram
const telegramUsers = new Map();
// Хранение статистики матчмейкинга
const matchmakingStats = {
  activeSearches: 0,
  waitingRooms: 0,
  totalMatches: 0,
  lastUpdate: Date.now()
};

// Добавлю новые структуры для игры по ID
const telegramIdGames = new Map(); // gameId -> {player1, player2, status}
const telegramPendingRequests = new Map(); // userId -> {opponentId, timestamp}

// Функция для регистрации или обновления пользователя Telegram в базе данных
async function registerTelegramUser(telegramData, socketId) {
  try {
    if (!telegramData || !telegramData.id) {
      console.warn("Invalid Telegram data for registration:", telegramData);
      return null;
    }
    
    // Используем статический метод для поиска или создания пользователя
    const user = await User.findOrCreateFromTelegram(telegramData);
    
    // Добавляем пользователя в карту активных соединений
    telegramUsers.set(socketId, {
      userId: user.telegramId,
      username: user.displayName,
      socketId: socketId,
      timestamp: Date.now(),
      searching: false,
      room: null,
      lastActivity: Date.now(),
      dbUser: user
    });
    
    return user;
  } catch (error) {
    console.error("Error registering Telegram user:", error);
    return null;
  }
}

const gameSocket = (io) => {
  // Вспомогательные функции для Telegram-матчмейкинга

  // Поиск доступной комнаты для подключения
  function findAvailableRoom(userId) {
    let bestRoom = null;
    let newestTimestamp = 0;
    
    for (const [id, room] of telegramRooms.entries()) {
      // Пропускаем заполненные комнаты и комнаты, созданные самим пользователем
      if (!room.available || room.players.length >= 2 || room.creator === userId) {
        continue;
      }
      
      // Выбираем самую свежую комнату
      if (room.createdAt > newestTimestamp) {
        newestTimestamp = room.createdAt;
        bestRoom = room;
      }
    }
    
    return bestRoom;
  }

  // Подключение к существующей комнате
  function joinTelegramRoom(socket, user, room) {
    // Помечаем комнату как занятую
    room.available = false;
    room.players.push(user.userId);
    room.socketIds.push(socket.id);
    user.room = room.id;
    user.searching = false;
    
    // Обновляем статистику
    matchmakingStats.waitingRooms = countWaitingRooms();
    matchmakingStats.activeSearches = countActiveSearches();
    matchmakingStats.totalMatches++;
    
    // Уведомляем обоих игроков о том, что матч найден
    socket.emit("telegram-match-found", {
      roomId: room.id,
      playerId: room.creator
    });
    
    // Получаем сокет создателя комнаты
    const creatorSocketId = room.socketIds[0];
    if (io.sockets.sockets.has(creatorSocketId)) {
      io.sockets.sockets.get(creatorSocketId).emit("telegram-player-connected", {
        roomId: room.id,
        playerId: user.userId
      });
    }
    
    // Создаем игру в стандартном формате
    const gameId = `telegram_${room.id}`;
    games.set(gameId, new Game(io, gameId, { isPrivate: true }));
    
    // Добавляем обоих игроков в игру
    if (io.sockets.sockets.has(creatorSocketId)) {
      const creatorSocket = io.sockets.sockets.get(creatorSocketId);
      creatorSocket.roomid = gameId;
      games.get(gameId).joinroom(creatorSocket);
    }
    
    socket.roomid = gameId;
    games.get(gameId).joinroom(socket);
  }

  // Получение комнаты, созданной пользователем
  function getUserRoom(userId) {
    for (const [id, room] of telegramRooms.entries()) {
      if (room.creator === userId && room.available) {
        return room;
      }
    }
    return null;
  }

  // Уведомление всех ищущих игроков о новой комнате
  function notifyWaitingPlayers() {
    for (const [socketId, user] of telegramUsers.entries()) {
      if (user.searching && io.sockets.sockets.has(socketId)) {
        io.sockets.sockets.get(socketId).emit("telegram-matchmaking-status", {
          waitingPlayers: matchmakingStats.activeSearches,
          roomsAvailable: matchmakingStats.waitingRooms > 0
        });
      }
    }
  }

  // Подсчет активных поисков
  function countActiveSearches() {
    let count = 0;
    for (const user of telegramUsers.values()) {
      if (user.searching) count++;
    }
    return count;
  }

  // Подсчет ожидающих комнат
  function countWaitingRooms() {
    let count = 0;
    for (const room of telegramRooms.values()) {
      if (room.available) count++;
    }
    return count;
  }

  // Очистка устаревших данных
  function cleanupStaleData() {
    const now = Date.now();
    
    // Удаляем устаревшие соединения (неактивные более 5 минут)
    for (const [socketId, user] of telegramUsers.entries()) {
      if (now - user.lastActivity > 5 * 60 * 1000) {
        telegramUsers.delete(socketId);
      }
    }
    
    // Удаляем старые комнаты (старше 10 минут)
    for (const [roomId, room] of telegramRooms.entries()) {
      if (now - room.createdAt > 10 * 60 * 1000) {
        telegramRooms.delete(roomId);
      }
    }
  }

  // Обновление статистики матчмейкинга
  function updateMatchmakingStats() {
    matchmakingStats.activeSearches = countActiveSearches();
    matchmakingStats.waitingRooms = countWaitingRooms();
    matchmakingStats.lastUpdate = Date.now();
  }

  io.on("connection", (socket) => {
    // Обработка информации о пользователе Telegram
    socket.on("telegram-user-info", (data) => {
      const userId = data.user?.id || socket.id;
      const sessionId = data.sessionId || socket.id;
      
      // Сохраняем информацию о пользователе
      telegramUsers.set(socket.id, {
        userId: userId,
        sessionId: sessionId,
        socketId: socket.id,
        timestamp: Date.now(),
        searching: false,
        room: null,
        lastActivity: Date.now()
      });
      
      // Отправляем текущую статистику матчмейкинга
      socket.emit("telegram-matchmaking-status", {
        waitingPlayers: matchmakingStats.activeSearches,
        roomsAvailable: matchmakingStats.waitingRooms
      });
    });
    
    // Поиск доступной комнаты или создание новой
    socket.on("telegram-find-game", (data) => {
      const user = telegramUsers.get(socket.id);
      if (!user) return;
      
      // Помечаем пользователя как ищущего игру
      user.searching = true;
      user.lastActivity = Date.now();
      matchmakingStats.activeSearches = countActiveSearches();
      
      // Ищем свободную комнату
      const availableRoom = findAvailableRoom(user.userId);
      
      if (availableRoom) {
        // Комната найдена, подключаем игрока
        joinTelegramRoom(socket, user, availableRoom);
      } else {
        // Свободных комнат нет, сообщаем клиенту что нужно создать новую
        socket.emit("telegram-matchmaking-status", {
          waitingPlayers: matchmakingStats.activeSearches,
          noAvailableRooms: true
        });
      }
    });
    
    // Создание новой комнаты
    socket.on("telegram-create-room", (data) => {
      const user = telegramUsers.get(socket.id);
      if (!user) return;
      
      // Проверяем наличие параметров для игры по ID
      if (data.gameId && data.opponentId) {
        // Это запрос для игры по ID
        const userId = data.userId.toString();
        const opponentId = data.opponentId.toString();
        const gameId = data.gameId;
        const username = data.username || 'user_' + userId;
        
        console.log(`Создание комнаты для игры по ID. Пользователь: ${userId}, Противник: ${opponentId}, ID игры: ${gameId}`);
        
        // Проверяем, есть ли оппонент в системе
        let opponentSocketId = null;
        for (const [socketId, userData] of telegramUsers.entries()) {
          if (userData.userId.toString() === opponentId) {
            opponentSocketId = socketId;
            break;
          }
        }
        
        // Если оппонент не онлайн, сохраняем запрос и отправляем ошибку
        if (!opponentSocketId || !io.sockets.sockets.has(opponentSocketId)) {
          console.warn(`Оппонент не онлайн: ${opponentId}`);
          
          // Сохраняем запрос для возможного последующего принятия
          telegramPendingRequests.set(userId, {
            opponentId,
            gameId,
            timestamp: Date.now()
          });
          
          // Отправляем ответ клиенту
          socket.emit('telegram-id-game-response', {
            success: true,
            message: `Приглашение создано, но оппонент сейчас не в сети`,
            gameId,
            opponentId,
            opponentName: "Игрок " + opponentId
          });
          
          return;
        }
        
        // Отправляем приглашение оппоненту
        io.to(opponentSocketId).emit('telegram-game-invitation', {
          gameId,
          fromUserId: userId,
          fromUsername: username,
          message: `${username} приглашает вас сыграть в бильярд!`
        });
        
        console.log(`ОТЛАДКА: Отправлено приглашение через сокет ${opponentSocketId} игроку ${opponentId}`);
        console.log(`ОТЛАДКА: Данные приглашения:`, {
          gameId,
          fromUserId: userId,
          fromUsername: username
        });
        
        // Сохраняем запрос
        telegramPendingRequests.set(userId, {
          opponentId,
          gameId,
          timestamp: Date.now()
        });
        
        // Отправляем подтверждение отправителю
        socket.emit('telegram-id-game-response', {
          success: true,
          message: `Приглашение отправлено игроку ${opponentId}`,
          gameId,
          opponentId,
          opponentName: telegramUsers.get(opponentSocketId)?.username || "Игрок " + opponentId
        });
        
        console.log(`Отправлено приглашение для игры по ID: от ${userId} к ${opponentId}`);
        return;
      }
      
      // Стандартная обработка для матчмейкинга
      // Проверяем, не создал ли уже этот пользователь комнату
      const existingRoom = getUserRoom(user.userId);
      if (existingRoom) {
        socket.emit("telegram-create-room-result", {
          success: true,
          roomId: existingRoom.id
        });
        return;
      }
      
      // Создаем новую комнату для матчмейкинга
      const roomId = `tg_${Date.now()}_${user.userId}`;
      
      telegramRooms.set(roomId, {
        id: roomId,
        creator: user.userId,
        players: [user.userId],
        createdAt: Date.now(),
        available: true,
        socketIds: [socket.id]
      });
      
      user.room = roomId;
      user.searching = false;
      
      // Обновляем статистику
      matchmakingStats.waitingRooms = countWaitingRooms();
      matchmakingStats.activeSearches = countActiveSearches();
      
      socket.emit("telegram-create-room-result", {
        success: true,
        roomId: roomId
      });
      
      // Оповещаем других ищущих пользователей о новой комнате
      notifyWaitingPlayers();
    });
    
    // Проверка статуса комнаты
    socket.on("telegram-check-room", (data) => {
      const roomId = data.roomId;
      const room = telegramRooms.get(roomId);
      
      if (!room) {
        socket.emit("telegram-error", {
          type: "room_error",
          message: "Room not found"
        });
        return;
      }
      
      socket.emit("telegram-matchmaking-status", {
        roomExists: true,
        playersCount: room.players.length,
        waitingPlayers: matchmakingStats.activeSearches
      });
    });
    
    // Отмена поиска игры
    socket.on("telegram-cancel-matchmaking", (data) => {
      const user = telegramUsers.get(socket.id);
      if (!user) return;
      
      user.searching = false;
      matchmakingStats.activeSearches = countActiveSearches();
    });
    
    // Отмена созданной комнаты
    socket.on("telegram-cancel-room", (data) => {
      const roomId = data.roomId;
      const room = telegramRooms.get(roomId);
      const user = telegramUsers.get(socket.id);
      
      if (room && user && room.creator === user.userId) {
        telegramRooms.delete(roomId);
        user.room = null;
        
        // Обновляем статистику
        matchmakingStats.waitingRooms = countWaitingRooms();
      }
    });
    
    // Проверка соединения
    socket.on("telegram-ping", (data) => {
      const user = telegramUsers.get(socket.id);
      if (user) {
        user.lastActivity = Date.now();
      }
      socket.emit("telegram-pong", { timestamp: Date.now() });
    });

    socket.on("createroom-req", (data) => {
      var roomid = socket.id;
      const keyExists = games.has(roomid);
      if (!keyExists) {
        games.set(roomid, new Game(io, roomid, data));
        games.get(roomid).joinroom(socket);

        socket.emit("createroom-res", {
          roomid,
          success: true,
        });
        if (!data.isPrivate) {
          io.emit("add-room", {
            roomid: roomid,
            players: [{ key: "player1", playerid: socket.id }],
            betamount: data.amount,
          });
        }
      } else {
        socket.emit("createroom-res", {
          msg: "already exists",
          success: false,
        });
      }
    });

    socket.on("joinroom-req", (id) => {
      if (!id) {
        games.forEach((r) => {
          if (!id && r.getPlayerCount() < 2) {
            id = r.getRoomId();
          }
        });
      }

      const keyExists = games.has(id);
      if (keyExists) {
        games.get(id).joinroom(socket);
      } else {
        socket.emit("joinroom-res", { msg: "not exists", success: false });
      }
    });

    socket.on("leaveroom-req", (id) => {
      id = id || socket.roomid;
      const keyExists = games.has(id);
      if (keyExists) {
        var room = games.get(id);
        room.leaveroom(socket, id);
        if (room.getPlayerCount() == 0) {
          games.delete(id);

          io.emit("remove-room", { roomid: id });
          console.log("del :---------------");
        }
      } else {
        socket.emit("leaveroom-res", "NOT EXISTS ROOM");
      }
    });

    socket.on("getall-room", () => {
      socket.emit(
        "setall-room",
        Array.from(games)
          .filter((room) => !room[1].getRoomPermission())
          .map((room) => {
            return {
              roomid: room[0],
              players: room[1].getPlayers(),
              betamount: room[1].getBetAmount(),
            };
          })
      );
    });

    // Регистрация пользователя Telegram в базе данных
    socket.on('telegram-register-user', async (data) => {
      if (!data || !data.userId) {
        return socket.emit('telegram-id-game-error', { message: 'Ошибка регистрации: отсутствует userId' });
      }
      
      try {
        // Формируем данные в формате, ожидаемом моделью User
        const telegramData = {
          id: data.userId.toString(),
          username: data.username || '',
          first_name: data.firstName || '',
          last_name: data.lastName || ''
        };
        
        // Регистрируем пользователя в базе данных
        const user = await registerTelegramUser(telegramData, socket.id);
        
        if (user) {
          console.log(`Пользователь Telegram зарегистрирован в БД: ${user.telegramId} (${user.displayName})`);
          
          // Выводим информацию о всех подключенных пользователях для отладки
          console.log("Активные пользователи Telegram:");
          telegramUsers.forEach((user, socketId) => {
            console.log(`- ${user.userId} (${user.username || 'Без имени'}) - Socket: ${socketId.substring(0, 8)}...`);
          });
          
          // Отправляем данные пользователя обратно
          socket.emit('telegram-user-registered', {
            success: true,
            userId: user.telegramId,
            username: user.displayName,
            stats: user.stats
          });
        } else {
          socket.emit('telegram-id-game-error', { 
            message: 'Ошибка при регистрации пользователя в базе данных' 
          });
        }
      } catch (error) {
        console.error("Ошибка при регистрации пользователя:", error);
        socket.emit('telegram-id-game-error', { 
          message: 'Внутренняя ошибка сервера при регистрации' 
        });
      }
    });
    
    // Обновленный обработчик запроса на игру по ID
    socket.on('telegram-request-id-game', async (data) => {
      if (!data || !data.userId || !data.opponentId) {
        return socket.emit('telegram-id-game-error', { message: 'Ошибка запроса: неверные данные' });
      }
      
      const userId = data.userId.toString();
      const opponentId = data.opponentId.toString();
      const username = data.username || 'user_' + userId;
      
      try {
        // Проверяем существование оппонента в базе данных
        const opponentUser = await User.findOne({ telegramId: opponentId });
        
        // Если оппонент не найден в базе данных
        if (!opponentUser) {
          return socket.emit('telegram-id-game-error', { 
            message: 'Игрок с таким ID не найден в системе' 
          });
        }
        
        // Получаем текущего пользователя из базы данных для отправки правильного имени и фото
        const currentUser = await User.findOne({ telegramId: userId });
        const displayName = currentUser ? currentUser.displayName : username;
        const photoUrl = currentUser ? currentUser.photoUrl : '';
        
        // Ищем сокет оппонента среди активных соединений
        let opponentSocketId = null;
        for (const [socketId, user] of telegramUsers.entries()) {
          if (user.userId === opponentId) {
            opponentSocketId = socketId;
            break;
          }
        }
        
        // Если оппонент не в сети
        if (!opponentSocketId || !io.sockets.sockets.has(opponentSocketId)) {
          return socket.emit('telegram-id-game-error', { 
            message: 'Игрок в данный момент не в сети' 
          });
        }
        
        // Создаем уникальный ID игры
        const gameIdNew = `id_game_${Date.now()}_${userId}_${opponentId}`;
        
        // Сохраняем запрос
        telegramPendingRequests.set(userId, {
          opponentId,
          gameId: gameIdNew,
          timestamp: Date.now()
        });
        
        // Отправляем приглашение оппоненту с полной информацией
        io.to(opponentSocketId).emit('telegram-game-invitation', {
          gameId: gameIdNew,
          fromUserId: userId,
          fromUsername: displayName,
          fromUserAvatar: photoUrl,
          message: `${displayName} приглашает вас сыграть в бильярд!`
        });
        
        // Отправляем подтверждение отправителю
        socket.emit('telegram-id-game-response', {
          success: true,
          message: `Приглашение отправлено игроку ${opponentUser.displayName}`,
          gameId: gameIdNew,
          opponentId,
          opponentName: opponentUser.displayName,
          opponentAvatar: opponentUser.photoUrl
        });
        
        console.log(`Отправлено приглашение: от ${userId} (${displayName}) к ${opponentId} (${opponentUser.displayName})`);
      } catch (error) {
        console.error("Ошибка при обработке запроса на игру:", error);
        socket.emit('telegram-id-game-error', { 
          message: 'Внутренняя ошибка сервера при обработке запроса' 
        });
      }
    });
    
    // Обработчик явного уведомления о принятии приглашения
    socket.on('telegram-invitation-accepted', (data) => {
      if (!data || !data.gameId || !data.userId || !data.opponentId) {
        return socket.emit('telegram-id-game-error', { message: 'Ошибка принятия: неверные данные' });
      }
      
      const gameId = data.gameId;
      const userId = data.userId.toString();           // Кто принял приглашение
      const opponentId = data.opponentId.toString();   // Кто отправил приглашение
      
      console.log(`Получено прямое уведомление о принятии приглашения: Игрок ${userId} принял приглашение от ${opponentId} для игры ${gameId}`);
      
      // Ищем сокет отправителя приглашения
      let opponentSocketId = null;
      for (const [socketId, userData] of telegramUsers.entries()) {
        if (userData.userId.toString() === opponentId) {
          opponentSocketId = socketId;
          break;
        }
      }
      
      // Если сокет отправителя приглашения найден, уведомляем его
      if (opponentSocketId && io.sockets.sockets.has(opponentSocketId)) {
        console.log(`Отправляем уведомление о принятии приглашения игроку ${opponentId}`);
        
        // Отправляем уведомление о принятии приглашения
        io.to(opponentSocketId).emit('telegram-invitation-accepted', {
          gameId,
          userId,
          opponentId,
          sessionId: data.sessionId
        });
        
        // Отправляем событие начала игры
        io.to(opponentSocketId).emit('telegram-game-starting', {
          gameId,
          opponentId: userId,
          opponentName: data.username || 'Игрок ' + userId,
          initiator: true // Указываем, что этот игрок - отправитель приглашения
        });
        
        // Дополнительно отправляем команду для перехода в игру
        if (games.has(gameId)) {
          const opponentSocket = io.sockets.sockets.get(opponentSocketId);
          opponentSocket.roomid = gameId;
          games.get(gameId).joinroom(opponentSocket);
          console.log(`Отправитель приглашения ${opponentId} добавлен в стандартную игровую комнату ${gameId}`);
        }
        
        // Принудительно отправляем событие начала мультиплеерной игры
        setTimeout(() => {
          if (io.sockets.sockets.has(opponentSocketId)) {
            io.to(opponentSocketId).emit('telegram-start-multiplayer-game', {
              gameId: gameId,
              pid: 'player1'
            });
            console.log(`Отправлено событие telegram-start-multiplayer-game игроку ${opponentId} (отправитель)`);
          }
        }, 1000);
      } else {
        console.warn(`Не удалось найти сокет отправителя приглашения ${opponentId}`);
      }
    });
    
    // Обработчик для telegram-join-room (альтернативный путь для принятия приглашения)
    socket.on('telegram-join-room', (data) => {
      if (!data || !data.gameId || !data.userId || !data.opponentId) {
        return socket.emit('telegram-id-game-error', { message: 'Ошибка подключения: неверные данные' });
      }
      
      const gameId = data.gameId;
      const userId = data.userId.toString();
      const opponentId = data.opponentId.toString();
      
      console.log(`Попытка присоединения к комнате по ID. Игрок: ${userId}, Комната: ${gameId}, Оппонент: ${opponentId}`);
      
      // Ищем сокеты для обоих пользователей
      let opponentSocketId = null;
      let currentUserData = null;
      
      // Ищем сокеты для обоих пользователей
      for (const [socketId, userData] of telegramUsers.entries()) {
        if (userData.userId === opponentId) {
          opponentSocketId = socketId;
        }
        if (userData.userId === userId) {
          currentUserData = userData;
        }
        
        // Если нашли обоих, прекращаем поиск
        if (opponentSocketId && currentUserData) break;
      }
      
      // Проверяем, что оба пользователя онлайн
      if (!opponentSocketId) {
        console.warn(`Сокет оппонента не найден для ID: ${opponentId}`);
        return socket.emit('telegram-id-game-error', { 
          message: 'Оппонент не в сети. Попробуйте позже.' 
        });
      }
      
      // Создаем игру
      telegramIdGames.set(gameId, {
        gameId,
        player1: opponentId,
        player2: userId,
        sockets: {
          player1: opponentSocketId,
          player2: socket.id
        },
        status: 'starting',
        playersReady: {},
        createdAt: Date.now()
      });
      
      console.log(`Создана комната для игры по ID: ${gameId}`);
      
      // Создаем стандартную игровую комнату для механизма игры
      if (!games.has(gameId)) {
        console.log(`Создаем стандартную игровую комнату: ${gameId}`);
        games.set(gameId, new Game(io, gameId, { isPrivate: true }));
        
        // Добавляем оба сокета в комнату
        if (io.sockets.sockets.has(opponentSocketId)) {
          const opponentSocket = io.sockets.sockets.get(opponentSocketId);
          opponentSocket.roomid = gameId;
          games.get(gameId).joinroom(opponentSocket);
        }
        
        socket.roomid = gameId;
        games.get(gameId).joinroom(socket);
        
        console.log(`Оба игрока добавлены в стандартную игровую комнату: ${gameId}`);
      }
    });
    
    // Отклонение приглашения
    socket.on('telegram-decline-invitation', (data) => {
      if (!data || !data.gameId || !data.userId || !data.opponentId) {
        return;
      }
      
      const gameId = data.gameId;
      const userId = data.userId.toString();
      const opponentId = data.opponentId.toString();
      
      // Проверяем наличие запроса
      if (!telegramPendingRequests.has(opponentId) || 
          telegramPendingRequests.get(opponentId).opponentId !== userId) {
        return;
      }
      
      // Удаляем запрос
      telegramPendingRequests.delete(opponentId);
      
      // Уведомляем отправителя
      if (telegramUsers.has(opponentId)) {
        io.to(telegramUsers.get(opponentId).socketId).emit('telegram-invitation-declined', {
          gameId,
          opponentId: userId
        });
      }
    });
    
    // Подтверждение готовности к игре
    socket.on('telegram-ready-for-game', (data) => {
      if (!data || !data.gameId) {
        return socket.emit('telegram-id-game-error', { message: 'Ошибка готовности к игре: неверные данные' });
      }
      
      const gameId = data.gameId;
      const userId = data.userId?.toString() || '';
      const opponentId = data.opponentId?.toString() || '';
      
      console.log(`Готовность к игре. ID игры: ${gameId}, Игрок: ${userId}, Оппонент: ${opponentId}`);
      
      // Проверяем, создана ли стандартная игровая комната
      if (!games.has(gameId)) {
        console.log(`Создаем стандартную игровую комнату по запросу готовности: ${gameId}`);
        games.set(gameId, new Game(io, gameId, { isPrivate: true }));
        
        // Добавляем текущего игрока в комнату
        socket.roomid = gameId;
        games.get(gameId).joinroom(socket);
        console.log(`Игрок ${userId} добавлен в стандартную игровую комнату: ${gameId}`);
        
        // Убедимся, что telegramIdGames содержит нужную информацию
        if (!telegramIdGames.has(gameId)) {
          telegramIdGames.set(gameId, {
            gameId,
            player1: userId,
            player2: opponentId,
            sockets: {
              player1: socket.id,
              player2: null // Временно неизвестен
            },
            status: 'starting',
            playersReady: {},
            createdAt: Date.now()
          });
          
          console.log(`Создана информация о Telegram-игре: ${gameId}`);
        }
      } else {
        // Добавляем текущего игрока в комнату, если он еще не там
        if (!socket.roomid || socket.roomid !== gameId) {
          socket.roomid = gameId;
          games.get(gameId).joinroom(socket);
          console.log(`Игрок ${userId} добавлен в существующую игровую комнату: ${gameId}`);
        } else {
          console.log(`Игрок ${userId} уже находится в игровой комнате: ${gameId}`);
        }
      }
      
      // Если игра уже существует, добавляем пользователя в нее
      if (telegramIdGames.has(gameId)) {
        // Инициализируем объект playersReady, если его нет
        const game = telegramIdGames.get(gameId);
        if (!game.playersReady) {
          game.playersReady = {};
        }
        
        // Отмечаем готовность игрока
        game.playersReady[userId] = true;
        console.log(`Игрок ${userId} отмечен как готовый к игре ${gameId}`);
        
        // Обновляем информацию о сокете в игре
        const isPlayer1 = game.player1 === userId;
        const isPlayer2 = game.player2 === userId;
        
        if (isPlayer1) {
          game.sockets.player1 = socket.id;
          console.log(`Обновлен сокет для player1 (${userId}) в игре ${gameId}`);
        } else if (isPlayer2) {
          game.sockets.player2 = socket.id;
          console.log(`Обновлен сокет для player2 (${userId}) в игре ${gameId}`);
        } else {
          // Если игрок не определен как player1 или player2, но есть свободное место, добавляем его
          if (!game.player1) {
            game.player1 = userId;
            game.sockets.player1 = socket.id;
            console.log(`Добавлен player1 (${userId}) в игру ${gameId}`);
          } else if (!game.player2) {
            game.player2 = userId;
            game.sockets.player2 = socket.id;
            console.log(`Добавлен player2 (${userId}) в игру ${gameId}`);
          }
        }
        
        // Обновляем информацию о game
        telegramIdGames.set(gameId, game);
        
        console.log(`Текущее состояние готовности игры ${gameId}:`, 
                   `player1(${game.player1})=${game.playersReady[game.player1] || false}`, 
                   `player2(${game.player2})=${game.playersReady[game.player2] || false}`);
        
        // Проверяем, готовы ли оба игрока
        const player1Ready = game.playersReady[game.player1] || false;
        const player2Ready = game.playersReady[game.player2] || false;
        
        console.log(`Статус готовности: player1(${game.player1})=${player1Ready}, player2(${game.player2})=${player2Ready}`);
        
        // Поиск сокета второго игрока, если он существует, но его сокет не определен
        if (game.player1 && game.player2 && (!game.sockets.player1 || !game.sockets.player2)) {
          console.log(`Поиск недостающих сокетов для игры ${gameId}`);
          
          // Если не определен сокет player1, ищем его
          if (!game.sockets.player1) {
            for (const [socketId, userData] of telegramUsers.entries()) {
              if (userData.userId.toString() === game.player1) {
                game.sockets.player1 = socketId;
                telegramIdGames.set(gameId, game);
                console.log(`Найден сокет для player1 (${game.player1}): ${socketId}`);
                break;
              }
            }
          }
          
          // Если не определен сокет player2, ищем его
          if (!game.sockets.player2) {
            for (const [socketId, userData] of telegramUsers.entries()) {
              if (userData.userId.toString() === game.player2) {
                game.sockets.player2 = socketId;
                telegramIdGames.set(gameId, game);
                console.log(`Найден сокет для player2 (${game.player2}): ${socketId}`);
                break;
              }
            }
          }
        }
        
        // Проверяем, готовы ли оба игрока и есть ли их сокеты
        if (player1Ready && player2Ready && game.sockets.player1 && game.sockets.player2) {
          console.log(`Оба игрока готовы! Запускаем игру ${gameId}`);
          game.status = 'playing';
          
          // Добавляем игроков в стандартную игровую комнату, если они еще не там
          // Player 1
          if (io.sockets.sockets.has(game.sockets.player1)) {
            const player1Socket = io.sockets.sockets.get(game.sockets.player1);
            if (!player1Socket.roomid || player1Socket.roomid !== gameId) {
              player1Socket.roomid = gameId;
              games.get(gameId).joinroom(player1Socket);
              console.log(`Player1 (${game.player1}) добавлен в стандартную игровую комнату: ${gameId}`);
            }
          }
          
          // Player 2
          if (io.sockets.sockets.has(game.sockets.player2)) {
            const player2Socket = io.sockets.sockets.get(game.sockets.player2);
            if (!player2Socket.roomid || player2Socket.roomid !== gameId) {
              player2Socket.roomid = gameId;
              games.get(gameId).joinroom(player2Socket);
              console.log(`Player2 (${game.player2}) добавлен в стандартную игровую комнату: ${gameId}`);
            }
          }
          
          // Оповещаем оба сокета о начале игры
          if (game.sockets && game.sockets.player1 && io.sockets.sockets.has(game.sockets.player1)) {
            io.to(game.sockets.player1).emit('telegram-start-multiplayer-game', {
              gameId: gameId,
              pid: 'player1'
            });
            console.log(`Отправлено событие telegram-start-multiplayer-game игроку player1 (${game.player1})`);
          } else {
            console.warn(`Не удалось отправить событие player1 (${game.player1}): сокет не найден`);
          }
          
          if (game.sockets && game.sockets.player2 && io.sockets.sockets.has(game.sockets.player2)) {
            io.to(game.sockets.player2).emit('telegram-start-multiplayer-game', {
              gameId: gameId,
              pid: 'player2'
            });
            console.log(`Отправлено событие telegram-start-multiplayer-game игроку player2 (${game.player2})`);
          } else {
            console.warn(`Не удалось отправить событие player2 (${game.player2}): сокет не найден`);
          }
        } else {
          console.log(`Ожидаем готовности второго игрока для ${gameId}`);
          
          // Если второй игрок еще не готов, отправляем ему напоминание
          const waitingForPlayer = player1Ready ? game.player2 : game.player1;
          const waitingForSocketId = player1Ready ? game.sockets.player2 : game.sockets.player1;
          
          if (waitingForSocketId && io.sockets.sockets.has(waitingForSocketId)) {
            console.log(`Отправляем напоминание о готовности игроку ${waitingForPlayer}`);
            io.to(waitingForSocketId).emit('telegram-game-starting', {
              gameId: gameId,
              opponentId: userId,
              opponentName: telegramUsers.get(socket.id)?.username || 'Игрок ' + userId,
              reminder: true
            });
          }
        }
      } else {
        // Если записи об игре нет, создаем ее
        console.log(`Создание новой записи об игре ${gameId} по запросу готовности`);
        telegramIdGames.set(gameId, {
          gameId,
          player1: userId,
          player2: opponentId || null,
          sockets: {
            player1: socket.id,
            player2: null
          },
          status: 'starting',
          playersReady: {
            [userId]: true
          },
          createdAt: Date.now()
        });
        
        console.log(`Новая запись об игре ${gameId} создана, ожидаем второго игрока`);
      }
    });
    
    // Обработчик запроса информации о пользователе
    socket.on('telegram-get-user-info', async (data) => {
      if (!data || !data.opponentId) {
        return socket.emit('telegram-user-info', { 
          success: false, 
          error: 'Неверные данные запроса' 
        });
      }
      
      const opponentId = data.opponentId.toString();
      
      try {
        // Ищем пользователя в базе данных
        const user = await User.findOne({ telegramId: opponentId });
        
        if (user) {
          // Отправляем информацию о пользователе
          socket.emit('telegram-user-info', {
            success: true,
            userInfo: {
              userId: user.telegramId,
              username: user.username || '',
              firstName: user.firstName || user.displayName || ''
            }
          });
        } else {
          // Пользователь не найден
          socket.emit('telegram-user-info', {
            success: false,
            error: 'Пользователь не найден'
          });
        }
      } catch (error) {
        console.error('Ошибка при получении информации о пользователе:', error);
        socket.emit('telegram-user-info', {
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    });
    
    // Обработчик запроса информации об оппоненте
    socket.on('telegram-get-opponent-info', async (data) => {
      if (!data || !data.opponentId) {
        return socket.emit('telegram-opponent-info', { 
          success: false, 
          error: 'Неверные данные запроса' 
        });
      }
      
      const opponentId = data.opponentId.toString();
      
      try {
        // Ищем пользователя в базе данных
        const user = await User.findOne({ telegramId: opponentId });
        
        if (user) {
          // Отправляем информацию о пользователе
          socket.emit('telegram-opponent-info', {
            success: true,
            opponentInfo: {
              userId: user.telegramId,
              username: user.username || '',
              firstName: user.firstName || user.displayName || ''
            }
          });
        } else {
          // Пользователь не найден
          socket.emit('telegram-opponent-info', {
            success: false,
            error: 'Оппонент не найден'
          });
        }
      } catch (error) {
        console.error('Ошибка при получении информации об оппоненте:', error);
        socket.emit('telegram-opponent-info', {
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    });
    
    // Отмена приглашения в игру
    socket.on('telegram-cancel-id-game', (data) => {
      if (!data || !data.userId || !data.opponentId) {
        return;
      }
      
      const userId = data.userId.toString();
      const opponentId = data.opponentId.toString();
      
      // Удаляем запрос, если существует
      if (telegramPendingRequests.has(userId) && 
          telegramPendingRequests.get(userId).opponentId === opponentId) {
        
        const gameId = telegramPendingRequests.get(userId).gameId;
        telegramPendingRequests.delete(userId);
        
        // Уведомляем оппонента
        if (telegramUsers.has(opponentId)) {
          io.to(telegramUsers.get(opponentId).socketId).emit('telegram-invitation-canceled', {
            gameId,
            opponentId: userId
          });
        }
      }
    });

    // Обработчик для события начала игры
    socket.on('telegram-game-starting', (data) => {
      if (!data || !data.gameId || !data.opponentId) {
        return socket.emit('telegram-id-game-error', { message: 'Ошибка запуска игры: неверные данные' });
      }
      
      const gameId = data.gameId;
      const userId = data.userId?.toString() || socket.id;
      const opponentId = data.opponentId.toString();
      
      console.log(`Получено событие начала игры: ID игры: ${gameId}, Игрок: ${userId}, Оппонент: ${opponentId}`);
      
      // Проверяем, создана ли стандартная игровая комната
      if (!games.has(gameId)) {
        console.log(`Создаем стандартную игровую комнату для игры: ${gameId}`);
        games.set(gameId, new Game(io, gameId, { isPrivate: true }));
        
        console.log(`Стандартная игровая комната создана: ${gameId}`);
      }
      
      // Проверяем, существует ли запись об игре в системе Telegram
      if (!telegramIdGames.has(gameId)) {
        console.log(`Создаем информацию о Telegram-игре: ${gameId}`);
        telegramIdGames.set(gameId, {
          gameId,
          player1: userId,
          player2: opponentId,
          sockets: {
            player1: socket.id,
            player2: null
          },
          status: 'starting',
          playersReady: {},
          createdAt: Date.now()
        });
      }
      
      // Находим сокеты обоих игроков
      let currentUserSocketId = socket.id;
      let opponentSocketId = null;
      
      // Ищем сокет оппонента
      for (const [socketId, userData] of telegramUsers.entries()) {
        if (userData.userId.toString() === opponentId) {
          opponentSocketId = socketId;
          break;
        }
      }
      
      // Обновляем информацию о сокетах в записи игры
      if (telegramIdGames.has(gameId)) {
        const gameInfo = telegramIdGames.get(gameId);
        
        // Определяем, кто из игроков player1, а кто player2
        if (gameInfo.player1 === userId) {
          gameInfo.sockets.player1 = currentUserSocketId;
          if (opponentSocketId) {
            gameInfo.sockets.player2 = opponentSocketId;
          }
        } else if (gameInfo.player2 === userId) {
          gameInfo.sockets.player2 = currentUserSocketId;
          if (opponentSocketId) {
            gameInfo.sockets.player1 = opponentSocketId;
          }
        }
        
        telegramIdGames.set(gameId, gameInfo);
      }
      
      // Добавляем текущего игрока в стандартную комнату
      console.log(`Добавляем игрока ${userId} в стандартную игровую комнату: ${gameId}`);
      socket.roomid = gameId;
      games.get(gameId).joinroom(socket);
      
      // Если найден сокет оппонента, добавляем и его в комнату
      if (opponentSocketId && io.sockets.sockets.has(opponentSocketId)) {
        console.log(`Добавляем оппонента ${opponentId} в стандартную игровую комнату: ${gameId}`);
        const opponentSocket = io.sockets.sockets.get(opponentSocketId);
        opponentSocket.roomid = gameId;
        games.get(gameId).joinroom(opponentSocket);
      } else {
        console.log(`Сокет оппонента ${opponentId} не найден или не активен`);
      }
      
      // Отправляем ответное уведомление о начале игры
      socket.emit('telegram-game-starting', {
        gameId,
        opponentId,
        opponentName: telegramUsers.get(opponentSocketId)?.username || 'Игрок ' + opponentId
      });
      
      // Если нашли сокет оппонента, отправляем ему уведомление тоже
      if (opponentSocketId && io.sockets.sockets.has(opponentSocketId)) {
        io.to(opponentSocketId).emit('telegram-game-starting', {
          gameId,
          opponentId: userId,
          opponentName: telegramUsers.get(currentUserSocketId)?.username || 'Игрок ' + userId
        });
      }
    });

    // Принятие приглашения
    socket.on('telegram-accept-invitation', (data) => {
      if (!data || !data.gameId || !data.userId || !data.opponentId) {
        console.warn('telegram-accept-invitation: Получены неверные данные:', data);
        return socket.emit('telegram-id-game-error', { message: 'Ошибка принятия: неверные данные' });
      }
      
      const gameId = data.gameId;
      const userId = data.userId.toString();
      const opponentId = data.opponentId.toString();
      
      console.log(`ОТЛАДКА: Получен запрос на принятие приглашения. Игрок: ${userId}, Оппонент: ${opponentId}, ID игры: ${gameId}`);
      
      // Проверяем наличие запроса
      if (!telegramPendingRequests.has(opponentId)) {
        console.warn(`Приглашение не найдено для отправителя ${opponentId}`);
        console.log('Текущие запросы:', Array.from(telegramPendingRequests.entries()));
        return socket.emit('telegram-id-game-error', { message: 'Приглашение не найдено' });
      }
      
      const pendingRequest = telegramPendingRequests.get(opponentId);
      if (pendingRequest.opponentId !== userId) {
        console.warn(`Несоответствие ID получателя: ожидается ${pendingRequest.opponentId}, получено ${userId}`);
        return socket.emit('telegram-id-game-error', { message: 'Приглашение предназначено другому игроку' });
      }
      
      // Проверяем существование пользователей в телеграм-юзерах
      let opponentSocketId = null;
      let currentUserData = null;
      
      // Ищем сокеты для обоих пользователей
      for (const [socketId, userData] of telegramUsers.entries()) {
        if (userData.userId.toString() === opponentId) {
          opponentSocketId = socketId;
        }
        if (userData.userId.toString() === userId) {
          currentUserData = userData;
        }
        
        // Если нашли обоих, прекращаем поиск
        if (opponentSocketId && currentUserData) break;
      }
      
      console.log('ОТЛАДКА: Найдены сокеты:', {
        opponentSocketId: opponentSocketId ? opponentSocketId.substring(0, 8) + '...' : 'не найден',
        currentUserData: currentUserData ? 'найден' : 'не найден'
      });
      
      // Проверяем, что оба пользователя онлайн
      if (!opponentSocketId || !currentUserData) {
        return socket.emit('telegram-id-game-error', { 
          message: 'Один из игроков не в сети. Попробуйте позже.' 
        });
      }
      
      // Получаем данные запроса
      const request = telegramPendingRequests.get(opponentId);
      
      // Создаем игру
      telegramIdGames.set(gameId, {
        gameId,
        player1: opponentId,
        player2: userId,
        sockets: {
          player1: opponentSocketId,
          player2: socket.id
        },
        status: 'starting',
        playersReady: {},
        createdAt: Date.now()
      });
      
      // Удаляем запрос
      telegramPendingRequests.delete(opponentId);
      
      // Создаем стандартную игровую комнату для механизма игры
      if (!games.has(gameId)) {
        console.log(`Создаем стандартную игровую комнату: ${gameId}`);
        games.set(gameId, new Game(io, gameId, { isPrivate: true }));
        
        // Добавляем оба сокета в комнату
        if (io.sockets.sockets.has(opponentSocketId)) {
          const opponentSocket = io.sockets.sockets.get(opponentSocketId);
          opponentSocket.roomid = gameId;
          games.get(gameId).joinroom(opponentSocket);
          console.log(`Отправитель приглашения ${opponentId} добавлен в стандартную игровую комнату: ${gameId}`);
        }
        
        socket.roomid = gameId;
        games.get(gameId).joinroom(socket);
        
        console.log(`Оба игрока добавлены в стандартную игровую комнату: ${gameId}`);
      }
      
      // Уведомляем принимающего игрока о начале игры
      socket.emit('telegram-game-starting', {
        gameId,
        opponentId,
        opponentName: telegramUsers.get(opponentSocketId).username || 'Игрок ' + opponentId
      });
      
      // Уведомляем отправителя приглашения о принятии и начале игры
      if (io.sockets.sockets.has(opponentSocketId)) {
        // Отправляем уведомление о принятии приглашения
        io.to(opponentSocketId).emit('telegram-invitation-accepted', {
          gameId,
          userId,
          opponentId,
          username: currentUserData ? currentUserData.username : 'Игрок ' + userId
        });
        
        // Сразу же отправляем событие начала игры
        io.to(opponentSocketId).emit('telegram-game-starting', {
          gameId,
          opponentId: userId,
          opponentName: currentUserData ? currentUserData.username : 'Игрок ' + userId,
          initiator: true // Помечаем как отправителя приглашения
        });
        
        console.log(`Отправлено событие начала игры отправителю приглашения: ${opponentId}`);
      }
      
      // Отправляем обоим игрокам команду старта игры с определением pid
      setTimeout(() => {
        // Отправляем игроку, принявшему приглашение
        socket.emit('telegram-start-multiplayer-game', {
          gameId: gameId,
          pid: 'player2'
        });
        
        // Отправляем отправителю приглашения
        if (io.sockets.sockets.has(opponentSocketId)) {
          io.to(opponentSocketId).emit('telegram-start-multiplayer-game', {
            gameId: gameId,
            pid: 'player1'
          });
        }
        
        console.log(`Отправлены события telegram-start-multiplayer-game обоим игрокам`);
      }, 1000);
    });

    socket.on("disconnect", function () {
      // Обработка отключения для Telegram-пользователя
      const user = telegramUsers.get(socket.id);
      if (user) {
        // Если пользователь создал комнату - удаляем ее
        if (user.room) {
          const room = telegramRooms.get(user.room);
          if (room && room.creator === user.userId) {
            telegramRooms.delete(user.room);
            matchmakingStats.waitingRooms = countWaitingRooms();
          }
        }
        telegramUsers.delete(socket.id);
        matchmakingStats.activeSearches = countActiveSearches();
      }
      
      // Обработка отключения для обычной игры
      if (socket.roomid) {
        var room = games.get(socket.roomid);
        if (room) {
          room.leaveroom(socket, socket.roomid);
          if (room.getPlayerCount() == 0) {
            io.emit("remove-room", { roomid: socket.roomid });
            games.delete(socket.roomid);
            console.log("del :");
          }
        }
      }

      // Обновляем статус пользователя Telegram
      for (const [userId, userData] of telegramUsers.entries()) {
        if (userData.socketId === socket.id) {
          userData.status = 'offline';
          userData.lastActivity = Date.now();
          
          // Отменяем все ожидающие запросы
          if (telegramPendingRequests.has(userId)) {
            const opponentId = telegramPendingRequests.get(userId).opponentId;
            telegramPendingRequests.delete(userId);
            
            // Уведомляем оппонента
            if (telegramUsers.has(opponentId)) {
              io.to(telegramUsers.get(opponentId).socketId).emit('telegram-invitation-canceled', {
                opponentId: userId,
                message: 'Пользователь вышел из игры'
              });
            }
          }
          
          break;
        }
      }
    });
  });
  
  // Запускаем периодическую очистку старых данных и обновление статистики
  setInterval(() => {
    cleanupStaleData();
    updateMatchmakingStats();
  }, 30000);
};

module.exports = gameSocket;
