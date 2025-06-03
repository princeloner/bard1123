function CPlayByIdRoom() {
  // Константы состояний комнаты
  const ROOM_STATES = {
    IDLE: 'IDLE',
    WAITING_FOR_OPPONENT: 'WAITING_FOR_OPPONENT',
    INVITATION_RECEIVED: 'INVITATION_RECEIVED',
    GAME_STARTING: 'GAME_STARTING',
    ERROR: 'ERROR'
  };

  // Переменные для контроля ударов
  var _bShotInProgress = false;
  var _iShotStartTime = 0;
  var _iLastShotTime = 0;
  const MIN_SHOT_DURATION = 100;
  const MIN_SHOT_INTERVAL = 500;
  
  var _currentState = ROOM_STATES.IDLE;
  var _ready = false;
  var _pStartPosExit;

  var _oBg;
  var _oButExit;
  var _oFade;
  var _oContainer;
  var _oTitleText;
  var _oIdInputContainer;
  var _oUserIdText;
  var _oCopyButton;
  var _oInviteButton;
  var _oPlayButton;
  var _oErrorText;
  var _oLoadingText;
  var _oStatusText;
  var _oIdSection;
  var _iLastServerPing = 0;
  var _bFindingOpponent = false;
  
  // Данные пользователя
  var _iTelegramUserId = null;
  var _sTelegramUsername = null;
  var _sOpponentId = null;
  var _sSessionId = generateSessionId();
  var _sOpponentName = null;

  var _fRequestFullScreen = null;
  var _fCancelFullScreen = null;

  this._init = function () {
    // Принудительно сбрасываем флаги и состояния для нового экземпляра
    _bFindingOpponent = false;
    _bInvitationReceived = false;
    _sInvitationGameId = null;
    this._currentGameId = null;
    this._invitationTimeout = null;
    this._inputAnimationInterval = null;
    this._waitIndicator = null;
    this._invitationContainer = null;
  
    //_oBg = createBitmap(s_oSpriteLibrary.getSprite("bg_menu"));
    //s_oStage.addChild(_oBg);

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

    // Инициализируем интерфейс комнаты по ID
    this._createPlayByIdUI();

    _oFade = new createjs.Shape();
    _oFade.graphics
      .beginFill("black")
      .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    s_oStage.addChild(_oFade);

    createjs.Tween.get(_oFade).to({ alpha: 0 }, 1000, createjs.Ease.cubicOut);
    
    // Инициализация базовых переменных
    this._checkVariables();
    
    // Инициализируем соединение с сервером
    this._initSocketConnection();
    
    sizeHandler();
    _ready = true;
    
    // Получаем и отображаем ID пользователя из Telegram
    this._fetchUserData();
    
    console.log("CPlayByIdRoom: Инициализация завершена");
  };

  // Метод для проверки и инициализации переменных класса
  this._checkVariables = function() {
    // Флаг, указывающий, что получено приглашение
    if (typeof _bInvitationReceived === 'undefined') {
      _bInvitationReceived = false;
    }
    
    // ID игры для полученного приглашения
    if (typeof _sInvitationGameId === 'undefined') {
      _sInvitationGameId = null;
    }
    
    // Текущий ID игры (для отслеживания состояния)
    if (typeof this._currentGameId === 'undefined') {
      this._currentGameId = null;
    }
    
    // Уникальный ID сессии
    if (typeof _sSessionId === 'undefined' || !_sSessionId) {
      _sSessionId = "session_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
      console.log("CPlayByIdRoom: Создана новая сессия:", _sSessionId);
    }
    
    // Контейнер с приглашением
    if (typeof this._invitationContainer === 'undefined') {
      this._invitationContainer = null;
    }
    
    // Таймаут для приглашения
    if (typeof this._invitationReceivedTimeout === 'undefined') {
      this._invitationReceivedTimeout = null;
    }
    
    // Интервал анимации поля ввода
    if (typeof this._inputAnimationInterval === 'undefined') {
      this._inputAnimationInterval = null;
    }
    
    // Сбрасываем флаг поиска оппонента при инициализации
    _bFindingOpponent = false;
    
    // Инициализируем время последнего пинга сервера
    _iLastServerPing = Date.now();
    
    console.log("CPlayByIdRoom: Переменные инициализированы");
  };

  // Генерирует уникальный идентификатор сессии для предотвращения дублирования
  function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  this._createPlayByIdUI = function() {
    _oContainer = new createjs.Container();
    s_oStage.addChild(_oContainer);

    // Добавляем затемненный градиентный фон для UI
    var oUIBg = new createjs.Shape();
    var gradient = oUIBg.graphics.beginLinearGradientFill(
      ["rgba(33,33,33,0.9)", "rgba(22,22,22,0.95)"], 
      [0, 1], 
      0, 0, 0, 600
    );
    oUIBg.graphics.drawRoundRect(CANVAS_WIDTH / 2 - 220, 100, 440, 450, 15);
    
    // Добавляем внешнюю подсветку
    oUIBg.shadow = new createjs.Shadow("#22A7F0", 0, 0, 20);
    _oContainer.addChild(oUIBg);

    // Заголовок с эффектом
    _oTitleText = new createjs.Text(TEXT_PLAY_BY_ID[s_iCurLang], "bold 40px " + FONT_GAME, "#ffffff");
    _oTitleText.x = CANVAS_WIDTH / 2;
    _oTitleText.y = 140;
    _oTitleText.textAlign = "center";
    _oTitleText.shadow = new createjs.Shadow("rgba(0,149,255,0.5)", 0, 0, 10);
    _oContainer.addChild(_oTitleText);

    // Секция с ID пользователя
    _oIdSection = new createjs.Container();
    _oIdSection.x = CANVAS_WIDTH / 2;
    _oIdSection.y = 220;
    _oContainer.addChild(_oIdSection);

    // Фон секции ID
    var oIdBg = new createjs.Shape();
    oIdBg.graphics
      .beginFill("rgba(55,55,55,0.7)")
      .drawRoundRect(-170, -25, 340, 70, 10);
    oIdBg.graphics
      .beginStroke("#22A7F0")
      .setStrokeStyle(2)
      .drawRoundRect(-170, -25, 340, 70, 10);
    _oIdSection.addChild(oIdBg);

    // Показываем ID пользователя
    var oIdInfoText = new createjs.Text(TEXT_YOUR_ID[s_iCurLang] + ":", "bold 24px " + FONT_GAME, "#ffffff");
    oIdInfoText.x = -140;
    oIdInfoText.y = 0;
    oIdInfoText.textAlign = "left";
    oIdInfoText.textBaseline = "middle";
    _oIdSection.addChild(oIdInfoText);

    _oUserIdText = new createjs.Text("Загрузка...", "bold 24px " + FONT_GAME, "#22A7F0");
    _oUserIdText.x = -20;
    _oUserIdText.y = 0;
    _oUserIdText.textAlign = "left";
    _oUserIdText.textBaseline = "middle";
    _oIdSection.addChild(_oUserIdText);

    // Кнопка копирования ID
    var oCopyBtnBg = new createjs.Shape();
    oCopyBtnBg.graphics
      .beginFill("#22A7F0")
      .drawRoundRect(0, 0, 100, 36, 8);
    
    var oCopyContainer = new createjs.Container();
    oCopyContainer.x = 70;
    oCopyContainer.y = -18;
    oCopyContainer.addChild(oCopyBtnBg);
    
    var oCopyText = new createjs.Text("Копировать", "14px " + FONT_GAME, "#ffffff");
    oCopyText.x = 50;
    oCopyText.y = 18;
    oCopyText.textAlign = "center";
    oCopyText.textBaseline = "middle";
    oCopyContainer.addChild(oCopyText);
    
    _oIdSection.addChild(oCopyContainer);
    
    // Анимация при наведении
    oCopyContainer.on("mouseover", function() {
      oCopyBtnBg.graphics.clear().beginFill("#1A96DE").drawRoundRect(0, 0, 100, 36, 8);
    });
    
    oCopyContainer.on("mouseout", function() {
      oCopyBtnBg.graphics.clear().beginFill("#22A7F0").drawRoundRect(0, 0, 100, 36, 8);
    });
    
    // Обработчик копирования
    oCopyContainer.on("click", function() {
      if (_iTelegramUserId) {
        var tempInput = document.createElement("input");
        document.body.appendChild(tempInput);
        tempInput.value = _iTelegramUserId.toString();
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        
        // Анимация успешного копирования
        oCopyText.text = "Скопировано!";
        createjs.Tween.get(oCopyContainer).wait(1500).call(function() {
          oCopyText.text = "Копировать";
        });
      }
    });

    // Делаем контейнер кликабельным
    oCopyContainer.cursor = "pointer";
    _oCopyButton = oCopyContainer;

    // Инструкция для пользователя с подсветкой 
    var oInstructionBg = new createjs.Shape();
    oInstructionBg.graphics
      .beginFill("rgba(0,0,0,0.2)")
      .drawRoundRect(CANVAS_WIDTH / 2 - 180, 260, 360, 60, 8);
    _oContainer.addChild(oInstructionBg);
    
    var oInstructionText = new createjs.Text("Отправьте свой ID другу и введите\nID вашего друга ниже:", "bold 20px " + FONT_GAME, "#cccccc");
    oInstructionText.x = CANVAS_WIDTH / 2;
    oInstructionText.y = 280;
    oInstructionText.textAlign = "center";
    oInstructionText.lineHeight = 28;
    _oContainer.addChild(oInstructionText);

    // Создаем поле ввода для ID оппонента (HTML элемент)
    this._createIdInput();
    
    // Кнопка "Пригласить" с современным стилем
    _oInviteButton = new CTextButton(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 110,
      s_oSpriteLibrary.getSprite("but_text"),
      TEXT_INVITE[s_iCurLang],
      FONT_GAME,
      "#ffffff",
      30,
      "center",
      _oContainer
    );
    _oInviteButton.addEventListener(ON_MOUSE_UP, this._onInviteClicked, this);

    // Добавляем небольшую пульсацию к кнопке
    createjs.Tween.get(_oInviteButton, {loop: true})
      .to({scaleX: 1.05, scaleY: 1.05}, 800, createjs.Ease.quadInOut)
      .to({scaleX: 1, scaleY: 1}, 800, createjs.Ease.quadInOut);
    
    // Кнопка "Играть с другом" (изначально скрыта) с современным стилем
    _oPlayButton = new CTextButton(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 170,
      s_oSpriteLibrary.getSprite("but_text"),
      TEXT_PLAY_WITH_FRIEND[s_iCurLang],
      FONT_GAME,
      "#ffffff",
      30,
      "center",
      _oContainer
    );
    _oPlayButton.addEventListener(ON_MOUSE_UP, this._onPlayWithFriendClicked, this);
    _oPlayButton.setVisible(false); // Изначально скрыта
    
    // Текст для ошибок с анимацией появления
    _oErrorText = new createjs.Text("", "20px " + FONT_GAME, "#FF5555");
    _oErrorText.x = CANVAS_WIDTH / 2;
    _oErrorText.y = CANVAS_HEIGHT / 2 + 220;
    _oErrorText.textAlign = "center";
    _oErrorText.alpha = 0;
    _oContainer.addChild(_oErrorText);
    
    // Статусный текст внизу с иконкой
    var oStatusContainer = new createjs.Container();
    oStatusContainer.x = CANVAS_WIDTH / 2;
    oStatusContainer.y = CANVAS_HEIGHT - 80;
    _oContainer.addChild(oStatusContainer);
    
    // Индикатор соединения
    var oConnectionDot = new createjs.Shape();
    oConnectionDot.graphics.beginFill("#22A7F0").drawCircle(0, 0, 5);
    oConnectionDot.x = -80;
    oConnectionDot.y = 0;
    oStatusContainer.addChild(oConnectionDot);
    
    _oStatusText = new createjs.Text("", "18px " + FONT_GAME, "#aaaaaa");
    _oStatusText.x = -70;
    _oStatusText.y = 0;
    _oStatusText.textAlign = "left";
    _oStatusText.textBaseline = "middle";
    oStatusContainer.addChild(_oStatusText);
    
    // Анимация мигания индикатора соединения
    createjs.Tween.get(oConnectionDot, {loop: true})
      .to({alpha: 0.3}, 1000, createjs.Ease.quadInOut)
      .to({alpha: 1}, 1000, createjs.Ease.quadInOut);
    
    // Текст загрузки с улучшенным стилем
    _oLoadingText = new createjs.Text("", "bold 24px " + FONT_GAME, "#ffffff");
    _oLoadingText.x = CANVAS_WIDTH / 2;
    _oLoadingText.y = CANVAS_HEIGHT / 2 + 40;
    _oLoadingText.textAlign = "center";
    _oLoadingText.visible = false;
    _oLoadingText.shadow = new createjs.Shadow("rgba(0,0,0,0.5)", 2, 2, 4);
    _oContainer.addChild(_oLoadingText);
    
    // Обновляем статус и проверяем соединение
    setInterval(function() {
      var serverLag = Date.now() - _iLastServerPing;
      if (serverLag < 2000) {
        _oStatusText.text = "Соединение: хорошее";
        _oStatusText.color = "#66BB6A";
        oConnectionDot.graphics.clear().beginFill("#66BB6A").drawCircle(0, 0, 5);
      } else if (serverLag < 5000) {
        _oStatusText.text = "Соединение: среднее";
        _oStatusText.color = "#FFA726";
        oConnectionDot.graphics.clear().beginFill("#FFA726").drawCircle(0, 0, 5);
      } else {
        _oStatusText.text = "Соединение: слабое";
        _oStatusText.color = "#EF5350";
        oConnectionDot.graphics.clear().beginFill("#EF5350").drawCircle(0, 0, 5);
      }
    }, 1000);
  };

  this._createIdInput = function() {
    // Создаем элемент input напрямую без использования DOMElement
    var oInputElement = document.createElement("input");
    oInputElement.id = "opponent-id-input";
    oInputElement.type = "text";
    oInputElement.placeholder = TEXT_ENTER_OPPONENT_ID[s_iCurLang];
    oInputElement.maxLength = 20;
    oInputElement.style.fontSize = "18px";
    oInputElement.style.padding = "12px 15px";
    oInputElement.style.width = "250px";
    oInputElement.style.textAlign = "center";
    oInputElement.style.borderRadius = "8px";
    oInputElement.style.border = "2px solid #22A7F0";
    oInputElement.style.backgroundColor = "rgba(40,40,40,0.8)";
    oInputElement.style.color = "#ffffff";
    oInputElement.style.boxShadow = "0 0 10px rgba(34,167,240,0.5)";
    oInputElement.style.outline = "none";
    oInputElement.style.position = "absolute";
    oInputElement.style.transition = "all 0.3s ease";
    
    // Стили при фокусе
    oInputElement.addEventListener("focus", function() {
      this.style.boxShadow = "0 0 15px rgba(34,167,240,0.8)";
      this.style.border = "2px solid #1A96DE";
    });
    
    oInputElement.addEventListener("blur", function() {
      this.style.boxShadow = "0 0 10px rgba(34,167,240,0.5)";
      this.style.border = "2px solid #22A7F0";
    });
    
    // Добавляем элемент напрямую в DOM
    document.body.appendChild(oInputElement);
    
    // Позиционируем элемент с помощью CSS
    oInputElement.style.left = (CANVAS_WIDTH / 2 - 125) + "px";
    oInputElement.style.top = (CANVAS_HEIGHT / 2) + "px";
    oInputElement.style.zIndex = "1000";
    
    // Сохраняем ссылку на элемент
    _oIdInputContainer = oInputElement;
  };

  this._fetchUserData = function() {
    // Получаем Telegram-данные пользователя
    var telegramUser = null;
    if (window.Telegram && window.Telegram.WebApp) {
      telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
      console.log("Получены данные пользователя Telegram:", telegramUser);
      
      if (telegramUser) {
        _iTelegramUserId = telegramUser.id;
        _sTelegramUsername = telegramUser.username || "user_" + telegramUser.id;
        var firstName = telegramUser.first_name || _sTelegramUsername;
        
        // Отображаем ID пользователя
        _oUserIdText.text = _iTelegramUserId.toString();
        
        // Регистрируем пользователя в базе данных
        console.log("Регистрируем пользователя:", {
          userId: _iTelegramUserId,
          username: _sTelegramUsername,
          firstName: firstName,
          sessionId: _sSessionId
        });
        
        socket.emit("telegram-register-user", {
          userId: _iTelegramUserId,
          username: _sTelegramUsername,
          firstName: firstName,
          sessionId: _sSessionId
        });
      } else {
        console.error("Не удалось получить данные пользователя Telegram");
        _oErrorText.text = "Не удалось получить данные Telegram";
        this._showErrorWithAnimation();
        
        // Устанавливаем тестовый ID для отладки
        _iTelegramUserId = "guest_" + Math.floor(Math.random() * 100000);
        _oUserIdText.text = _iTelegramUserId;
      }
    } else {
      console.warn("Telegram WebApp недоступен. Используем гостевой режим");
      // Fallback для тестирования без Telegram
      _iTelegramUserId = "guest_" + Math.floor(Math.random() * 100000);
      _sTelegramUsername = "Guest User";
      var firstName = "Guest User";
      _oUserIdText.text = _iTelegramUserId;
      
      socket.emit("telegram-register-user", {
        userId: _iTelegramUserId,
        username: _sTelegramUsername,
        firstName: firstName,
        sessionId: _sSessionId
      });
    }
  };

  this._initSocketConnection = function() {
    // Устанавливаем обработчики событий для игры по ID
    socket.on("telegram-id-game-response", function(data) { 
      console.log("CPlayByIdRoom: Ответ на запрос игры:", data);
      console.log("CPlayByIdRoom: Информация о противнике:", {
        opponentName: data.opponentName,
        firstName: data.firstName,
        username: data.username
      });
      if (_ready) this._onGameResponseReceived(data); 
      else console.warn('[CPlayByIdRoom] _onGameResponseReceived игнор: не готово'); 
    }.bind(this));
    
    // Добавляем обработчик для получения информации о пользователе
    socket.on("telegram-user-info", function(data) {
      console.log("CPlayByIdRoom: Получена информация о пользователе:", data);
      
      if (data && data.success && data.userInfo && data.userInfo.firstName) {
        console.log("CPlayByIdRoom: Обновляем имя оппонента из запроса информации:", data.userInfo.firstName);
        
        // Обновляем имя оппонента если получили first_name
        s_oTelegramOpponentName = data.userInfo.firstName;
        
        // Если игра уже запущена, обновляем имя оппонента в интерфейсе
        if (s_oGame) {
          try {
            // Используем специальный метод для обновления имени оппонента
            s_oGame.updateOpponentName(data.userInfo.firstName);
          } catch (e) {
            console.error("CPlayByIdRoom: Ошибка при обновлении имени оппонента:", e);
          }
        }
      }
    });
    
    socket.on("telegram-opponent-connected", function(data) { 
      console.log("CPlayByIdRoom: Соперник подключился:", data);
      console.log("CPlayByIdRoom: Информация о противнике:", {
        opponentName: data.opponentName,
        firstName: data.firstName,
        username: data.username
      });
      if (_ready) this._onOpponentConnected(data); 
      else console.warn('[CPlayByIdRoom] _onOpponentConnected игнор: не готово'); 
    }.bind(this));
    
    socket.on("telegram-id-game-error", function(error) { 
      console.error("CPlayByIdRoom: Ошибка игры по ID:", error);
      if (_ready) this._onGameError(error); 
      else console.warn('[CPlayByIdRoom] _onGameError игнор: не готово'); 
    }.bind(this));
    
    socket.on("telegram-pong", function(data) { 
      if (_ready) _iLastServerPing = Date.now(); 
      else console.warn('[CPlayByIdRoom] _onServerPong игнор: не готово'); 
    });
    
    socket.on("disconnect", function() { 
      console.warn("Соединение с сервером потеряно");
      if (_ready) this._onConnectionLost(); 
      else console.warn('[CPlayByIdRoom] _onConnectionLost игнор: не готово'); 
    }.bind(this));
    
    // Обработчик для приглашений в игру
    socket.on("telegram-game-invitation", function(data) {
      console.log("CPlayByIdRoom: Получено приглашение в игру:", data);
      console.log("CPlayByIdRoom: Информация об отправителе:", {
        fromUsername: data.fromUsername,
        firstName: data.firstName,
        username: data.username
      });
      if (_ready) this._onGameInvitationReceived(data);
      else console.warn('[CPlayByIdRoom] _onGameInvitationReceived игнор: не готово');
    }.bind(this));
    
    // Обработчик для принятия приглашения
    socket.on("telegram-invitation-accepted", function(data) {
      console.log("CPlayByIdRoom: Приглашение принято игроком:", data);
      console.log("CPlayByIdRoom: Информация о принявшем игроке:", {
        username: data.username,
        firstName: data.firstName
      });
      if (_ready) this._onInvitationAccepted(data);
      else console.warn('[CPlayByIdRoom] _onInvitationAccepted игнор: не готово');
    }.bind(this));
    
    // Обработчик для отклонения приглашения
    socket.on("telegram-invitation-declined", function(data) {
      console.log("CPlayByIdRoom: Приглашение отклонено:", data);
      if (_ready) this._onInvitationDeclined(data);
      else console.warn('[CPlayByIdRoom] _onInvitationDeclined игнор: не готово');
    }.bind(this));
    
    // Обработчик для отмены приглашения
    socket.on("telegram-invitation-canceled", function(data) {
      console.log("CPlayByIdRoom: Приглашение отменено:", data);
      if (_ready) this._onInvitationCanceled(data);
      else console.warn('[CPlayByIdRoom] _onInvitationCanceled игнор: не готово');
    }.bind(this));
    
    // Обработчик начала игры
    socket.on("telegram-game-starting", function(data) { 
      console.log("CPlayByIdRoom: Получено уведомление о начале игры:", data);
      console.log("CPlayByIdRoom: Информация об оппоненте:", {
        opponentName: data.opponentName,
        firstName: data.firstName,
        fromUsername: data.fromUsername
      });
      if (_ready) this._onGameStarting(data);
      else console.warn('[CPlayByIdRoom] _onGameStarting игнор: не готово');
    }.bind(this));
    
    // Обработчик нового события для запуска игры
    socket.on("telegram-start-multiplayer-game", function(data) {
      console.log("CPlayByIdRoom: Получено уведомление о запуске мультиплеерной игры:", data);
      if (!_ready) {
        console.warn('[CPlayByIdRoom] telegram-start-multiplayer-game игнор: не готово');
        return;
      }
      
      // Сохраняем роль игрока (player1 или player2)
      if (data && data.pid) {
        window.PLAYER_ROLE = data.pid;
        console.log("CPlayByIdRoom: Установлена роль игрока:", data.pid);
      }
    }.bind(this));
    
    // Добавляем обработчик синхронизации состояния удара
    socket.on("shot-state-sync", function(data) {
      if (!_ready) return;
      
      // Проверяем активность shotpower
      if (ENABLE_CHECK_ORIENTATION && s_oTable && s_oTable.isShotPowerActive()) {
        console.log("CPlayByIdRoom: Блокировка случайного удара - активен shotpower");
        return;
      }
      
      // Проверяем состояние стола
      if (s_oTable && !s_oTable.isReadyForShot()) {
        console.log("CPlayByIdRoom: Блокировка удара - стол не готов к удару");
        return;
      }
      
      // Добавляем защиту от слишком частых ударов
      var now = Date.now();
      if (now - this._lastShotTime < 500) { // Минимальный интервал между ударами 500мс
        console.log("CPlayByIdRoom: Блокировка удара - слишком частые удары");
        return;
      }
      this._lastShotTime = now;
      
      // Продолжаем обработку удара если все проверки пройдены
      // ...existing code...
    }.bind(this));
    
    // Добавляем обработчики для контроля ударов
    socket.on("telegram-shot-start", function(data) {
      if (!_ready) return;
      
      // Проверяем состояние стола
      if (s_oTable && !s_oTable.isReadyForShot()) {
        console.log("CPlayByIdRoom: Блокировка удара - стол не готов к удару");
        return;
      }
      
      var currentTime = Date.now();
      if (currentTime - _iLastShotTime < MIN_SHOT_INTERVAL) {
        console.log("CPlayByIdRoom: Игнорируем слишком частый удар");
        return;
      }
      
      _bShotInProgress = true;
      _iShotStartTime = currentTime;
    });

    socket.on("telegram-shot", function(data) {
      if (!_ready || !_bShotInProgress) {
        console.log("CPlayByIdRoom: Игнорируем недопустимый удар");
        return;
      }

      // Проверяем активность shotpower
      if (s_oTable && s_oTable.isShotPowerActive()) {
        console.log("CPlayByIdRoom: Блокировка случайного удара - активен shotpower");
        return;
      }

      var currentTime = Date.now();
      var shotDuration = currentTime - _iShotStartTime;

      if (shotDuration < MIN_SHOT_DURATION) {
        console.log("CPlayByIdRoom: Игнорируем слишком короткий удар");
        _bShotInProgress = false;
        return;
      }

      _iLastShotTime = currentTime;
      _bShotInProgress = false;

      // Отправляем событие удара в игру
      if (s_oGame) {
        s_oGame.onShotReceived(data);
      }
    });

    socket.on("telegram-shot-cancel", function() {
      _bShotInProgress = false;
    });

    // Начинаем регулярно проверять соединение с сервером
    setInterval(function() {
      socket.emit("telegram-ping", { timestamp: Date.now() });
    }, 5000);
  };

  this._onInviteClicked = function() {
    // Получаем ID противника из поля ввода
    if (!_oIdInputContainer) {
      console.error("Не удалось найти элемент ввода ID");
      return;
    }
    
    // Проверяем, что поле не пустое
    var opponentId = _oIdInputContainer.value.trim();
    if (!opponentId) {
      _oErrorText.text = "Введите ID противника";
      this._showErrorWithAnimation();
      return;
    }
    
    // Проверяем, что пользователь не пытается играть с самим собой
    if (opponentId === _iTelegramUserId.toString()) {
      _oErrorText.text = "Вы не можете играть с самим собой";
      this._showErrorWithAnimation();
      return;
    }
    
    // Проверяем, не в процессе ли мы уже ожидания
    if (_bFindingOpponent) {
      console.log("CPlayByIdRoom: Уже идет поиск соперника");
      return;
    }
    
    // Сохраняем ID оппонента
    _sOpponentId = opponentId;
    
    // Показываем загрузку
    _oLoadingText.text = "Создаем игровую комнату...";
    _oLoadingText.visible = true;
    _bFindingOpponent = true;
    
    // Скрываем ошибку, если была
    _oErrorText.text = "";
    
    // Генерируем уникальный ID игры со специфичным форматом и достаточной случайностью
    var timestamp = Date.now();
    var random = Math.floor(Math.random() * 1000000000);
    var gameId = "id_game_" + timestamp + "_" + _iTelegramUserId + "_" + random;
    
    console.log("CPlayByIdRoom: Создаем игровую комнату:", {
      userId: _iTelegramUserId,
      username: _sTelegramUsername,
      opponentId: _sOpponentId,
      gameId: gameId,
      sessionId: _sSessionId
    });
    
    // Сначала создаем комнату на сервере используя существующий API
    socket.emit("telegram-create-room", {
      userId: _iTelegramUserId,
      username: _sTelegramUsername,
      opponentId: _sOpponentId,
      sessionId: _sSessionId,
      gameId: gameId
    });
    
    // Создаем интерфейс ожидания, не дожидаясь ответа от сервера
    this._showWaitingInterface(gameId);
    
    // Показываем анимацию загрузки
    this._startLoadingAnimation();
    
    // Устанавливаем таймаут на случай, если сервер не ответит
    setTimeout(function() {
      if (_bFindingOpponent && this._currentGameId === gameId) {
        console.warn("CPlayByIdRoom: Таймаут при создании комнаты:", gameId);
        _oLoadingText.visible = false;
        _oErrorText.text = "Превышено время ожидания сервера";
        this._showErrorWithAnimation();
        _bFindingOpponent = false;
      }
    }.bind(this), 30000);
  };

  // Показывает интерфейс ожидания оппонента
  this._showWaitingInterface = function(gameId) {
    console.log("CPlayByIdRoom: Показываем интерфейс ожидания для комнаты:", gameId);
    
    // Меняем статус загрузки
    _oLoadingText.text = "Ожидаем подключения соперника...";
    _oLoadingText.visible = true;
    
    // Создаем индикатор ожидания
    var waitContainer = new createjs.Container();
    _oContainer.addChild(waitContainer);
    waitContainer.x = CANVAS_WIDTH / 2;
    waitContainer.y = CANVAS_HEIGHT / 2 + 60;
    
    // Улучшенная анимация ожидания
    var pulseCircle = new createjs.Shape();
    pulseCircle.graphics.beginFill("#22A7F0").drawCircle(0, 0, 15);
    pulseCircle.alpha = 0.2;
    waitContainer.addChild(pulseCircle);
    
    var innerCircle = new createjs.Shape();
    innerCircle.graphics.beginFill("#22A7F0").drawCircle(0, 0, 8);
    waitContainer.addChild(innerCircle);
    
    // Создаем пульсирующие анимации
    createjs.Tween.get(pulseCircle, {loop: true})
      .to({scaleX: 3, scaleY: 3, alpha: 0}, 1500, createjs.Ease.cubicOut)
      .set({scaleX: 1, scaleY: 1, alpha: 0.2});
      
    createjs.Tween.get(innerCircle, {loop: true})
      .to({scaleX: 1.3, scaleY: 1.3}, 600, createjs.Ease.quadOut)
      .to({scaleX: 1, scaleY: 1}, 600, createjs.Ease.quadIn);
    
    // Добавляем подсказку под индикатором
    var hintText = new createjs.Text("Ваш друг должен ввести ваш ID и нажать 'Пригласить'", "16px " + FONT_GAME, "#AAAAAA");
    hintText.x = 0;
    hintText.y = 50;
    hintText.textAlign = "center";
    waitContainer.addChild(hintText);
    
    // Сохраняем ссылки для возможной очистки
    this._waitIndicator = waitContainer;
    
    // Сохраняем ID игры, чтобы использовать его при отмене
    this._currentGameId = gameId;
    
    // Меняем кнопку Пригласить на Отменить приглашение
    if (_oInviteButton) {
      // Сохраняем позицию кнопки перед удалением
      var buttonX = _oInviteButton.getX();
      var buttonY = _oInviteButton.getY();
      
      // Удаляем старую кнопку
      _oInviteButton.unload();
      
      // Создаем новую кнопку Отменить приглашение
      _oInviteButton = new CTextButton(
        buttonX,
        buttonY,
        s_oSpriteLibrary.getSprite("but_no"),
        TEXT_CANCEL_INVITATION[s_iCurLang],
        FONT_GAME,
        "#ffffff",
        30,
        "center",
        _oContainer
      );
      
      // Используем замыкание для сохранения gameId
      var _this = this;
      var _gameId = gameId;
      _oInviteButton.addEventListener(ON_MOUSE_UP, function() {
        console.log("CPlayByIdRoom: Кнопка отмены приглашения нажата для комнаты:", _gameId);
        _this._onCancelInvitation(_gameId);
      }, this);
    }
    
    // Устанавливаем таймаут на автоматическую отмену через 3 минуты
    this._invitationTimeout = setTimeout(function() {
      if (_bFindingOpponent) {
        console.log("CPlayByIdRoom: Таймаут ожидания для комнаты:", gameId);
        this._onCancelInvitation(gameId);
        _oErrorText.text = TEXT_INVITATION_TIMEOUT[s_iCurLang];
        this._showErrorWithAnimation();
      }
    }.bind(this), 3 * 60 * 1000);
  };
  
  // Обработчик отмены приглашения
  this._onCancelInvitation = function(gameId) {
    console.log("CPlayByIdRoom: Отмена приглашения для комнаты:", gameId);
    
    // Проверяем, что мы действительно находимся в режиме ожидания
    if (!_bFindingOpponent) {
      console.log("CPlayByIdRoom: Отмена приглашения игнорирована - не в режиме ожидания");
      return;
    }
    
    // Проверяем, что gameId соответствует текущему приглашению
    if (this._currentGameId && this._currentGameId !== gameId) {
      console.log("CPlayByIdRoom: Отмена приглашения игнорирована - несоответствие ID:", {
        current: this._currentGameId,
        requested: gameId
      });
      return;
    }
    
    // Отправляем отмену приглашения на сервер
    socket.emit("telegram-cancel-id-game", {
      userId: _iTelegramUserId,
      opponentId: _sOpponentId,
      sessionId: _sSessionId,
      gameId: gameId
    });
    
    _bFindingOpponent = false;
    _oLoadingText.visible = false;
    _oErrorText.text = "Приглашение отменено";
    this._showErrorWithAnimation();
    
    // Восстанавливаем кнопки
    if (_oInviteButton) {
      // Сохраняем позицию кнопки перед удалением
      var buttonX = _oInviteButton.getX();
      var buttonY = _oInviteButton.getY();
      
      // Удаляем старую кнопку
      _oInviteButton.unload();
      
      // Создаем новую кнопку с текстом "Пригласить"
      _oInviteButton = new CTextButton(
        buttonX,
        buttonY,
        s_oSpriteLibrary.getSprite("but_yes"),
        TEXT_INVITE[s_iCurLang],
        FONT_GAME,
        "#ffffff",
        30,
        "center",
        _oContainer
      );
      _oInviteButton.addEventListener(ON_MOUSE_UP, this._onInviteClicked, this);
    }
    
    if (_oPlayButton) {
      _oPlayButton.setVisible(false);
    }
    
    // Удаляем индикатор ожидания
    if (this._waitIndicator) {
      _oContainer.removeChild(this._waitIndicator);
      this._waitIndicator = null;
    }
    
    // Очищаем таймаут
    if (this._invitationTimeout) {
      clearTimeout(this._invitationTimeout);
      this._invitationTimeout = null;
    }
    
    // Очищаем ID текущей игры
    this._currentGameId = null;
  };

  // Обработчик приглашения в игру
  this._onGameInvitationReceived = function(data) {
    console.log("CPlayByIdRoom: Обработка приглашения в игру:", data);
    
    // Если есть ID отправителя, создаем интерфейс быстрого ответа
    if (data.fromUserId) {
      // Сохраняем ID оппонента
      _sOpponentId = data.fromUserId;
      
      // Создаем контейнер для приглашения
      var invitationContainer = new createjs.Container();
      _oContainer.addChild(invitationContainer);
      invitationContainer.x = CANVAS_WIDTH / 2;
      invitationContainer.y = CANVAS_HEIGHT / 2 - 100;
      
      // Создаем фон для приглашения
      var inviteBg = new createjs.Shape();
      inviteBg.graphics.beginFill("rgba(0,0,0,0.8)").drawRoundRect(-200, -120, 400, 240, 15);
      inviteBg.graphics.beginStroke("#22A7F0").setStrokeStyle(3).drawRoundRect(-200, -120, 400, 240, 15);
      invitationContainer.addChild(inviteBg);
      
      // Заголовок
      var titleText = new createjs.Text("ПРИГЛАШЕНИЕ В ИГРУ", "bold 28px " + FONT_GAME, "#ffffff");
      titleText.textAlign = "center";
      titleText.y = -80;
      invitationContainer.addChild(titleText);
      
      // Информация о приглашении
      var fromName = data.firstName || data.fromUsername || "Игрок";
      var messageText = new createjs.Text(fromName + " приглашает вас сыграть!", "22px " + FONT_GAME, "#ffffff");
      messageText.textAlign = "center";
      messageText.y = -20;
      invitationContainer.addChild(messageText);
      
      // ID отправителя
      var idText = new createjs.Text("ID: " + data.fromUserId, "18px " + FONT_GAME, "#22A7F0");
      idText.textAlign = "center";
      idText.y = 20;
      invitationContainer.addChild(idText);
      
      // Кнопка принять
      var acceptButton = new CTextButton(
        -70,
        80,
        s_oSpriteLibrary.getSprite("but_yes"),
        "ПРИНЯТЬ",
        FONT_GAME,
        "#ffffff",
        24,
        "center",
        invitationContainer
      );
      
      // Кнопка отклонить
      var declineButton = new CTextButton(
        70,
        80,
        s_oSpriteLibrary.getSprite("but_no"),
        "ОТКЛОНИТЬ",
        FONT_GAME,
        "#ffffff",
        24,
        "center",
        invitationContainer
      );
      
      // Добавляем обработчики
      acceptButton.addEventListener(ON_MOUSE_UP, function() {
        this._onAcceptInvitation(data);
        invitationContainer.visible = false;
        _oContainer.removeChild(invitationContainer);
        acceptButton.unload();
        declineButton.unload();
      }, this);
      
      declineButton.addEventListener(ON_MOUSE_UP, function() {
        this._onDeclineInvitation(data);
        invitationContainer.visible = false;
        _oContainer.removeChild(invitationContainer);
        acceptButton.unload();
        declineButton.unload();
      }, this);
      
      // Анимация появления
      invitationContainer.alpha = 0;
      createjs.Tween.get(invitationContainer)
        .to({alpha: 1}, 300, createjs.Ease.cubicOut)
        .wait(1500)
        .to({alpha: 0}, 300, createjs.Ease.cubicIn)
        .call(function() {
          _oContainer.removeChild(invitationContainer);
        });
      
      // Звуковое оповещение
      if (s_bAudioActive && createjs.Sound.isLoaded("notification")) {
        createjs.Sound.play("notification");
      }
      
      // Также заполняем поле ввода ID для ручного приглашения
      if (_oIdInputContainer) {
        _oIdInputContainer.value = data.fromUserId;
        
        // Добавляем анимацию, чтобы привлечь внимание к полю
        var currentBorderColor = _oIdInputContainer.style.borderColor;
        var highlightColors = ["#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722"];
        
        // Сбрасываем предыдущую анимацию, если она была
        if (this._inputAnimationInterval) {
          clearInterval(this._inputAnimationInterval);
        }
        
        var colorIndex = 0;
        this._inputAnimationInterval = setInterval(function() {
          _oIdInputContainer.style.borderColor = highlightColors[colorIndex++ % highlightColors.length];
          
          // Останавливаем анимацию через 3 секунды
          if (colorIndex >= 20) {
            clearInterval(this._inputAnimationInterval);
            _oIdInputContainer.style.borderColor = currentBorderColor;
          }
        }, 150);
      }
    }
  };
  
  // Обработчик для отклонения приглашения
  this._onDeclineInvitation = function(data) {
    console.log("CPlayByIdRoom: Отклонение приглашения:", data);
    
    // Отправляем отказ на сервер
    socket.emit("telegram-decline-invitation", {
      gameId: data.gameId,
      userId: _iTelegramUserId,
      opponentId: data.fromUserId,
      sessionId: _sSessionId
    });
    
    // Показываем уведомление об отклонении приглашения
    _oLoadingText.text = "Приглашение отклонено";
    _oLoadingText.visible = true;
    
    // Скрываем уведомление через 2 секунды
    setTimeout(function() {
      if (_oLoadingText) {
        _oLoadingText.visible = false;
      }
    }, 2000);
  };
  
  // Обработчик отклонения приглашения получателем
  this._onInvitationDeclined = function(data) {
    // Проверяем, что это наше приглашение
    if (data.opponentId !== _iTelegramUserId) {
      console.log("CPlayByIdRoom: Игнорируем чужое отклонение приглашения");
      return;
    }
    
    console.log("CPlayByIdRoom: Приглашение отклонено игроком:", data);
    
    // Останавливаем анимации ожидания
    _bFindingOpponent = false;
    
    // Показываем сообщение
    _oLoadingText.text = "Приглашение отклонено игроком";
    _oLoadingText.visible = true;
    
    // Очищаем индикатор ожидания, если он был
    if (this._waitIndicator) {
      _oContainer.removeChild(this._waitIndicator);
      this._waitIndicator = null;
    }
    
    // Очищаем таймаут, если он был установлен
    if (this._invitationTimeout) {
      clearTimeout(this._invitationTimeout);
      this._invitationTimeout = null;
    }
    
    // Восстанавливаем кнопку приглашения
    if (_oInviteButton) {
      // Сохраняем позицию кнопки перед удалением
      var buttonX = _oInviteButton.getX();
      var buttonY = _oInviteButton.getY();
      
      // Удаляем старую кнопку
      _oInviteButton.unload();
      
      // Создаем новую кнопку с текстом "Пригласить"
      _oInviteButton = new CTextButton(
        buttonX,
        buttonY,
        s_oSpriteLibrary.getSprite("but_yes"),
        TEXT_INVITE[s_iCurLang],
        FONT_GAME,
        "#ffffff",
        30,
        "center",
        _oContainer
      );
      _oInviteButton.addEventListener(ON_MOUSE_UP, this._onInviteClicked, this);
    }
    
    // Скрываем сообщение через 3 секунды
    setTimeout(function() {
      if (_oLoadingText) {
        _oLoadingText.visible = false;
      }
    }, 3000);
  };

  this._onGameResponseReceived = function(data) {
    _bFindingOpponent = false;
    
    if (data.success) {
      // Показываем статус успешной отправки приглашения
      _oLoadingText.text = data.message || "Приглашение отправлено!";
      _oLoadingText.visible = true;
      
      // Сохраняем информацию о противнике
      _sOpponentName = data.firstName || data.opponentName || "Игрок";
      
      // Добавляем более заметную индикацию ожидания
      var waitContainer = new createjs.Container();
      _oContainer.addChild(waitContainer);
      waitContainer.x = CANVAS_WIDTH / 2;
      waitContainer.y = CANVAS_HEIGHT / 2 + 60;
      
      // Улучшенная анимация ожидания
      var pulseCircle = new createjs.Shape();
      pulseCircle.graphics.beginFill("#22A7F0").drawCircle(0, 0, 15);
      pulseCircle.alpha = 0.2;
      waitContainer.addChild(pulseCircle);
      
      var innerCircle = new createjs.Shape();
      innerCircle.graphics.beginFill("#22A7F0").drawCircle(0, 0, 8);
      waitContainer.addChild(innerCircle);
    
      // Создаем пульсирующие анимации
      createjs.Tween.get(pulseCircle, {loop: true})
        .to({scaleX: 3, scaleY: 3, alpha: 0}, 1500, createjs.Ease.cubicOut)
        .set({scaleX: 1, scaleY: 1, alpha: 0.2});
        
      createjs.Tween.get(innerCircle, {loop: true})
        .to({scaleX: 1.3, scaleY: 1.3}, 600, createjs.Ease.quadOut)
        .to({scaleX: 1, scaleY: 1}, 600, createjs.Ease.quadIn);
    
      // Сохраняем ссылку для возможной очистки
      this._waitIndicator = waitContainer;
      
      // Меняем кнопку Пригласить на Отменить приглашение
      if (_oInviteButton) {
        // Сохраняем позицию кнопки перед удалением
        var buttonX = _oInviteButton.getX();
        var buttonY = _oInviteButton.getY();
        
        // Удаляем старую кнопку
        _oInviteButton.unload();
        
        // Создаем новую кнопку Отменить приглашение
        _oInviteButton = new CTextButton(
          buttonX,
          buttonY,
          s_oSpriteLibrary.getSprite("but_text"),
          TEXT_CANCEL_INVITATION[s_iCurLang],
          FONT_GAME,
          "#ffffff",
          30,
          "center",
          _oContainer
        );
        _oInviteButton.addEventListener(ON_MOUSE_UP, function() {
          this._onCancelInvitation(data.gameId);
        }.bind(this), this);
      }
      
      // Устанавливаем таймаут на автоматическую отмену через 2 минуты
      this._invitationTimeout = setTimeout(function() {
        if (_bFindingOpponent) {
          this._onCancelInvitation(data.gameId);
          _oErrorText.text = TEXT_INVITATION_TIMEOUT[s_iCurLang];
          this._showErrorWithAnimation();
        }
      }.bind(this), 2 * 60 * 1000);
    } else {
      _oLoadingText.visible = false;
      _oErrorText.text = data.message || "Не удалось найти соперника";
      this._showErrorWithAnimation();
    }
  };
  
  this._showErrorWithAnimation = function(errorMessage, duration = 3000) {
    if (_oErrorText) {
      // Останавливаем предыдущие анимации
      createjs.Tween.removeTweens(_oErrorText);
      
      _oErrorText.text = errorMessage;
      _oErrorText.alpha = 0;
      
      // Анимация появления
      createjs.Tween.get(_oErrorText)
        .to({alpha: 1}, 300, createjs.Ease.quartOut)
        .wait(duration)
        .to({alpha: 0}, 300, createjs.Ease.quartIn);
        
      // Добавляем эффект встряхивания
      createjs.Tween.get(_oErrorText)
        .to({x: CANVAS_WIDTH/2 - 5}, 50, createjs.Ease.quartOut)
        .to({x: CANVAS_WIDTH/2 + 5}, 50, createjs.Ease.quartOut)
        .to({x: CANVAS_WIDTH/2 - 3}, 50, createjs.Ease.quartOut)
        .to({x: CANVAS_WIDTH/2 + 3}, 50, createjs.Ease.quartOut)
        .to({x: CANVAS_WIDTH/2}, 50, createjs.Ease.quartOut);
    }
  };

  this._onOpponentConnected = function(data) {
    console.log("CPlayByIdRoom: Соперник подключился:", data);
    
    // Проверяем, что пришедший ID соответствует ID текущего ожидания
    if (this._currentGameId && data.gameId !== this._currentGameId) {
      console.log("CPlayByIdRoom: Игнорируем подключение - несоответствие ID игры:", {
        current: this._currentGameId,
        received: data.gameId
      });
      return;
    }
    
    // Проверяем, что подключившийся игрок соответствует приглашенному
    if (_sOpponentId && data.userId && data.userId.toString() !== _sOpponentId.toString()) {
      console.log("CPlayByIdRoom: Игнорируем подключение - несоответствие ID игрока:", {
        invited: _sOpponentId,
        connected: data.userId
      });
      return;
    }
    
    // Маркер ожидания должен быть сброшен, если он установлен
    if (_bFindingOpponent) {
      _bFindingOpponent = false;
    }
    
    // Очищаем таймаут ожидания, если он был установлен
    if (this._invitationTimeout) {
      clearTimeout(this._invitationTimeout);
      this._invitationTimeout = null;
    }
    
    // Останавливаем анимацию загрузки
    this._stopLoadingAnimation();
    
    // Очищаем индикатор ожидания
    if (this._waitIndicator) {
      _oContainer.removeChild(this._waitIndicator);
      this._waitIndicator = null;
    }
    
    _oLoadingText.text = "Соперник подключился! Запуск игры...";
    _oLoadingText.visible = true;
    
    // Эффект успеха
    var successEffect = new createjs.Shape();
    successEffect.graphics.beginFill("#4CAF50").drawCircle(0, 0, 0);
    successEffect.x = CANVAS_WIDTH / 2;
    successEffect.y = CANVAS_HEIGHT / 2;
    _oContainer.addChild(successEffect);
    
    createjs.Tween.get(successEffect)
      .to({scaleX: 30, scaleY: 30, alpha: 0}, 1000, createjs.Ease.cubicOut)
      .call(function() {
        _oContainer.removeChild(successEffect);
      });
    
    // Сохраняем информацию о сопернике
    _sOpponentName = data.firstName || data.opponentName || "Игрок";
    
    // Сохраняем имя оппонента в глобальную переменную
    s_oTelegramOpponentName = _sOpponentName;
    console.log("Установлено имя оппонента в глобальную переменную (1):", _sOpponentName);
    
    // Запускаем игру после небольшой задержки
    setTimeout(function() {
      this._startMultiplayerGame(data.gameId, _sOpponentName);
    }.bind(this), 1000);
  };

  this._onGameError = function(error) {
    _bFindingOpponent = false;
    _oLoadingText.visible = false;
    _oErrorText.text = error.message || "Произошла ошибка";
  };

  this._onConnectionLost = function() {
    _bFindingOpponent = false;
    _oLoadingText.visible = false;
    _oErrorText.text = "Соединение с сервером потеряно";
  };

  this._onMouseDownButExit = function () {
    var _this = this;
    
    // Если мы ожидаем ответа от соперника, отменяем запрос
    if (_bFindingOpponent && _sOpponentId) {
      socket.emit("telegram-cancel-id-game", {
        userId: _iTelegramUserId,
        opponentId: _sOpponentId,
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
    // Удаляем все обработчики событий сокетов
    socket.off("telegram-id-game-response");
    socket.off("telegram-user-info");
    socket.off("telegram-opponent-connected");
    socket.off("telegram-id-game-error");
    socket.off("telegram-pong");
    socket.off("telegram-game-invitation");
    socket.off("telegram-invitation-accepted");
    socket.off("telegram-invitation-declined");
    socket.off("telegram-invitation-canceled");
    socket.off("telegram-game-starting");
    socket.off("telegram-start-multiplayer-game");
    
    // Очищаем таймауты и интервалы
    if (this._invitationTimeout) {
      clearTimeout(this._invitationTimeout);
    }
    if (this._inputAnimationInterval) {
      clearInterval(this._inputAnimationInterval);
    }
    
    // Удаляем HTML элементы
    if (_oIdInputContainer) {
      document.body.removeChild(_oIdInputContainer);
    }
    
    // Останавливаем все анимации
    createjs.Tween.removeAllTweens();
    
    // Удаляем контейнеры и объекты CreateJS
    if (_oContainer) {
      s_oStage.removeChild(_oContainer);
    }
    if (_oButExit) {
      _oButExit.unload();
    }
    
    // Очищаем ссылки
    _oContainer = null;
    _oButExit = null;
    _oIdInputContainer = null;
    _oUserIdText = null;
    _oCopyButton = null;
    _oInviteButton = null;
    _oPlayButton = null;
    _oErrorText = null;
    _oLoadingText = null;
    _oStatusText = null;
    _oIdSection = null;
    
    s_oPlayByIdRoom = null;
  };

  // ...existing code...

  this.refreshButtonPos = function () {
    if (_oButExit) {
      _oButExit.setPosition(
        _pStartPosExit.x - s_iOffsetX,
        s_iOffsetY + _pStartPosExit.y
      );
    }
    
    // Если есть поле ввода, обновляем его позицию
    if (_oIdInputContainer) {
      _oIdInputContainer.style.left = (CANVAS_WIDTH / 2 - 125 - s_iOffsetX) + "px";
      _oIdInputContainer.style.top = (CANVAS_HEIGHT / 2 - s_iOffsetY) + "px";
    }
  };

  // Обработчик для запросов на игру с другим пользователем
  this._onMultiplayerGameRequest = function(data) {
    if (!data || !data.fromUserId) {
      console.error("CPlayByIdRoom: Получены некорректные данные запроса на игру");
      return;
    }
    
    console.log("CPlayByIdRoom: Получен запрос на игру от пользователя:", data.fromUserId);
    
    // Проверяем, что пользователь в данный момент не занят другим запросом
    if (_bInvitationReceived) {
      console.warn("CPlayByIdRoom: Игнорируем запрос на игру, так как уже есть активное приглашение");
      
      // Отправляем уведомление, что пользователь занят
      socket.emit("player-busy", {
        userId: _iTelegramUserId,
        opponentId: data.fromUserId,
        sessionId: _sSessionId
      });
      
      return;
    }
    
    _bInvitationReceived = true;
    _sInvitationGameId = data.gameId;
    _sOpponentId = data.fromUserId;
    _sOpponentName = data.fromUsername || "Игрок";
    
    // Показываем интерфейс приглашения
    this._showInvitationInterface(data);
  };
  
  // Показывает интерфейс с приглашением в игру
  this._showInvitationInterface = function(data) {
    // Создаем контейнер для приглашения
    var inviteContainer = new createjs.Container();
    _oContainer.addChild(inviteContainer);
    
    // Полупрозрачный фон
    var bgShape = new createjs.Shape();
    bgShape.graphics.beginFill("rgba(0,0,0,0.8)").drawRoundRect(CANVAS_WIDTH/2 - 200, CANVAS_HEIGHT/2 - 125, 400, 250, 10);
    inviteContainer.addChild(bgShape);
    
    // Заголовок приглашения
    var titleText = new createjs.Text(TEXT_INVITATION[s_iCurLang], "30px " + FONT_GAME, "#FFFFFF");
    titleText.x = CANVAS_WIDTH/2;
    titleText.y = CANVAS_HEIGHT/2 - 100;
    titleText.textAlign = "center";
    inviteContainer.addChild(titleText);
    
    // Текст с именем игрока
    var fromText = new createjs.Text(
      (data.firstName || data.fromUsername || "Игрок") + TEXT_INVITES_YOU[s_iCurLang],
      "24px " + FONT_GAME,
      "#FFFFFF"
    );
    fromText.x = CANVAS_WIDTH/2;
    fromText.y = CANVAS_HEIGHT/2 - 40;
    fromText.textAlign = "center";
    inviteContainer.addChild(fromText);
    
    // Создаем кнопки Принять/Отклонить
    var acceptBtn = new CTextButton(
      CANVAS_WIDTH/2 - 70,
      CANVAS_HEIGHT/2 + 40,
      s_oSpriteLibrary.getSprite("but_text"),
      TEXT_ACCEPT[s_iCurLang],
      FONT_GAME,
      "#ffffff",
      24,
      "center",
      inviteContainer
    );
    
    var declineBtn = new CTextButton(
      CANVAS_WIDTH/2 + 70,
      CANVAS_HEIGHT/2 + 40,
      s_oSpriteLibrary.getSprite("but_text"),
      TEXT_DECLINE[s_iCurLang],
      FONT_GAME,
      "#ffffff",
      24,
      "center",
      inviteContainer
    );
    
    // Устанавливаем обработчики событий
    acceptBtn.addEventListener(ON_MOUSE_UP, function() {
      // Удаляем контейнер с приглашением
      _oContainer.removeChild(inviteContainer);
      acceptBtn.unload();
      declineBtn.unload();
      
      // Вызываем метод принятия приглашения
      this._onAcceptInvitation(data);
    }.bind(this));
    
    declineBtn.addEventListener(ON_MOUSE_UP, function() {
      // Удаляем контейнер с приглашением
      _oContainer.removeChild(inviteContainer);
      acceptBtn.unload();
      declineBtn.unload();
      
      // Сбрасываем флаг приглашения
      _bInvitationReceived = false;
      
      // Вызываем метод отклонения приглашения
      this._onDeclineInvitation(data);
    }.bind(this));
    
    // Сохраняем ссылку на контейнер для возможной очистки
    this._invitationContainer = inviteContainer;
    
    // Устанавливаем таймаут на автоматическое отклонение через 30 секунд
    this._invitationReceivedTimeout = setTimeout(function() {
      if (_bInvitationReceived) {
        _oContainer.removeChild(inviteContainer);
        acceptBtn.unload();
        declineBtn.unload();
        
        _bInvitationReceived = false;
        this._onDeclineInvitation(data);
      }
    }.bind(this), 30000);
  };

  // Метод для запуска многопользовательской игры
  this._startMultiplayerGame = function(gameId, opponentName) {
    console.log("CPlayByIdRoom: Запуск многопользовательской игры:", {
      gameId: gameId,
      opponentName: opponentName,
      currentGameId: this._currentGameId
    });
    
    // Проверяем, что ID игры не пустой
    if (!gameId) {
      console.error("CPlayByIdRoom: ОШИБКА! gameId не определен!");
      gameId = "game_" + Date.now() + "_" + Math.floor(Math.random()*10000); // Генерируем случайный ID
      console.log("CPlayByIdRoom: Сгенерирован случайный gameId:", gameId);
    }
    
    // Останавливаем анимации поиска, если они активны
    if (_bFindingOpponent) {
      _bFindingOpponent = false;
    }
    
    // Очищаем таймаут ожидания, если он был установлен
    if (this._invitationTimeout) {
      clearTimeout(this._invitationTimeout);
      this._invitationTimeout = null;
    }
    
    // Останавливаем анимацию загрузки
    this._stopLoadingAnimation();
    
    // Очищаем индикатор ожидания, если он был
    if (this._waitIndicator) {
      _oContainer.removeChild(this._waitIndicator);
      this._waitIndicator = null;
    }
    
    // Пытаемся распознать, если opponentName выглядит как username, получить real name
    if (opponentName && (opponentName.includes('@') || opponentName.includes('_') || /^\w+$/.test(opponentName))) {
      console.log("CPlayByIdRoom: Имя оппонента выглядит как username, пытаемся получить реальное имя");
      
      // Запросим информацию об оппоненте, если известен его ID
      if (_sOpponentId) {
        console.log("CPlayByIdRoom: Запрашиваем информацию об оппоненте с ID:", _sOpponentId);
        
        // Сохраняем ID оппонента в глобальную переменную для использования в CNTable
        window.TELEGRAM_OPPONENT_ID = _sOpponentId;
        console.log("CPlayByIdRoom: ID оппонента сохранен в глобальной переменной:", window.TELEGRAM_OPPONENT_ID);
        
        socket.emit("telegram-get-user-info", {
          userId: _iTelegramUserId,
          opponentId: _sOpponentId,
          sessionId: _sSessionId
        });
      }
    }
    
    // Сохраняем ID игры для использования в других компонентах
    if (gameId) {
      window.MULTIPLAYER_GAME_ID = gameId;
      console.log("CPlayByIdRoom: ID игры сохранен в глобальной переменной:", window.MULTIPLAYER_GAME_ID);
    }
    
    // Сохраняем ID текущего пользователя
    if (_iTelegramUserId) {
      window.TELEGRAM_USER_ID = _iTelegramUserId;
      console.log("CPlayByIdRoom: ID пользователя сохранен в глобальной переменной:", window.TELEGRAM_USER_ID);
    }
    
    // Убедимся, что имя оппонента сохранено
    if (opponentName) {
      s_oTelegramOpponentName = opponentName;
      console.log("CPlayByIdRoom: Имя оппонента сохранено в глобальной переменной:", s_oTelegramOpponentName);
    }
    
    // Устанавливаем режим игры на двух игроков
    try {
      // Записываем gameId в глобальную переменную для дополнительной защиты
      window.MULTIPLAYER_GAME_ID = gameId;
      
      // Устанавливаем режим игры явно в нескольких местах для надежности
      window.s_iPlayerMode = GAME_MODE_TWO;
      s_iPlayerMode = GAME_MODE_TWO;
      
      // Убедимся, что имя оппонента сохранено в глобальной переменной
      if (opponentName) {
        console.log("CPlayByIdRoom: Имя оппонента сохранено в глобальной переменной:", s_oTelegramOpponentName);
      }
      
      // Сохраняем режим в localStorage для дополнительной надежности
      try {
        localStorage.setItem('billiard_player_mode', GAME_MODE_TWO);
        // Также сохраняем текущий gameId
        localStorage.setItem('billiard_game_id', gameId);
        // Сохраняем имя оппонента
        if (opponentName) {
          localStorage.setItem('billiard_opponent_name', opponentName);
        }
      } catch (e) {
        console.warn("CPlayByIdRoom: Не удалось сохранить данные в localStorage:", e);
      }
      
      console.log("CPlayByIdRoom: Установлен режим игры s_iPlayerMode =", s_iPlayerMode, 
                 "(GAME_MODE_TWO =", GAME_MODE_TWO, ", GAME_MODE_CPU =", GAME_MODE_CPU, ")");
    } catch (error) {
      console.error("CPlayByIdRoom: Ошибка при установке режима игры:", error);
    }
    
    // Отправляем событие на глобальном уровне о запуске мультиплеерной игры
    try {
      $(document).trigger("multiplayer_game_launch", {gameId: gameId, opponentName: opponentName});
    } catch(e) {
      console.error("CPlayByIdRoom: Ошибка при отправке события multiplayer_game_launch:", e);
    }
    
    var _this = this;
    this._onExit(function () {
      _this.unload();
      
      // Дополнительная проверка перед запуском игры
      try {
        // Устанавливаем режим игры явно непосредственно перед запуском
        window.s_iPlayerMode = GAME_MODE_TWO;
        s_iPlayerMode = GAME_MODE_TWO;
        
        console.log("CPlayByIdRoom: Финальная проверка режима игры:", 
                  "s_iPlayerMode =", s_iPlayerMode,
                  "GAME_MODE_TWO =", GAME_MODE_TWO,
                  "Имя оппонента =", s_oTelegramOpponentName);
      } catch (error) {
        console.error("CPlayByIdRoom: Ошибка при финальной установке режима игры:", error);
      }
      
      // Проверяем, что gameId действительно является строкой, что указывает на gameId для мультиплеера
      if (typeof gameId === 'string' && gameId.length > 5) {
        console.log("CPlayByIdRoom: Вызываем s_oMain.gotoGame с ID", gameId);
      } else {
        console.warn("CPlayByIdRoom: Предупреждение! gameId имеет неожиданный формат:", gameId);
        // Если ID имеет неверный формат, используем запасной вариант
        if (!gameId || typeof gameId !== 'string') {
          gameId = "game_" + Date.now() + "_" + Math.floor(Math.random()*1000);
          console.log("CPlayByIdRoom: Создан запасной gameId:", gameId);
        }
      }
      
      // Запускаем игру с передачей gameId
      s_oMain.gotoGame(gameId);
      $(s_oMain).trigger("start_session");
      
      // Добавляем событие для уведомления о запуске мультиплеера
      setTimeout(function() {
        $(s_oMain).trigger("multiplayer_game_started");
        
        // Дополнительное уведомление о завершении запуска игры
        console.log("CPlayByIdRoom: Игра успешно запущена с ID:", gameId);
      }, 500);
    });
  };
  
  // Обработчик события начала игры (аналогично CTelegramRoomList)
  this._onGameStarting = function(data) {
    console.log("CPlayByIdRoom: Запуск игры по событию telegram-game-starting:", data);
    
    // Проверка наличия необходимых данных
    if (!data || !data.gameId) {
      console.error("CPlayByIdRoom: Ошибка! Получены некорректные данные для запуска игры:", data);
      return;
    }
    
    // Проверяем, не запущена ли уже игра
    if (s_oGame) {
      console.log("CPlayByIdRoom: Игра уже запущена, игнорируем событие telegram-game-starting");
      return;
    }
    
    // Если это повторное напоминание, и мы уже начали переход к игре, игнорируем его
    if (data.reminder && this._startingGame) {
      console.log("CPlayByIdRoom: Получено напоминание о готовности, но игра уже в процессе запуска");
      return;
    }
    
    // Отмечаем, что мы начали процесс запуска игры
    this._startingGame = true;
    
    // Если был установлен флаг ожидания, сбрасываем его
    if (_bFindingOpponent) {
      _bFindingOpponent = false;
    }
    
    // Устанавливаем сообщение
    _oLoadingText.text = "Игра найдена! Подключаемся...";
    _oLoadingText.visible = true;
    
    // Добавляем эффект анимации 
    var successEffect = new createjs.Shape();
    successEffect.graphics.beginFill("#4CAF50").drawCircle(0, 0, 0);
    successEffect.x = CANVAS_WIDTH / 2;
    successEffect.y = CANVAS_HEIGHT / 2;
    _oContainer.addChild(successEffect);
    
    createjs.Tween.get(successEffect)
      .to({scaleX: 30, scaleY: 30, alpha: 0}, 1000, createjs.Ease.cubicOut)
      .call(function() {
        _oContainer.removeChild(successEffect);
      });
    
    // Сохраняем информацию о сопернике
    _sOpponentName = data.firstName || data.opponentName || "Игрок";
    _sOpponentId = data.opponentId || "";
    
    
    // Сохраняем имя оппонента в глобальную переменную
    s_oTelegramOpponentName = _sOpponentName;
    console.log("Установлено имя оппонента в глобальную переменную:", _sOpponentName);
    
    // Подтверждаем готовность к игре - увеличиваем количество попыток
    console.log("CPlayByIdRoom: Отправляем событие готовности к игре для:", {
      gameId: data.gameId,
      userId: _iTelegramUserId,
      opponentId: data.opponentId || "",
      sessionId: _sSessionId
    });
    
    // Отправляем готовность несколько раз с интервалом, чтобы убедиться, что сервер получил событие
    socket.emit("telegram-ready-for-game", {
      gameId: data.gameId,
      userId: _iTelegramUserId,
      opponentId: data.opponentId || "",
      sessionId: _sSessionId
    });
    
    // Дополнительно отправляем событие через 500мс
    setTimeout(function() {
      socket.emit("telegram-ready-for-game", {
        gameId: data.gameId,
        userId: _iTelegramUserId,
        opponentId: data.opponentId || "",
        sessionId: _sSessionId
      });
      
      console.log("CPlayByIdRoom: Повторно отправлено событие готовности к игре");
    }, 500);
    
    // И еще раз через 1500мс
    setTimeout(function() {
      socket.emit("telegram-ready-for-game", {
        gameId: data.gameId,
        userId: _iTelegramUserId,
        opponentId: data.opponentId || "",
        sessionId: _sSessionId
      });
      
      console.log("CPlayByIdRoom: Отправлено финальное событие готовности к игре");
    }, 1500);
    
    // Сохраняем gameId в глобальных переменных
    window.MULTIPLAYER_GAME_ID = data.gameId;
    
    // Добавляем небольшую задержку для обеспечения синхронизации между игроками
    setTimeout(function() {
      // Запускаем игру
      this._startMultiplayerGame(data.gameId, data.opponentName || "Игрок");
    }.bind(this), 2000); // Увеличили задержку до 2 секунд для лучшей синхронизации
  };

  this._startLoadingAnimation = function() {
    if (!this._waitIndicator) {
      this._waitIndicator = new createjs.Container();
      _oContainer.addChild(this._waitIndicator);
      
      // Создаем три точки для анимации
      for(let i = 0; i < 3; i++) {
        const dot = new createjs.Shape();
        dot.graphics.beginFill("#22A7F0").drawCircle(0, 0, 4);
        dot.x = (i - 1) * 15;
        this._waitIndicator.addChild(dot);
        
        // Анимация для каждой точки с задержкой
        createjs.Tween.get(dot, {loop: true})
          .wait(i * 200)
          .to({y: -10}, 400, createjs.Ease.quadOut)
          .to({y: 0}, 400, createjs.Ease.bounceOut);
      }
      
      this._waitIndicator.x = CANVAS_WIDTH/2;
      this._waitIndicator.y = CANVAS_HEIGHT/2 + 80;
    }
  };
  
  this._stopLoadingAnimation = function() {
    if (this._waitIndicator) {
      createjs.Tween.removeTweens(this._waitIndicator);
      _oContainer.removeChild(this._waitIndicator);
      this._waitIndicator = null;
    }
  };

  // Обработчик для принятия приглашения
  this._onAcceptInvitation = function(data) {
    console.log("CPlayByIdRoom: Принятие приглашения:", data);
    
    // Показываем загрузку
    _oLoadingText.text = "Подключение к игровой комнате...";
    _oLoadingText.visible = true;
    
    // Сохраняем данные для подключения
    _sOpponentId = data.fromUserId;
    _sOpponentName = data.firstName || data.fromUsername || "Игрок";
    
    // Сохраняем имя оппонента в глобальную переменную
    s_oTelegramOpponentName = _sOpponentName;
    
    // Отправляем запрос на присоединение к комнате
    socket.emit("telegram-join-room", {
      gameId: data.gameId,
      userId: _iTelegramUserId,
      username: _sTelegramUsername,
      opponentId: data.fromUserId,
      sessionId: _sSessionId
    });
    
    // Также отправляем прямое уведомление отправителю приглашения, 
    // чтобы гарантировать, что он получит оповещение
    socket.emit("telegram-invitation-accepted", {
      gameId: data.gameId,
      userId: _iTelegramUserId,
      username: _sTelegramUsername,
      opponentId: data.fromUserId,
      sessionId: _sSessionId
    });
    
    // Подписываемся на событие начала игры напрямую
    socket.off("telegram-game-starting"); // Удаляем существующие обработчики
    socket.on("telegram-game-starting", function(gameData) {
      console.log("CPlayByIdRoom: Получено событие начала игры:", gameData);
      this._onGameStarting(gameData);
    }.bind(this));
    
    // Запускаем игру с небольшой задержкой
    setTimeout(function() {
      // Автоматически запускаем игру
      this._startMultiplayerGame(data.gameId, data.fromUsername);
    }.bind(this), 1000);
  };
  
  // Обработчик события принятия приглашения (для отправителя)
  this._onInvitationAccepted = function(data) {
    // Проверяем, что это приглашение от текущего пользователя
    if (data.opponentId !== _iTelegramUserId && data.gameId) {
      console.log("CPlayByIdRoom: Игнорируем чужое приглашение");
      return;
    }
    
    console.log("CPlayByIdRoom: Обработка принятого приглашения", data);
    
    // Останавливаем анимации ожидания
    _bFindingOpponent = false;
    
    // Показываем сообщение
    _oLoadingText.text = "Приглашение принято! Подключение к игре...";
    _oLoadingText.visible = true;
    
    // Очищаем индикатор ожидания, если он был
    if (this._waitIndicator) {
      _oContainer.removeChild(this._waitIndicator);
      this._waitIndicator = null;
    }
    
    // Очищаем таймаут, если он был установлен
    if (this._invitationTimeout) {
      clearTimeout(this._invitationTimeout);
      this._invitationTimeout = null;
    }
    
    // Скрываем все кнопки
    if (_oInviteButton) {
      _oInviteButton.setVisible(false);
    }
    
    if (_oPlayButton) {
      _oPlayButton.setVisible(false);
    }
    
    // Сохраняем данные оппонента
    _sOpponentName = data.firstName || data.username || "Игрок";
    _sOpponentId = data.userId || "";
    
    // Сохраняем имя оппонента в глобальную переменную
    s_oTelegramOpponentName = _sOpponentName;
    console.log("Установлено имя оппонента в глобальную переменную (3):", _sOpponentName);
    
    // Скрываем кнопки ожидания, если были показаны
    if (this._waitIndicator) {
      _oContainer.removeChild(this._waitIndicator);
      this._waitIndicator = null;
    }
    
    // Эффект успеха
    var successEffect = new createjs.Shape();
    successEffect.graphics.beginFill("#4CAF50").drawCircle(0, 0, 0);
    successEffect.x = CANVAS_WIDTH / 2;
    successEffect.y = CANVAS_HEIGHT / 2;
    _oContainer.addChild(successEffect);
    
    createjs.Tween.get(successEffect)
      .to({scaleX: 30, scaleY: 30, alpha: 0}, 1000, createjs.Ease.cubicOut)
      .call(function() {
        _oContainer.removeChild(successEffect);
      });
    
    // Больше не отправляем start-game, т.к. этим теперь занимается сервер
    console.log("CPlayByIdRoom: Ожидаем события telegram-game-starting от сервера");
    
    // Явно сохраняем ID игры в глобальную переменную
    if (data.gameId) {
      window.MULTIPLAYER_GAME_ID = data.gameId;
      console.log("CPlayByIdRoom: ID игры сохранен в глобальную переменную:", window.MULTIPLAYER_GAME_ID);
    }
    
    // Сохраняем ID оппонента (принявшего игрока)
    if (data.userId) {
      window.TELEGRAM_OPPONENT_ID = data.userId;
      console.log("CPlayByIdRoom: ID оппонента сохранен в глобальную переменную:", window.TELEGRAM_OPPONENT_ID);
    }
    
    // Сохраняем ID текущего пользователя
    if (_iTelegramUserId) {
      window.TELEGRAM_USER_ID = _iTelegramUserId;
      console.log("CPlayByIdRoom: ID пользователя сохранен в глобальной переменной:", window.TELEGRAM_USER_ID);
    }
    
    // Специальная обработка для отправителя приглашения - 
    // если событие game-starting не придет в течение 3 секунд, запустим игру явно
    setTimeout(function() {
      // Если все еще на экране приглашения, запускаем игру
      if (!s_oGame && data.gameId) {
        console.log("CPlayByIdRoom: Не получено событие telegram-game-starting, запускаем игру напрямую");
        this._startMultiplayerGame(data.gameId, _sOpponentName);
      }
    }.bind(this), 3000);
  };

  // Обработчик для отмены приглашения другой стороной
  this._onInvitationCanceled = function(data) {
    console.log("CPlayByIdRoom: Приглашение отменено отправителем:", data);
    
    // Показываем уведомление
    _oLoadingText.text = "Приглашение отменено отправителем";
    _oLoadingText.visible = true;
    
    // Скрываем уведомление через 2 секунды
    setTimeout(function() {
      if (_oLoadingText) {
        _oLoadingText.visible = false;
      }
    }, 2000);
  };

  s_oPlayByIdRoom = this;

  this._init();
}

var s_oPlayByIdRoom = null;