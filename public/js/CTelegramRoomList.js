function CTelegramRoomList() {
  // Константы состояний
  const STATE_IDLE = 'idle';
  const STATE_SEARCHING = 'searching';
  const STATE_WAITING_OPPONENT = 'waiting_opponent';
  const STATE_MATCH_FOUND = 'match_found';
  const STATE_ERROR = 'error';
  
  // Переменные для контроля ударов
  var _bShotInProgress = false;
  var _iShotStartTime = 0;
  var _iLastShotTime = 0;
  const MIN_SHOT_DURATION = 100;
  const MIN_SHOT_INTERVAL = 500;
  
  var _ready = false;
  var _pStartPosExit;
  var _sCurrentState = STATE_IDLE;

  var _oBg;
  var _oButExit;
  var _oFade;
  var _oContainer;
  var _oMatchmakingText;
  var _oReconnectingText;
  var _oAnimationContainer;
  var _oLoadingDotsInterval;
  var _bSearching = false;
  var _bRoomCreated = false;
  var _sRoomId = null;
  var _iMatchmakingInterval = null;
  var _iLastServerPing = 0;

  // Для сбора статистики и отладки
  var _iSearchStartTime = 0;
  var _iPlayersWaiting = 0;
  var _iSearchAttempts = 0;
  var _iLastRoomCheck = 0;
  var _iTelegramUserId = null;
  var _sSessionId = generateSessionId();

  var _interface;
  var _fRequestFullScreen = null;
  var _fCancelFullScreen = null;

  var _domElement;
  
  // Добавляем новые переменные для синхронизации
  var _lastUpdateTime = 0;
  var _updateBuffer = [];
  var _predictionBuffer = [];
  var _syncInterval = null;
  var _lastGameState = null;
  var _interpolationEnabled = true;

  // Добавляем переменные для обработки ошибок
  var _reconnectAttempts = 0;
  var _maxReconnectAttempts = 5;
  var _reconnectDelay = 1000;
  var _errorTimeout = null;
  var _lastErrorTime = 0;
  var _errorCount = 0;
  var _maxErrorsPerMinute = 10;

  // Добавляем переменные для обработки ударов
  var _shotBuffer = [];
  var _maxShotBufferSize = 10;
  var _lastProcessedShotTime = 0;
  var _shotPredictionEnabled = true;
  var _shotCompensationEnabled = true;

  this._init = function () {
    _oBg = createBitmap(s_oSpriteLibrary.getSprite("bg_menu"));
    s_oStage.addChild(_oBg);

    var oSpriteExit = s_oSpriteLibrary.getSprite("but_exit");
    _pStartPosExit = {
      x: CANVAS_WIDTH - oSpriteExit.width / 2 - 10,
      y: oSpriteExit.height / 2 + 10,
    };

    _oButExit = new CGfxButton(
      _pStartPosExit.x,
      _pStartPosExit.y,
      oSpriteExit,
      s_oStage
    );
    _oButExit.addEventListener(ON_MOUSE_DOWN, this._onMouseDownButExit, this);

    // Инициализируем интерфейс матчмейкинга
    this._createMatchmakingUI();

    _oFade = new createjs.Shape();
    _oFade.graphics
      .beginFill("black")
      .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    s_oStage.addChild(_oFade);

    createjs.Tween.get(_oFade).to({ alpha: 0 }, 1000, createjs.Ease.cubicOut);
    
    // Проверяем наличие подключения к серверу
    if (typeof socket === 'undefined' || !socket) {
      console.error("Ошибка: socket не определен. Будет выполнен перезапуск игры.");
      this._showErrorAndRestart("Ошибка подключения к серверу", "Проверьте соединение с интернетом и перезапустите игру.");
      return;
    }
    
    // Инициализируем соединение и начинаем поиск игры
    this._initSocketConnection();
    
    // Устанавливаем обработчик для защиты от ошибок
    window.onerror = function(message, source, lineno, colno, error) {
      console.error("Произошла ошибка:", message, "Источник:", source, "Строка:", lineno);
      // Не останавливаем выполнение, только логируем
      return true;
    };
    
    // Запускаем поиск игры автоматически
    this._startMatchmaking();
    
    sizeHandler();
    _ready = true;

    // Инициализируем систему синхронизации
    this._initGameSync();

    // Инициализируем обработку ударов
    this._initShotHandling();
  };

  // Генерирует уникальный идентификатор сессии для предотвращения дублирования
  function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  this._createMatchmakingUI = function() {
    _oContainer = new createjs.Container();
    s_oStage.addChild(_oContainer);

    // Добавляем затемненный фон под UI
    var oUIBg = new createjs.Shape();
    oUIBg.graphics.beginFill("rgba(0,0,0,0.7)").drawRoundRect(CANVAS_WIDTH / 2 - 200, 120, 400, 300, 10);
    _oContainer.addChild(oUIBg);

    // Заголовок
    var oTitleText = new createjs.Text("ПОИСК ИГРЫ", "40px " + FONT_GAME, "#ffffff");
    oTitleText.x = CANVAS_WIDTH / 2;
    oTitleText.y = 150;
    oTitleText.textAlign = "center";
    _oContainer.addChild(oTitleText);

    // Текст статуса поиска
    _oMatchmakingText = new createjs.Text("Ищем соперника...", "24px " + FONT_GAME, "#ffffff");
    _oMatchmakingText.x = CANVAS_WIDTH / 2;
    _oMatchmakingText.y = 220;
    _oMatchmakingText.textAlign = "center";
    _oContainer.addChild(_oMatchmakingText);

    // Текст переподключения
    _oReconnectingText = new createjs.Text("Соединение с сервером потеряно. Пытаемся восстановить...", "20px " + FONT_GAME, "#ff4444");
    _oReconnectingText.x = CANVAS_WIDTH / 2;
    _oReconnectingText.y = 260;
    _oReconnectingText.textAlign = "center";
    _oReconnectingText.visible = false;
    _oContainer.addChild(_oReconnectingText);

    // Контейнер для анимации
    _oAnimationContainer = new createjs.Container();
    _oAnimationContainer.x = CANVAS_WIDTH / 2;
    _oAnimationContainer.y = CANVAS_HEIGHT / 2;
    _oContainer.addChild(_oAnimationContainer);

    // Создаем улучшенную анимацию поиска
    this._createSearchAnimation();

    // Добавляем текст с информацией о текущем состоянии поиска
    var oStatsText = new createjs.Text("", "18px " + FONT_GAME, "#aaaaaa");
    oStatsText.x = CANVAS_WIDTH / 2;
    oStatsText.y = CANVAS_HEIGHT - 100;
    oStatsText.textAlign = "center";
    _oContainer.addChild(oStatsText);

    // Обновляем статистику каждую секунду
    setInterval(function() {
      if (_bSearching) {
        var seconds = Math.floor((Date.now() - _iSearchStartTime) / 1000);
        var serverLag = Date.now() - _iLastServerPing;
        var lagStatus = serverLag < 2000 ? "хорошее" : (serverLag < 5000 ? "среднее" : "слабое");
        var timeStr = seconds < 60 ? seconds + " сек" : Math.floor(seconds / 60) + " мин " + (seconds % 60) + " сек";
        oStatsText.text = "Поиск: " + timeStr + " | Игроков в очереди: " + _iPlayersWaiting + " | Соединение: " + lagStatus;
      } else {
        oStatsText.text = "";
      }
    }, 1000);

    // Запускаем анимацию точек
    this._startLoadingDotsAnimation();
  };

  this._createSearchAnimation = function() {
    // Очищаем предыдущую анимацию, если есть
    _oAnimationContainer.removeAllChildren();
    
    // Создаем контейнер для вращающихся элементов
    var rotatingContainer = new createjs.Container();
    _oAnimationContainer.addChild(rotatingContainer);
    
    // Создаем пульсирующий круг
    var pulseCircle = new createjs.Shape();
    pulseCircle.graphics.beginFill("rgba(34, 167, 240, 0.3)").drawCircle(0, 0, 50);
    rotatingContainer.addChild(pulseCircle);
    
    // Анимация пульсации
    createjs.Tween.get(pulseCircle, {loop: true})
      .to({scaleX: 1.2, scaleY: 1.2, alpha: 0.1}, 1000, createjs.Ease.sineInOut)
      .to({scaleX: 1, scaleY: 1, alpha: 0.3}, 1000, createjs.Ease.sineInOut);
    
    // Создаем орбиты и элементы на них
    this._createOrbitElement(rotatingContainer, 0, 60, "#FFFFFF", 10, 2000, 0);
    this._createOrbitElement(rotatingContainer, 120, 60, "#22A7F0", 10, 2000, 0.33);
    this._createOrbitElement(rotatingContainer, 240, 60, "#FFC107", 10, 2000, 0.66);
    
    // Добавляем сообщение под анимацией
    var helpText = new createjs.Text("Ищем подходящего соперника", "16px " + FONT_GAME, "#ffffff");
    helpText.textAlign = "center";
    helpText.y = 70;
    _oAnimationContainer.addChild(helpText);
  };
  
  this._createOrbitElement = function(container, startAngle, radius, color, size, duration, offset) {
    // Создаем элемент
    var element = new createjs.Shape();
    element.graphics.beginFill(color).drawCircle(0, 0, size);
    container.addChild(element);
    
    // Устанавливаем начальное положение
    var angle = (startAngle * Math.PI) / 180;
    element.x = Math.cos(angle) * radius;
    element.y = Math.sin(angle) * radius;
    
    // Анимируем вращение
    createjs.Tween.get(element, {loop: true})
      .wait(duration * offset) // Задержка для смещения начала анимации
      .to({rotation: 360}, 0) // Мгновенный поворот для прямого пути
      .to({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      }, 0)
      .to({
        x: Math.cos((startAngle + 360) * Math.PI / 180) * radius,
        y: Math.sin((startAngle + 360) * Math.PI / 180) * radius
      }, duration, createjs.Ease.linear);
  };

  this._startLoadingDotsAnimation = function() {
    var baseText = "Ищем соперника";
    var dots = 0;
    
    // Очищаем предыдущий интервал, если есть
    if (_oLoadingDotsInterval) {
      clearInterval(_oLoadingDotsInterval);
      _oLoadingDotsInterval = null;
    }
    
    _oLoadingDotsInterval = setInterval(function() {
      // Проверяем, что объект _oMatchmakingText существует
      if (_oMatchmakingText && _bSearching) {
        dots = (dots + 1) % 4;
        var dotsText = ".".repeat(dots);
        _oMatchmakingText.text = baseText + dotsText;
      } else if (!_bSearching && _oLoadingDotsInterval) {
        // Если поиск остановлен, но интервал еще работает - очищаем
        clearInterval(_oLoadingDotsInterval);
        _oLoadingDotsInterval = null;
      }
    }, 500);
  };

  this._stopLoadingDotsAnimation = function() {
    if (_oLoadingDotsInterval) {
      clearInterval(_oLoadingDotsInterval);
      _oLoadingDotsInterval = null;
    }
  };

  this._initSocketConnection = function() {
    // Оптимизация настроек сокета
    if (socket && socket.io) {
      socket.io.opts = {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        forceNew: true,
        forceBase64: true
      };
    }

    // Добавляем обработчики для контроля ударов с оптимизацией
    var _lastPingTime = Date.now();
    var _pingInterval = null;
    var _updateInterval = 100; // Начальный интервал обновления

    // Функция для адаптивной настройки частоты обновлений
    function adjustUpdateInterval() {
      var currentTime = Date.now();
      var latency = currentTime - _lastPingTime;
      
      if (latency > 200) {
        // Уменьшаем частоту обновлений при высоком лаге
        _updateInterval = Math.min(_updateInterval * 1.5, 1000);
        console.log("Высокий лаг:", latency, "мс. Увеличиваем интервал до:", _updateInterval);
      } else {
        // Возвращаем нормальную частоту при хорошем соединении
        _updateInterval = Math.max(_updateInterval * 0.8, 100);
        console.log("Нормальный лаг:", latency, "мс. Уменьшаем интервал до:", _updateInterval);
      }
      
      _lastPingTime = currentTime;
    }

    // Запускаем мониторинг соединения
    _pingInterval = setInterval(function() {
      if (socket && socket.connected) {
        socket.emit("telegram-ping", { timestamp: Date.now() });
        adjustUpdateInterval();
      }
    }, 1000);

    // Обработчик ударов с оптимизацией
    socket.on("telegram-shot-start", function(data) {
      if (!_ready) return;
      
      // Проверяем состояние стола с учетом лага
      if (s_oTable && !s_oTable.isReadyForShot()) {
        console.log("CTelegramRoomList: Блокировка удара - стол не готов к удару");
        return;
      }
      
      var currentTime = Date.now();
      if (currentTime - _iLastShotTime < MIN_SHOT_INTERVAL) {
        console.log("CTelegramRoomList: Игнорируем слишком частый удар");
        return;
      }
      
      _bShotInProgress = true;
      _iShotStartTime = currentTime;

      // Добавляем информацию о лаге
      data.localTimestamp = currentTime;
      data.networkLatency = this._calculateNetworkLatency();
    }.bind(this));

    // Оптимизированный обработчик ударов
    socket.on("telegram-shot", function(data) {
      if (!_ready || !_bShotInProgress) {
        console.log("CTelegramRoomList: Игнорируем недопустимый удар");
        return;
      }

      // Проверяем активность shotpower с учетом лага
      if (s_oTable && s_oTable.isShotPowerActive()) {
        console.log("CTelegramRoomList: Блокировка случайного удара - активен shotpower");
        return;
      }

      var currentTime = Date.now();
      var shotDuration = currentTime - _iShotStartTime;

      if (shotDuration < MIN_SHOT_DURATION) {
        console.log("CTelegramRoomList: Игнорируем слишком короткий удар");
        _bShotInProgress = false;
        return;
      }

      _iLastShotTime = currentTime;
      _bShotInProgress = false;

      // Добавляем удар в буфер
      this._bufferShot({
        timestamp: currentTime,
        data: data,
        localTimestamp: _iShotStartTime,
        networkLatency: this._calculateNetworkLatency()
      });

      // Обрабатываем удар
      this._processShot(data);
    }.bind(this));

    // Обработчик отмены удара
    socket.on("telegram-shot-cancel", function() {
      _bShotInProgress = false;
      // Очищаем буфер ударов при отмене
      _shotBuffer = [];
    });

    // Остальные обработчики событий
    socket.on("telegram-match-found", function(data) { 
      if (_ready) this._onMatchFound(data); 
      else console.warn('[CTelegramRoomList] _onMatchFound игнор: не готово'); 
    }.bind(this));

    socket.on("telegram-create-room-result", function(data) { 
      if (_ready) this._onRoomCreated(data); 
      else console.warn('[CTelegramRoomList] _onRoomCreated игнор: не готово'); 
    }.bind(this));

    socket.on("telegram-matchmaking-status", function(data) { 
      if (_ready) this._onMatchmakingStatus(data); 
      else console.warn('[CTelegramRoomList] _onMatchmakingStatus игнор: не готово'); 
    }.bind(this));

    socket.on("telegram-error", function(error) { 
      if (_ready) this._onMatchmakingError(error); 
      else console.warn('[CTelegramRoomList] _onMatchmakingError игнор: не готово'); 
    }.bind(this));

    socket.on("telegram-player-connected", function(data) { 
      if (_ready) this._onPlayerConnected(data); 
      else console.warn('[CTelegramRoomList] _onPlayerConnected игнор: не готово'); 
    }.bind(this));

    socket.on("telegram-pong", function(data) { 
      if (_ready) this._onServerPong(data); 
      else console.warn('[CTelegramRoomList] _onServerPong игнор: не готово'); 
    }.bind(this));

    // Обработчики отключения с оптимизацией
    socket.on("disconnect", function() { 
      if (_ready) {
        console.log("Соединение потеряно. Попытка переподключения...");
        this._onConnectionLost(); 
      } else {
        console.warn('[CTelegramRoomList] _onConnectionLost игнор: не готово'); 
      }
    }.bind(this));

    socket.on("connect_error", function(error) { 
      if (_ready) {
        console.error("Ошибка соединения:", error);
        this._onConnectionError(error); 
      } else {
        console.warn('[CTelegramRoomList] _onConnectionError игнор: не готово'); 
      }
    }.bind(this));

    // Добавляем обработчики для восстановления соединения
    socket.on("reconnect", function() {
      if (_ready) this._onReconnect();
    }.bind(this));

    socket.on("reconnect_attempt", function(attemptNumber) {
      console.log(`Попытка переподключения #${attemptNumber}`);
    });

    socket.on("reconnect_error", function(error) {
      console.error("Ошибка при переподключении:", error);
    });

    socket.on("reconnect_failed", function() {
      console.error("Не удалось переподключиться");
      this._showErrorAndRestart(
        "Ошибка подключения",
        "Не удалось восстановить соединение с сервером. Попробуйте позже."
      );
    }.bind(this));

    // Очистка интервала при уничтожении объекта
    this._cleanup = function() {
      if (_pingInterval) {
        clearInterval(_pingInterval);
        _pingInterval = null;
      }
    };

    // Получаем Telegram-данные пользователя для авторизации
    var telegramUser = null;
    if (window.Telegram && window.Telegram.WebApp) {
      telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
      if (telegramUser) {
        _iTelegramUserId = telegramUser.id;
      }
    }
    
    // Отправляем информацию о пользователе на сервер с уникальным ID сессии
    socket.emit("telegram-user-info", {
      user: telegramUser || { id: "guest_" + Math.floor(Math.random() * 100000) },
      platform: "telegram",
      sessionId: _sSessionId
    });
  };

  this._setupSearchTimeout = function() {
    // Устанавливаем максимальное время поиска - 5 минут
    setTimeout(function() {
      // Если все еще ищем игру и не нашли соперника
      if (_bSearching && _sCurrentState !== STATE_MATCH_FOUND) {
        // Показываем ошибку по таймауту
        this._onMatchmakingError({
          message: "Превышено максимальное время поиска",
          critical: true
        });
      }
    }.bind(this), 5 * 60 * 1000); // 5 минут
  };

  this._onConnectionLost = function() {
    console.log("Соединение потеряно. Попытка переподключения...");
    
    // Сбрасываем счетчики при отключении
    _reconnectAttempts = 0;
    _reconnectDelay = 1000;
    
    // Останавливаем поиск, если он активен
    if (_bSearching) {
      this._stopMatchmaking();
    }
    
    // Показываем сообщение о переподключении
    this._showReconnectingMessage();
    
    // Запускаем обработку ошибок сети
    this._handleNetworkIssues();
  };
  
  this._onConnectionError = function(error) {
    console.error("Ошибка соединения:", error);
    
    // Логируем детали ошибки
    var errorDetails = {
      type: error.type || "unknown",
      message: error.message || "Неизвестная ошибка",
      timestamp: Date.now(),
      reconnectAttempts: _reconnectAttempts
    };
    
    console.log("Детали ошибки:", errorDetails);
    
    // Обрабатываем ошибку
    this._handleNetworkIssues();
  };

  this._pingServer = function() {
    if (_bSearching) {
      socket.emit("telegram-ping", { timestamp: Date.now() });
    }
  };

  this._onServerPong = function(data) {
    _iLastServerPing = Date.now();
  };

  this._startMatchmaking = function() {
    if (_sCurrentState !== STATE_IDLE && _sCurrentState !== STATE_ERROR) return;
    
    _bSearching = true;
    _sCurrentState = STATE_SEARCHING;
    _iSearchStartTime = Date.now();
    _iSearchAttempts = 0;
    _iLastRoomCheck = 0;
    
    _oMatchmakingText.text = "Ищем соперника...";
    this._startLoadingDotsAnimation();
    
    // Более частые проверки в начале поиска для быстрого нахождения партии
    var checkInterval = 1500;
    _iMatchmakingInterval = setInterval(function() {
      this._searchForGame();
      
      // Увеличиваем интервал после 10 попыток, чтобы не перегружать сервер
      if (_iSearchAttempts === 10) {
        clearInterval(_iMatchmakingInterval);
        _iMatchmakingInterval = setInterval(this._searchForGame.bind(this), 3000);
      }
    }.bind(this), checkInterval);
    
    // Делаем первый поиск сразу
    this._searchForGame();
  };

  this._searchForGame = function() {
    _iSearchAttempts++;
    
    var now = Date.now();
    
    // Предотвращаем слишком частые запросы к серверу
    if (now - _iLastRoomCheck < 800) {
      return;
    }
    
    _iLastRoomCheck = now;
    
    // Проверяем, что соединение активно
    if (!socket || !socket.connected) {
      console.warn("Соединение с сервером потеряно. Пытаемся восстановить...");
      return;
    }
    
    // Если у нас уже есть созданная комната, обновляем её статус
    if (_bRoomCreated && _sRoomId) {
      socket.emit("telegram-check-room", { 
        roomId: _sRoomId,
        userId: _iTelegramUserId,
        sessionId: _sSessionId
      });
      return;
    }
    
    // Первый шаг - ищем существующую свободную комнату
    socket.emit("telegram-find-game", {
      userId: _iTelegramUserId,
      sessionId: _sSessionId,
      timestamp: now
    });
  };

  this._onMatchmakingStatus = function(data) {
    _iPlayersWaiting = data.waitingPlayers || 0;
    
    // Если нет подходящих комнат и мы еще не создали свою, создаем комнату
    if (!_bRoomCreated && data.noAvailableRooms && _iSearchAttempts > 1) {
      this._createRoom();
    }
    
    // Если ожидающих много, показываем обнадеживающее сообщение
    if (_iPlayersWaiting > 5) {
      _oMatchmakingText.text = "Много игроков онлайн! Подбираем соперника...";
    }
  };

  this._createRoom = function() {
    if (_bRoomCreated) return;
    
    socket.emit("telegram-create-room", {
      userId: _iTelegramUserId,
      sessionId: _sSessionId,
      timestamp: Date.now()
    });
  };

  this._onRoomCreated = function(data) {
    // Проверяем корректность данных
    if (!this._validateRoomData(data)) {
      this._onMatchmakingError({
        message: "Получены некорректные данные о комнате",
        type: "data_error"
      });
      return;
    }
    
    if (data.success) {
      _bRoomCreated = true;
      _sRoomId = data.roomId;
      _sCurrentState = STATE_WAITING_OPPONENT;
      _oMatchmakingText.text = "Ожидаем соперника...";
      
      // В режиме высокой нагрузки сервер может добавить нового игрока сразу после создания комнаты
      if (data.playerJoined) {
        this._onMatchFound(data);
      }
    } else {
      // Если не удалось создать комнату, пробуем еще раз через короткое время
      _oMatchmakingText.text = "Переподключение...";
      setTimeout(function() {
        // Сначала ищем свободную комнату, затем пробуем создать свою
        this._searchForGame();
      }.bind(this), 1000);
    }
  };

  this._onPlayerConnected = function(data) {
    // Обработка события, когда другой игрок подключился к нашей комнате
    if (data.roomId === _sRoomId) {
      this._onMatchFound(data);
    }
  };

  this._onMatchFound = function(data) {
    this._stopMatchmaking();
    
    _sCurrentState = STATE_MATCH_FOUND;
    _oMatchmakingText.text = "Соперник найден! Подключаемся...";
    
    // Имитируем короткую задержку для плавности UX
    setTimeout(function() {
      if (!_ready) { console.warn('[CTelegramRoomList] _startGame игнор: не готово'); return; }
    this._startGame(data.playerId, data.opponentName);
    }.bind(this), 1000);
  };

  this._onMatchmakingError = function(error) {
    console.error("Ошибка матчмейкинга:", error);
    
    // Показываем ошибку пользователю, но продолжаем попытки
    _oMatchmakingText.text = "Произошла ошибка. Пытаемся снова...";
    
    // Сбрасываем статус созданной комнаты в случае ошибки
    if (error.type === "room_error") {
      _bRoomCreated = false;
      _sRoomId = null;
    }
    
    // Если было много попыток или серьезная ошибка, предлагаем перезапустить поиск
    if (_iSearchAttempts > 15 || error.critical) {
      this._stopMatchmaking();
      
      _sCurrentState = STATE_ERROR;
      _oMatchmakingText.text = "Не удается найти игру. Попробуйте снова.";
      
      // Добавляем кнопку повторной попытки
      var oRetryBtn = new CTextButton(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 100,
        s_oSpriteLibrary.getSprite("but_text"),
        "ПОВТОРИТЬ ПОИСК",
        FONT_GAME,
        "#ffffff",
        30,
        "center",
        _oContainer
      );
      oRetryBtn.addEventListener(ON_MOUSE_UP, function() {
        oRetryBtn.unload();
        this._startMatchmaking();
      }, this);
    }
  };

  this._stopMatchmaking = function() {
    _bSearching = false;
    
    if (_iMatchmakingInterval) {
      clearInterval(_iMatchmakingInterval);
      _iMatchmakingInterval = null;
    }
    
    this._stopLoadingDotsAnimation();
  };

  this._onGameStarting = function(data) {
    this._stopMatchmaking();
    
    console.log("CTelegramRoomList: Обработка события telegram-game-starting:", data);
    
    // Принудительно отключаем повторные вызовы
    socket.off("telegram-game-starting");
    
    _oMatchmakingText.text = "Соперник найден! Подключаемся...";
    
    // Дополнительная синхронизация - отправляем подтверждение готовности
    socket.emit("telegram-ready-for-game", {
      gameId: data.gameId,
      userId: _iTelegramUserId,
      opponentId: data.opponentId || "",
      sessionId: _sSessionId
    });
    
    // Записываем gameId в глобальную переменную для дополнительной защиты
    window.MULTIPLAYER_GAME_ID = data.gameId;
    
    // Отправляем событие на глобальном уровне о запуске мультиплеерной игры
    try {
      $(document).trigger("multiplayer_game_launch", {gameId: data.gameId});
    } catch(e) {
      console.error("CTelegramRoomList: Ошибка при отправке события multiplayer_game_launch:", e);
    }
    
    // Добавляем короткую задержку для обеспечения синхронизации
    setTimeout(function() {
      if (!_ready) { 
        console.warn('[CTelegramRoomList] _startGame игнор: не готово'); 
        return; 
      }
      
      console.log("CTelegramRoomList: Запуск игры с ID:", data.gameId);
      // Запускаем игру с переданным gameId
      this._startGame(data.gameId, data.opponentName);
    }.bind(this), 1000);
  };

  this._startGame = function(playerId, opponentName) {
    console.log("CTelegramRoomList: Запуск игры:", {
      playerId: playerId,
      opponentName: opponentName || "Игрок"
    });
    
    // Проверяем, что ID игры не пустой
    if (!playerId) {
      console.error("CTelegramRoomList: ОШИБКА! playerId не определен!");
      playerId = "game_" + Date.now() + "_" + Math.floor(Math.random()*10000); // Генерируем случайный ID
      console.log("CTelegramRoomList: Сгенерирован случайный playerId:", playerId);
    }
    
    // Устанавливаем режим игры на двух игроков
    try {
      // Записываем gameId в глобальную переменную для дополнительной защиты
      window.MULTIPLAYER_GAME_ID = playerId;
      
      // Устанавливаем режим игры явно в нескольких местах для надежности
      window.s_iPlayerMode = GAME_MODE_TWO;
      s_iPlayerMode = GAME_MODE_TWO;
      
      // Сохраняем режим в localStorage для дополнительной надежности
      try {
        localStorage.setItem('billiard_player_mode', GAME_MODE_TWO);
        // Также сохраняем текущий gameId
        localStorage.setItem('billiard_game_id', playerId);
      } catch (e) {
        console.warn("CTelegramRoomList: Не удалось сохранить данные в localStorage:", e);
      }
      
      console.log("CTelegramRoomList: Установлен режим игры s_iPlayerMode =", s_iPlayerMode, 
                 "(GAME_MODE_TWO =", GAME_MODE_TWO, ", GAME_MODE_CPU =", GAME_MODE_CPU, ")");
    } catch (error) {
      console.error("CTelegramRoomList: Ошибка при установке режима игры:", error);
    }
    
    var _this = this;
    this._onExit(function () {
      _this.unload();
      
      // Дополнительная проверка перед запуском игры
      try {
        // Устанавливаем режим игры явно непосредственно перед запуском
        window.s_iPlayerMode = GAME_MODE_TWO;
        s_iPlayerMode = GAME_MODE_TWO;
        
        console.log("CTelegramRoomList: Финальная проверка режима игры:", 
                  "s_iPlayerMode =", s_iPlayerMode,
                  "GAME_MODE_TWO =", GAME_MODE_TWO);
      } catch (error) {
        console.error("CTelegramRoomList: Ошибка при финальной установке режима игры:", error);
      }
      
      // Проверяем, что playerId действительно является строкой, что указывает на gameId для мультиплеера
      if (typeof playerId === 'string' && playerId.length > 5) {
        console.log("CTelegramRoomList: Запуск мультиплеерной игры с ID:", playerId);
      } else {
        console.warn("CTelegramRoomList: Предупреждение! playerId имеет неожиданный формат:", playerId);
        // Если ID имеет неверный формат, используем запасной вариант
        if (!playerId || typeof playerId !== 'string') {
          playerId = "game_" + Date.now() + "_" + Math.floor(Math.random()*1000);
          console.log("CTelegramRoomList: Создан запасной gameId:", playerId);
        }
      }
      
      // Отправляем событие на глобальном уровне о запуске мультиплеерной игры
      try {
        $(document).trigger("multiplayer_game_launch", {gameId: playerId});
      } catch(e) {
        console.error("CTelegramRoomList: Ошибка при отправке события multiplayer_game_launch:", e);
      }
      
      // Запускаем игру с передачей только playerId
      s_oMain.gotoGame(playerId);
      $(s_oMain).trigger("start_session");
      
      // Добавляем событие для уведомления о запуске мультиплеера
      setTimeout(function() {
        $(s_oMain).trigger("multiplayer_game_started");
      }, 500);
    });
  };

  this._onMouseDownButExit = function () {
    var _this = this;
    
    // Останавливаем поиск игры
    this._stopMatchmaking();
    
    // Если была создана комната, отменяем её
    if (_bRoomCreated && _sRoomId) {
      socket.emit("telegram-cancel-room", { 
        roomId: _sRoomId,
        userId: _iTelegramUserId,
        sessionId: _sSessionId
      });
    }
    
    this._onExit(function () {
      _this.unload();
      s_oMain.gotoMenu();
    });
  };

  this._onExit = function (oCbCompleted) {
    if (_oFade) {
      _oFade.visible = true;
      createjs.Tween.get(_oFade)
        .to({ alpha: 1 }, 300, createjs.Ease.cubicOut)
        .call(oCbCompleted);
    } else {
      if (oCbCompleted) {
        oCbCompleted();
      }
    }
  };
  

  this.unload = function () {
    // Останавливаем все таймеры и интервалы
    this._stopMatchmaking();
    
    // Очищаем все интервалы для предотвращения утечек памяти
    if (_oLoadingDotsInterval) {
      clearInterval(_oLoadingDotsInterval);
      _oLoadingDotsInterval = null;
    }
    
    // Удаляем обработчики событий сокета
    socket.off("telegram-match-found");
    socket.off("telegram-create-room-result");
    socket.off("telegram-matchmaking-status");
    socket.off("telegram-error");
    socket.off("telegram-player-connected");
    socket.off("telegram-pong");
    socket.off("disconnect");
    socket.off("connect_error");
    
    // Остановка и очистка всех анимаций Tween
    createjs.Tween.removeAllTweens();
    
    // Отменяем поиск на сервере
    if (_bSearching) {
      socket.emit("telegram-cancel-matchmaking", {
        userId: _iTelegramUserId,
        sessionId: _sSessionId
      });
    }
    
    // Если была создана комната, отменяем её
    if (_bRoomCreated && _sRoomId) {
      socket.emit("telegram-cancel-room", { 
        roomId: _sRoomId,
        userId: _iTelegramUserId,
        sessionId: _sSessionId
      });
    }
    
    if (_oButExit) {
      _oButExit.unload();
      _oButExit = null;
    }
    
    if (_oFade) {
      _oFade.removeAllEventListeners();
      _oFade = null;
    }
    
    if (_oContainer) {
      _oContainer.removeAllChildren();
      _oContainer = null;
    }
    
    if (_oAnimationContainer) {
      _oAnimationContainer.removeAllChildren();
      _oAnimationContainer = null;
    }
    
    // Очищаем все ссылки для сборки мусора
    _oMatchmakingText = null;
    _oBg = null;
    
    s_oStage.removeAllChildren();
    s_oTelegramRoomList = null;

    // Очищаем систему синхронизации
    this._cleanupSync();

    // Очищаем обработку ошибок
    if (_errorTimeout) {
      clearTimeout(_errorTimeout);
      _errorTimeout = null;
    }

    // Очищаем обработку ударов
    this._cleanupShotHandling();
  };

  this.refreshButtonPos = function () {
    if (_oButExit) {
      _oButExit.setPosition(
        _pStartPosExit.x - s_iOffsetX,
        s_iOffsetY + _pStartPosExit.y
      );
    }
  };

  this._reconnectToMatchmaking = function() {
    // В случае повторного подключения к серверу, проверяем существование старой сессии
    socket.emit("telegram-reconnect", {
      userId: _iTelegramUserId,
      sessionId: _sSessionId,
      roomId: _sRoomId
    });
    
    _oMatchmakingText.text = "Восстанавливаем подключение...";
    
    // Ожидаем ответа от сервера в течение 3 секунд
    setTimeout(function() {
      if (!_bRoomCreated && _bSearching) {
        // Если не получили ответ о существовании комнаты, начинаем поиск заново
        _bRoomCreated = false;
        _sRoomId = null;
        this._searchForGame();
      }
    }.bind(this), 3000);
  };

  // Добавим безопасную проверку входящих данных
  this._validateRoomData = function(data) {
    if (!data) {
      console.error("Получены некорректные данные комнаты");
      return false;
    }
    
    // Проверка необходимых полей
    if (typeof data.roomId !== 'string' && typeof data.roomId !== 'number') {
      console.error("Отсутствует или некорректный roomId");
      return false;
    }
    
    return true;
  };

  this._showErrorAndRestart = function(title, message) {
    // Создаем контейнер для ошибки
    var errorContainer = new createjs.Container();
    s_oStage.addChild(errorContainer);
    
    // Добавляем затемненный фон
    var bgShape = new createjs.Shape();
    bgShape.graphics.beginFill("rgba(0,0,0,0.8)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    errorContainer.addChild(bgShape);
    
    // Заголовок ошибки
    var titleText = new createjs.Text(title, "40px " + FONT_GAME, "#ff0000");
    titleText.x = CANVAS_WIDTH / 2;
    titleText.y = CANVAS_HEIGHT / 2 - 80;
    titleText.textAlign = "center";
    errorContainer.addChild(titleText);
    
    // Сообщение ошибки
    var msgText = new createjs.Text(message, "24px " + FONT_GAME, "#ffffff");
    msgText.x = CANVAS_WIDTH / 2;
    msgText.y = CANVAS_HEIGHT / 2;
    msgText.textAlign = "center";
    msgText.lineWidth = 400;
    errorContainer.addChild(msgText);
    
    // Кнопка перезапуска
    var restartBtn = new CTextButton(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 100,
      s_oSpriteLibrary.getSprite("but_text"),
      "ПЕРЕЗАПУСТИТЬ",
      FONT_GAME,
      "#ffffff",
      30,
      "center",
      errorContainer
    );
    
    restartBtn.addEventListener(ON_MOUSE_UP, function() {
      // Перезагружаем страницу
      window.location.reload();
    }, this);
  };

  this._onGameInvitation = function(data) {
    console.log("CTelegramRoomList: Получено приглашение в игру:", data);
    
    // Останавливаем поиск игры, если она идет
    if (_bSearching) {
      this._stopMatchmaking();
    }
    
    // Проверка валидности данных
    if (!data || !data.gameId || !data.fromUserId) {
      console.error("CTelegramRoomList: Получены некорректные данные приглашения");
      return;
    }
    
    var invitationDisplayed = false;
    
    try {
      // Показываем диалог с приглашением
      console.log("CTelegramRoomList: Создаем объект CGameInvitation");
      // Убеждаемся, что класс существует и доступен
      if (typeof CGameInvitation === 'function') {
        var oInvitation = new CGameInvitation({
          gameId: data.gameId,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername || "Игрок",
          fromUserAvatar: data.fromUserAvatar || null,
          message: data.message || data.fromUsername + " приглашает вас сыграть!"
        });
        
        console.log("CTelegramRoomList: CGameInvitation создан успешно");
        
        // Устанавливаем колбэки для кнопок принять/отклонить
        oInvitation.setCallbacks(
          // Принять приглашение
          function() {
            console.log("CTelegramRoomList: Приглашение принято");
            this._acceptInvitation(data.gameId, data.fromUserId);
          }.bind(this),
          // Отклонить приглашение
          function() {
            console.log("CTelegramRoomList: Приглашение отклонено");
            this._declineInvitation(data.gameId, data.fromUserId);
          }.bind(this)
        );
        
        invitationDisplayed = true;
      } else {
        console.error("CTelegramRoomList: Класс CGameInvitation не найден");
      }
    } catch (error) {
      console.error("CTelegramRoomList: Ошибка при создании окна приглашения:", error);
    }
    
    // Если основной способ отображения не сработал, используем резервные
    if (!invitationDisplayed) {
      console.log("CTelegramRoomList: Используем резервный метод отображения приглашения");
      
      // Создаем базовое приглашение прямо на сцене
      this._createBasicInvitation(data);
      
      // Добавим еще одно отображение приглашения через alert
      setTimeout(function() {
        alert("Приглашение в игру от " + (data.fromUsername || "игрока"));
      }, 500);
      
      // Добавим еще одно отображение приглашения через панель уведомлений
      if (typeof Toastify === 'function') {
        Toastify({
          text: "Приглашение в игру от " + (data.fromUsername || "игрока"),
          duration: 10000,
          close: true,
          gravity: "top",
          position: "center",
          stopOnFocus: true,
          style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
            padding: "15px",
            borderRadius: "10px"
          },
          onClick: function() { 
            this._acceptInvitation(data.gameId, data.fromUserId);
          }.bind(this)
        }).showToast();
      }
    }
  };
  
  this._createBasicInvitation = function(data) {
    // Создаем простое приглашение непосредственно на сцене
    var container = new createjs.Container();
    s_oStage.addChild(container);
    
    // Фон приглашения
    var bg = new createjs.Shape();
    bg.graphics.beginFill("rgba(0,0,0,0.8)").drawRoundRect(0, 0, 400, 300, 10);
    bg.x = CANVAS_WIDTH / 2 - 200;
    bg.y = CANVAS_HEIGHT / 2 - 150;
    container.addChild(bg);
    
    // Заголовок
    var title = new createjs.Text("ПРИГЛАШЕНИЕ В ИГРУ", "30px " + FONT_GAME, "#FFFFFF");
    title.textAlign = "center";
    title.x = CANVAS_WIDTH / 2;
    title.y = CANVAS_HEIGHT / 2 - 120;
    container.addChild(title);
    
    // Текст приглашения
    var message = new createjs.Text(
      (data.fromUsername || "Игрок") + " приглашает вас сыграть!",
      "24px " + FONT_GAME,
      "#FFFFFF"
    );
    message.textAlign = "center";
    message.x = CANVAS_WIDTH / 2;
    message.y = CANVAS_HEIGHT / 2 - 50;
    container.addChild(message);
    
    // Кнопка принять
    var acceptBtn = new CTextButton(
      CANVAS_WIDTH / 2 - 80,
      CANVAS_HEIGHT / 2 + 50,
      s_oSpriteLibrary.getSprite("but_text"),
      "ПРИНЯТЬ",
      FONT_GAME,
      "#ffffff",
      24,
      "center",
      container
    );
    
    // Кнопка отклонить
    var declineBtn = new CTextButton(
      CANVAS_WIDTH / 2 + 80,
      CANVAS_HEIGHT / 2 + 50,
      s_oSpriteLibrary.getSprite("but_text"),
      "ОТКЛОНИТЬ",
      FONT_GAME,
      "#ffffff",
      24,
      "center",
      container
    );
    
    var self = this;
    
    acceptBtn.addEventListener(ON_MOUSE_UP, function() {
      self._acceptInvitation(data.gameId, data.fromUserId);
      container.visible = false;
      s_oStage.removeChild(container);
      acceptBtn.unload();
      declineBtn.unload();
    });
    
    declineBtn.addEventListener(ON_MOUSE_UP, function() {
      self._declineInvitation(data.gameId, data.fromUserId);
      container.visible = false;
      s_oStage.removeChild(container);
      acceptBtn.unload();
      declineBtn.unload();
    });
    
    // Воспроизведение звукового сигнала
    if (s_bAudioActive && createjs.Sound.isLoaded("notification")) {
      createjs.Sound.play("notification");
    }
    
    return container;
  };
  
  this._acceptInvitation = function(gameId, fromUserId) {
    // Останавливаем поиск, если он был активен
    this._stopMatchmaking();
    
    // Получаем имя пользователя из Telegram
    var username = "";
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe.user) {
      username = window.Telegram.WebApp.initDataUnsafe.user.first_name || "";
    }
    
    // Отправляем подтверждение на сервер через стандартное API
    socket.emit("telegram-accept-invitation", {
      gameId: gameId,
      userId: _iTelegramUserId,
      username: username,
      opponentId: fromUserId,
      sessionId: _sSessionId
    });
    
    // Также отправляем прямое уведомление отправителю приглашения, 
    // чтобы гарантировать, что он получит оповещение
    socket.emit("telegram-invitation-accepted", {
      gameId: gameId,
      userId: _iTelegramUserId,
      username: username,
      opponentId: fromUserId,
      sessionId: _sSessionId
    });
    
    // Показываем сообщение об ожидании
    _oMatchmakingText.text = "Принимаем приглашение...";
    
    // Подписываемся на событие начала игры
    socket.off("telegram-game-starting"); // Удаляем существующие обработчики
    socket.on("telegram-game-starting", function(gameData) {
      console.log("CTelegramRoomList: Получено событие начала игры:", gameData);
      this._onGameStarting(gameData);
    }.bind(this));
    
    // Отправляем информацию о готовности к игре
    socket.emit("telegram-ready-for-game", {
      gameId: gameId,
      userId: _iTelegramUserId,
      opponentId: fromUserId,
      sessionId: _sSessionId
    });
    
    // Добавляем таймаут на случай, если сервер не ответит - запускаем игру напрямую
    setTimeout(function() {
      if (_oMatchmakingText && _oMatchmakingText.text === "Принимаем приглашение...") {
        console.log("CTelegramRoomList: Попытка запустить игру напрямую по таймауту");
        this._startGame(gameId, "Игрок");
      }
    }.bind(this), 5000);
  };
  
  this._declineInvitation = function(gameId, fromUserId) {
    // Отправляем отказ на сервер
    socket.emit("telegram-decline-invitation", {
      gameId: gameId,
      userId: _iTelegramUserId,
      opponentId: fromUserId,
      sessionId: _sSessionId
    });
  };
  
  this._onInvitationDeclined = function(data) {
    // Показать уведомление об отклонении приглашения
    _oMatchmakingText.text = "Приглашение отклонено";
    setTimeout(function() {
      _oMatchmakingText.text = "Ищем соперника...";
    }, 2000);
  };
  
  this._onInvitationCanceled = function(data) {
    // Показать уведомление об отмене приглашения
    new CAreYouSurePanel(TEXT_INFORMATION, TEXT_INVITATION_CANCELED);
  };
  
  this._onInvitationAccepted = function(data) {
    // Проверяем, относится ли это приглашение к текущему пользователю
    if (data.opponentId !== _iTelegramUserId) {
      console.log("CTelegramRoomList: Игнорируем чужое приглашение");
      return;
    }
    
    console.log("CTelegramRoomList: Приглашение принято игроком:", data);
    
    // Останавливаем поиск, если он активен
    this._stopMatchmaking();
    
    // Показываем сообщение о подключении
    _oMatchmakingText.text = "Приглашение принято! Подключаемся к игре...";

    // Принудительно отключаем повторные вызовы, если они были
    socket.off("telegram-game-starting");
    
    // Записываем gameId в глобальную переменную для дополнительной защиты
    window.MULTIPLAYER_GAME_ID = data.gameId;

    // Отправляем готовность к игре
    socket.emit("telegram-ready-for-game", {
      gameId: data.gameId,
      userId: _iTelegramUserId,
      opponentId: data.userId,
      sessionId: _sSessionId
    });
    
    // Отправляем событие на глобальном уровне о запуске мультиплеерной игры
    try {
      $(document).trigger("multiplayer_game_launch", {gameId: data.gameId});
    } catch(e) {
      console.error("CTelegramRoomList: Ошибка при отправке события multiplayer_game_launch:", e);
    }
    
    // Имитируем короткую задержку для плавности UX и синхронизации
    setTimeout(function() {
      if (!_ready) { 
        console.warn('[CTelegramRoomList] _startGame игнор: не готово'); 
        return;
      }
      
      console.log("CTelegramRoomList: Запуск игры после принятия приглашения, ID:", data.gameId);
      this._startGame(data.gameId, data.username || "Игрок");
    }.bind(this), 1000);
  };

  // Инициализация системы синхронизации
  this._initGameSync = function() {
    // Очищаем буферы при инициализации
    _updateBuffer = [];
    _predictionBuffer = [];
    _lastUpdateTime = Date.now();
    
    // Запускаем интервал синхронизации
    _syncInterval = setInterval(this._syncGameState.bind(this), 16); // ~60 FPS
    
    // Добавляем обработчик для получения обновлений состояния
    socket.on("game-state-update", function(data) {
      if (!_ready) return;
      
      // Добавляем временную метку
      data.timestamp = Date.now();
      
      // Буферизируем обновление
      this._bufferUpdate(data);
      
      // Обновляем последнее известное состояние
      _lastGameState = data;
    }.bind(this));
  };

  // Буферизация обновлений
  this._bufferUpdate = function(update) {
    _updateBuffer.push({
      time: Date.now(),
      data: update
    });
    
    // Ограничиваем размер буфера
    if (_updateBuffer.length > 10) {
      _updateBuffer.shift();
    }
  };

  // Предсказание следующего состояния
  this._predictNextState = function(currentState) {
    if (!currentState) return null;
    
    if (_predictionBuffer.length > 0) {
      var lastPrediction = _predictionBuffer[_predictionBuffer.length - 1];
      return this._calculateNextPosition(lastPrediction);
    }
    return currentState;
  };

  // Расчет следующей позиции
  this._calculateNextPosition = function(lastState) {
    if (!lastState) return null;
    
    var currentTime = Date.now();
    var deltaTime = (currentTime - lastState.timestamp) / 1000; // в секундах
    
    // Создаем копию последнего состояния
    var nextState = JSON.parse(JSON.stringify(lastState));
    
    // Обновляем позиции с учетом физики
    if (nextState.balls) {
      nextState.balls.forEach(function(ball) {
        if (ball.velocity) {
          // Обновляем позицию с учетом скорости
          ball.x += ball.velocity.x * deltaTime;
          ball.y += ball.velocity.y * deltaTime;
          
          // Применяем трение
          ball.velocity.x *= 0.99;
          ball.velocity.y *= 0.99;
        }
      });
    }
    
    nextState.timestamp = currentTime;
    return nextState;
  };

  // Интерполяция между состояниями
  this._interpolateState = function(from, to, alpha) {
    if (!from || !to) return null;
    
    var interpolated = {
      timestamp: from.timestamp + (to.timestamp - from.timestamp) * alpha,
      balls: []
    };
    
    // Интерполируем позиции шаров
    if (from.balls && to.balls) {
      from.balls.forEach(function(fromBall, index) {
        var toBall = to.balls[index];
        if (toBall) {
          interpolated.balls.push({
            id: fromBall.id,
            x: fromBall.x + (toBall.x - fromBall.x) * alpha,
            y: fromBall.y + (toBall.y - fromBall.y) * alpha,
            velocity: {
              x: fromBall.velocity.x + (toBall.velocity.x - fromBall.velocity.x) * alpha,
              y: fromBall.velocity.y + (toBall.velocity.y - fromBall.velocity.y) * alpha
            }
          });
        }
      });
    }
    
    return interpolated;
  };

  // Синхронизация состояния игры
  this._syncGameState = function() {
    if (!_ready || !_lastGameState) return;
    
    var currentTime = Date.now();
    var renderTime = currentTime - 16; // Время рендеринга предыдущего кадра
    
    // Находим два ближайших состояния для интерполяции
    var fromState = null;
    var toState = null;
    
    for (var i = 0; i < _updateBuffer.length - 1; i++) {
      if (_updateBuffer[i].time <= renderTime && _updateBuffer[i + 1].time > renderTime) {
        fromState = _updateBuffer[i].data;
        toState = _updateBuffer[i + 1].data;
        break;
      }
    }
    
    // Если не нашли подходящие состояния, используем предсказание
    if (!fromState || !toState) {
      var predictedState = this._predictNextState(_lastGameState);
      if (predictedState) {
        this._applyGameState(predictedState);
      }
      return;
    }
    
    // Вычисляем коэффициент интерполяции
    var alpha = (renderTime - fromState.timestamp) / (toState.timestamp - fromState.timestamp);
    alpha = Math.max(0, Math.min(1, alpha)); // Ограничиваем от 0 до 1
    
    // Интерполируем состояние
    var interpolatedState = this._interpolateState(fromState, toState, alpha);
    
    // Применяем интерполированное состояние
    if (interpolatedState) {
      this._applyGameState(interpolatedState);
    }
  };

  // Применение состояния игры
  this._applyGameState = function(state) {
    if (!state || !s_oGame) return;
    
    // Обновляем состояние игры
    s_oGame.updateGameState(state);
    
    // Сохраняем состояние для предсказания
    _predictionBuffer.push(state);
    if (_predictionBuffer.length > 5) {
      _predictionBuffer.shift();
    }
  };

  // Очистка системы синхронизации
  this._cleanupSync = function() {
    if (_syncInterval) {
      clearInterval(_syncInterval);
      _syncInterval = null;
    }
    
    _updateBuffer = [];
    _predictionBuffer = [];
    _lastGameState = null;
  };

  // Улучшенная обработка ошибок сети
  this._handleNetworkIssues = function() {
    // Очищаем предыдущий таймаут
    if (_errorTimeout) {
      clearTimeout(_errorTimeout);
      _errorTimeout = null;
    }

    // Проверяем частоту ошибок
    var currentTime = Date.now();
    if (currentTime - _lastErrorTime < 60000) { // В течение минуты
      _errorCount++;
      if (_errorCount > _maxErrorsPerMinute) {
        this._showErrorAndRestart(
          "Слишком много ошибок",
          "Обнаружено слишком много проблем с сетью. Перезапуск игры..."
        );
        return;
      }
    } else {
      _errorCount = 1;
      _lastErrorTime = currentTime;
    }

    // Показываем сообщение о переподключении
    this._showReconnectingMessage();

    // Пытаемся переподключиться с экспоненциальной задержкой
    if (_reconnectAttempts < _maxReconnectAttempts) {
      _reconnectAttempts++;
      _reconnectDelay = Math.min(1000 * Math.pow(2, _reconnectAttempts), 30000);

      console.log(`Попытка переподключения ${_reconnectAttempts}/${_maxReconnectAttempts} через ${_reconnectDelay}мс`);

      _errorTimeout = setTimeout(function() {
        if (socket && !socket.connected) {
          socket.connect();
        }
      }, _reconnectDelay);
    } else {
      this._showErrorAndRestart(
        "Проблемы с соединением",
        "Не удалось установить стабильное соединение. Попробуйте позже."
      );
    }
  };

  // Показ сообщения о переподключении
  this._showReconnectingMessage = function() {
    if (!_oContainer) return;

    // Создаем или обновляем сообщение
    if (!_oReconnectingText) {
      _oReconnectingText = new createjs.Text(
        "Переподключение к серверу...",
        "24px " + FONT_GAME,
        "#ffffff"
      );
      _oReconnectingText.x = CANVAS_WIDTH / 2;
      _oReconnectingText.y = CANVAS_HEIGHT / 2;
      _oReconnectingText.textAlign = "center";
      _oContainer.addChild(_oReconnectingText);

      // Добавляем анимацию точек
      this._startReconnectingAnimation();
    }
  };

  // Анимация точек при переподключении
  this._startReconnectingAnimation = function() {
    if (_oReconnectingInterval) {
      clearInterval(_oReconnectingInterval);
    }

    var dots = 0;
    _oReconnectingInterval = setInterval(function() {
      if (_oReconnectingText) {
        dots = (dots + 1) % 4;
        _oReconnectingText.text = "Переподключение к серверу" + ".".repeat(dots);
      }
    }, 500);
  };

  // Очистка сообщения о переподключении
  this._clearReconnectingMessage = function() {
    if (_oReconnectingInterval) {
      clearInterval(_oReconnectingInterval);
      _oReconnectingInterval = null;
    }

    if (_oReconnectingText) {
      _oContainer.removeChild(_oReconnectingText);
      _oReconnectingText = null;
    }
  };

  // Улучшенное восстановление соединения
  this._onReconnect = function() {
    console.log("Соединение восстановлено");
    
    // Очищаем сообщение о переподключении
    this._clearReconnectingMessage();
    
    // Сбрасываем счетчики
    _reconnectAttempts = 0;
    _reconnectDelay = 1000;
    _errorCount = 0;
    
    // Показываем сообщение об успешном подключении
    if (_oContainer) {
      var successText = new createjs.Text(
        "Соединение восстановлено!",
        "24px " + FONT_GAME,
        "#00ff00"
      );
      successText.x = CANVAS_WIDTH / 2;
      successText.y = CANVAS_HEIGHT / 2;
      successText.textAlign = "center";
      _oContainer.addChild(successText);
      
      // Удаляем сообщение через 2 секунды
      setTimeout(function() {
        if (_oContainer && successText.parent) {
          _oContainer.removeChild(successText);
        }
      }, 2000);
    }
    
    // Возобновляем поиск, если он был активен
    if (_bSearching) {
      this._startMatchmaking();
    }
  };

  // Оптимизированная обработка ударов
  this._initShotHandling = function() {
    // Очищаем буфер ударов
    _shotBuffer = [];
    _lastProcessedShotTime = 0;

    // Обработчик начала удара
    socket.on("telegram-shot-start", function(data) {
      if (!_ready) return;
      
      // Проверяем состояние стола с учетом лага
      if (s_oTable && !s_oTable.isReadyForShot()) {
        console.log("CTelegramRoomList: Блокировка удара - стол не готов к удару");
        return;
      }
      
      var currentTime = Date.now();
      if (currentTime - _iLastShotTime < MIN_SHOT_INTERVAL) {
        console.log("CTelegramRoomList: Игнорируем слишком частый удар");
        return;
      }
      
      _bShotInProgress = true;
      _iShotStartTime = currentTime;

      // Добавляем информацию о лаге
      data.localTimestamp = currentTime;
      data.networkLatency = this._calculateNetworkLatency();
    }.bind(this));

    // Оптимизированный обработчик ударов
    socket.on("telegram-shot", function(data) {
      if (!_ready || !_bShotInProgress) {
        console.log("CTelegramRoomList: Игнорируем недопустимый удар");
        return;
      }

      // Проверяем активность shotpower с учетом лага
      if (s_oTable && s_oTable.isShotPowerActive()) {
        console.log("CTelegramRoomList: Блокировка случайного удара - активен shotpower");
        return;
      }

      var currentTime = Date.now();
      var shotDuration = currentTime - _iShotStartTime;

      if (shotDuration < MIN_SHOT_DURATION) {
        console.log("CTelegramRoomList: Игнорируем слишком короткий удар");
        _bShotInProgress = false;
        return;
      }

      _iLastShotTime = currentTime;
      _bShotInProgress = false;

      // Добавляем удар в буфер
      this._bufferShot({
        timestamp: currentTime,
        data: data,
        localTimestamp: _iShotStartTime,
        networkLatency: this._calculateNetworkLatency()
      });

      // Обрабатываем удар
      this._processShot(data);
    }.bind(this));

    // Обработчик отмены удара
    socket.on("telegram-shot-cancel", function() {
      _bShotInProgress = false;
      // Очищаем буфер ударов при отмене
      _shotBuffer = [];
    });
  };

  // Буферизация ударов
  this._bufferShot = function(shotData) {
    _shotBuffer.push(shotData);
    
    // Ограничиваем размер буфера
    if (_shotBuffer.length > _maxShotBufferSize) {
      _shotBuffer.shift();
    }
  };

  // Обработка удара с компенсацией лага
  this._processShot = function(shotData) {
    if (!s_oGame) return;

    var currentTime = Date.now();
    var latency = currentTime - shotData.timestamp;

    // Компенсируем лаг
    if (_shotCompensationEnabled && latency > 0) {
      // Предсказываем текущее состояние шаров
      var predictedState = this._predictBallPositions(shotData, latency);
      if (predictedState) {
        shotData.compensatedState = predictedState;
      }
    }

    // Отправляем событие удара в игру
    s_oGame.onShotReceived(shotData);

    // Обновляем время последнего обработанного удара
    _lastProcessedShotTime = currentTime;
  };

  // Предсказание позиций шаров
  this._predictBallPositions = function(shotData, latency) {
    if (!_shotPredictionEnabled || !shotData.balls) return null;

    var predictedState = {
      timestamp: Date.now(),
      balls: []
    };

    // Предсказываем позиции каждого шара
    shotData.balls.forEach(function(ball) {
      if (ball.velocity) {
        var predictedBall = {
          id: ball.id,
          x: ball.x + (ball.velocity.x * latency / 1000),
          y: ball.y + (ball.velocity.y * latency / 1000),
          velocity: {
            x: ball.velocity.x,
            y: ball.velocity.y
          }
        };
        predictedState.balls.push(predictedBall);
      }
    });

    return predictedState;
  };

  // Расчет сетевого лага
  this._calculateNetworkLatency = function() {
    var currentTime = Date.now();
    var latency = currentTime - _iLastServerPing;
    return Math.max(0, latency);
  };

  // Очистка обработки ударов
  this._cleanupShotHandling = function() {
    _shotBuffer = [];
    _lastProcessedShotTime = 0;
    _bShotInProgress = false;
  };

  s_oTelegramRoomList = this;

  this._init();
}

var s_oTelegramRoomList = null;
