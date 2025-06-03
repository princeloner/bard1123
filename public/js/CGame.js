// const { CANVAS_WIDTH, CANVAS_HEIGHT } = require("../../controllers/setting");

function CGame(playerId) {
  var _bUpdate = false;
  var _bSuitAssigned;
  var _iCurTurn; //Current Turn in game
  var _iWinStreak;
  var _aSuitePlayer;

  var _oScenario;
  var _oGameOverPanel;
  var _oPlayer1;
  var _oPlayer2;
  var _oScoreGUI;
  var _oInterface;
  var _oTable;
  var _oContainerGame;
  var _oContainerTable;
  var _oContainerInterface;
  var _iScore;

  var _oInteractiveHelp;

  var _oContainerInputController;
  // var _oInputController;
  var _oShotPowerBar;
  var _oContainerShotPowerBar;
  var _oCointainerShotPowerBarInput;
  var _bHoldStickCommand;
  var _iDirStickCommand;
  var _iDirStickSpeedCommand;
  var _messagebar;
  var _domElement;
  this._init = function () {
    _iCurTurn = 1;
    _iWinStreak = 0;
    _bSuitAssigned = false;
    _bHoldStickCommand = false;
    _iDirStickCommand = 1;
    _iDirStickSpeedCommand = COMMAND_STICK_START_SPEED;

    _iScore = 0;

    switch (s_iGameMode) {
      case GAME_MODE_NINE: {
        BALL_NUMBER = 9;
        break;
      }
      case GAME_MODE_EIGHT: {
        BALL_NUMBER = 15;
        break;
      }
      case GAME_MODE_TIME: {
        BALL_NUMBER = 15;
        break;
      }
    }

    RACK_POS = STARTING_RACK_POS[s_iGameMode];

    _oContainerGame = new createjs.Container();
    s_oStage.addChild(_oContainerGame);

   // var oBg = createBitmap(s_oSpriteLibrary.getSprite("bg_game"));
    //_oContainerGame.addChild(oBg);

    _oContainerTable = new createjs.Container();
    _oContainerGame.addChild(_oContainerTable);

    _oContainerInterface = new createjs.Container();
    s_oStage.addChild(_oContainerInterface);

    _oInterface = new CInterface(_oContainerInterface);
    _oScenario = new CScene();

    if (s_iPlayerMode == GAME_MODE_TWO) {
      // В сетевой игре инициализируем таблицу с учетом возможности запоздалого получения playerId
      _oTable = new CNTable(
        _oContainerTable,
        GAME_DIFFICULTY_PARAMS[s_iGameDifficulty],
        playerId
      );
      
      // Если у нас есть сохраненная роль игрока и определен объект стола, можем начать игру сразу
      if (window.PLAYER_ROLE && _oTable) {
        console.log("CGame: Запуск игры с сохраненной ролью", window.PLAYER_ROLE);
        setTimeout(function() {
          _oTable.startNetGame(window.PLAYER_ROLE);
        }, 1000); // Даем небольшую задержку для полной инициализации
      }
    } else {
      _oTable = new CTable(
        _oContainerTable,
        GAME_DIFFICULTY_PARAMS[s_iGameDifficulty]
      );
    }
    _oTable.addEventListener(ON_LOST, this.gameOver, this);
    _oTable.addEventListener(ON_WON, this.showWinPanel, this);

    var iY = 40;

    _oScoreGUI = null;
    
    // Имена игроков по умолчанию
    var leftPlayerName = "YOU";
    var rightPlayerName = s_iPlayerMode == GAME_MODE_TWO ? "OPPONENT" : "CPU";
    
    // Проверяем, играем ли в сетевую игру
    if (s_iPlayerMode == GAME_MODE_TWO) {
      try {
        console.log("Получаем имена игроков для сетевой игры. PlayerId:", playerId);
        console.log("Имя оппонента из s_oTelegramOpponentName:", s_oTelegramOpponentName);
        
        // Получаем имя текущего пользователя из Telegram WebApp API
        var myName = "Игрок";
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe.user) {
          var telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
          // Используем first_name в приоритете
          myName = telegramUser.first_name || "Игрок";
        }
        
        // Получаем имя оппонента
        var opponentName = "Оппонент";
        if (typeof s_oTelegramOpponentName !== 'undefined' && s_oTelegramOpponentName) {
          opponentName = s_oTelegramOpponentName;
        }
        
        console.log("Мое имя:", myName, "Имя оппонента:", opponentName);
        
        // Гарантируем, что левая сторона - всегда текущий игрок,
        // а правая - всегда оппонент, независимо от player1/player2
        leftPlayerName = myName;
        rightPlayerName = opponentName;
      } catch (e) {
        console.error("Ошибка при получении данных игроков:", e);
      }
    }
    
    console.log("Итоговые имена игроков - Левый:", leftPlayerName, "Правый:", rightPlayerName);
    
    // Создаем объекты игроков с установленными именами
    _oPlayer1 = new CPlayerGUI(CANVAS_WIDTH / 2 - 400, iY, leftPlayerName, s_oStage, 0);
    _oPlayer2 = new CPlayerGUI(
      CANVAS_WIDTH / 2 + 400,
      iY,
      rightPlayerName,
      s_oStage,
      1
    );
    
    // if (s_iPlayerMode === GAME_MODE_CPU) {
    _oScoreGUI = new CScoreGUI(CANVAS_WIDTH / 2, iY, s_oStage);
    // }

    // ВАЖНО: Снимаем подсветку с обоих игроков и НЕ ВЫЗЫВАЕМ setInitialPlayerHighlight
    // Подсветка будет установлена ТОЛЬКО после падения монетки
    _oPlayer1.unlight();
    _oPlayer2.unlight();
    
    if (s_iGameMode === GAME_MODE_NINE) {
      this.setNextBallToHit(1);
    }

    _oContainerInputController = new createjs.Container();
    s_oStage.addChild(_oContainerInputController);

    _oContainerShotPowerBar = new createjs.Container();
    s_oStageUpper3D.addChild(_oContainerShotPowerBar);

    _oCointainerShotPowerBarInput = new createjs.Container();
    s_oStage.addChild(_oCointainerShotPowerBarInput);

    if (s_bMobile) {
      _oShotPowerBar = new CShotPowerBar(
        _oContainerShotPowerBar,
        123,
        260,
        _oCointainerShotPowerBarInput
      );

      //_oShotPowerBar.hide(0);
    }

    var oFade = new createjs.Shape();
    oFade.graphics
      .beginFill("black")
      .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    s_oStageUpper3D.addChild(oFade);

    tweenVolume("soundtrack", SOUNDTRACK_VOLUME_IN_GAME, 1000);

    _oGameOverPanel = new CGameOverPanel(s_oStageUpper3D);
    _oGameOverPanel.addEventListener(ON_EXIT_GAME, this.onExit, this);
    _oGameOverPanel.addEventListener(ON_RESTART, this.restartGame, this);

    _oNetGameOverPanel = new CNetGameOverPanel(s_oStageUpper3D);
    _oNetGameOverPanel.addEventListener(ON_EXIT_GAME, this.onNetExit, this);

    _oInteractiveHelp = null;

    s_bInteractiveHelp = localStorage.getItem("8ball_game_helped")
      ? false
      : true;

    if (s_bInteractiveHelp) {
      _oInteractiveHelp = new CInteractiveHelp(s_oStageUpper3D);
      _oInteractiveHelp.addEventListener(
        ON_END_TUTORIAL,
        this._onEndTutorial,
        this
      );
      $("#canvas_upper_3d").css("pointer-events", "initial");
      s_bInteractiveHelp = false;
    } else {
      this._onEndTutorial();
    }

    createjs.Tween.get(oFade)
      .to({ alpha: 0 }, 1000, createjs.Ease.cubicIn)
      .call(function () {
        s_oStageUpper3D.removeChild(oFade);
        s_oGame._startInteractiveHelp();
      });
    createjs.Tween.get(_oScenario)
      .wait(s_iTimeElaps)
      .call(_oScenario.update, null, _oScenario);

    if (s_iPlayerMode !== GAME_MODE_CPU) {
      function scaler() {
        var scalW =
          s_oStage.canvas.offsetWidth / document.documentElement.clientWidth;
        var scalH =
          s_oStage.canvas.offsetHeight / document.documentElement.clientHeight;
        var _spanScal = scalW < 1 ? scalW : scalH < 1 ? scalH : 1;
        _domElement.scaleX = _spanScal;
        _domElement.scaleY = _spanScal;
      }
      window.addEventListener("resize", scaler);
      _messagebar = document.querySelector(".message-wrapper");
      $(_messagebar).show();
      _domElement = new createjs.DOMElement(_messagebar);
      s_oStage.addChild(_domElement);
      document.addEventListener("keydown", this.onKeyDown);
      scaler();

      socket.on("send-message", this.onMessage);
    }
    this.refreshButtonPos();
    sizeHandler();
    
    // Запрашиваем информацию об оппоненте для сетевой игры
    if (s_iPlayerMode === GAME_MODE_TWO && socket && playerId) {
      // Запрашиваем информацию об оппоненте у сервера
      try {
        console.log("CGame: Запрос информации об оппоненте при старте игры, playerId:", playerId);
        
        // Определяем ID оппонента из gameId (формат id_game_timestamp_userId_opponentId или наоборот)
        var gameId = window.MULTIPLAYER_GAME_ID || "";
        var opponentId = "";
        
        if (gameId && gameId.includes('_')) {
          var parts = gameId.split('_');
          if (parts.length >= 5) {
            // ID пользователей находятся в конце gameId после timestamp
            var user1 = parts[3];
            var user2 = parts[4];
            
            // Определяем кто из них текущий пользователь, а кто оппонент
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe.user) {
              var telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
              var myId = telegramUser.id.toString();
              
              if (myId === user1) {
                opponentId = user2;
              } else if (myId === user2) {
                opponentId = user1;
              }
            }
          }
        }
        
        if (opponentId) {
          console.log("CGame: Запрашиваем информацию об оппоненте с ID:", opponentId);
          socket.emit("telegram-get-opponent-info", {
            userId: playerId,
            opponentId: opponentId,
            sessionId: gameId
          });
        } else {
          console.log("CGame: Не удалось определить ID оппонента из gameId:", gameId);
        }
      } catch (e) {
        console.error("CGame: Ошибка при запросе информации об оппоненте:", e);
      }
    }

    // Добавляем обработчик для получения информации об оппоненте
    if (s_iPlayerMode === GAME_MODE_TWO && socket) {
      socket.on("telegram-opponent-info", function(data) {
        console.log("CGame: Получена информация об оппоненте:", data);
        
        if (data && data.success && data.opponentInfo) {
          var opponentFirstName = data.opponentInfo.firstName || "";
          
          if (opponentFirstName) {
            console.log("CGame: Обновляем имя оппонента на:", opponentFirstName);
            s_oTelegramOpponentName = opponentFirstName;
            
            // Обновляем имя оппонента в интерфейсе
            s_oGame.updateOpponentName(opponentFirstName);
          }
        }
      });
      
      // Обработчик нового события для запуска игры
      socket.on("telegram-start-multiplayer-game", function(data) {
        console.log("CGame: Получено уведомление о запуске мультиплеерной игры:", data);
        
        // Сохраняем роль игрока (player1 или player2)
        if (data && data.pid) {
          window.PLAYER_ROLE = data.pid;
          console.log("CGame: Установлена роль игрока:", data.pid);
          
          // Если игра уже инициализирована, запускаем монетку и начинаем игру
          if (_oTable) {
            console.log("CGame: Запуск игры с ролью", data.pid);
            _oTable.startNetGame(data.pid === "player1" ? "player1" : "player2");
          }
        }
      });
    }
  };

  this.onMessage = function (msg) {
    if (_oTable.getSelfPid() == msg.pid) {
      $("#message_contant").append(
        `<p class='messa_self'> > ${msg.content} </p>`
      );
    } else {
      $("#message_contant").append(
        `<p class='message_other'> ${msg.content} < </p>`
      );
    }

    // divElement.scrollTop = divElement.scrollHeight;
    $("#message_contant").scrollTop($("#message_contant")[0].scrollHeight);
  };

  this.onKeyDown = function (e) {
    if (e.keyCode == 13) {
      var msg = $("#input_message").val();
      if (msg.length > 0) {
        $("#input_message").val("");
        socket.emit("send-message", msg);
        // $(".message_contant").addChild(`<p class='messa_self'> >${msg}< </p>`);
      }
    }
    $("#input_message").focus();
  };
  this._startInteractiveHelp = function () {
    if (!_oInteractiveHelp) {
      return;
    }

    if (s_bMobile) {
      _oInteractiveHelp.startTutorial({
        tutorial: TUTORIAL_MOVE_STICK_MOBILE,
        info: {
          movement: false,
          on_show_tutorial: undefined,
        },
      });
      _oInteractiveHelp.startTutorial({
        tutorial: TUTORIAL_SHOT_MOBILE,
        info: {
          movement: false,
          on_show_tutorial: undefined,
          param: _oShotPowerBar,
        },
      });
      _oInteractiveHelp.startTutorial({
        tutorial: TUTORIAL_MOVE_STICK_BUTTONS,
        info: {
          movement: false,
          on_show_tutorial: undefined,
        },
      });
    } else {
      _oInteractiveHelp.startTutorial({
        tutorial: TUTORIAL_SHOT_DESKTOP,
        info: {
          movement: false,
          on_show_tutorial: undefined,
          param: _oShotPowerBar,
        },
      });
    }

    _oInteractiveHelp.startTutorial({
      tutorial: TUTORIAL_CUE_EFFECT,
      info: {
        movement: false,
        on_show_tutorial: undefined,
      },
    });

    _oInteractiveHelp.startTutorial({
      tutorial: TUTORIAL_RESPOT_CUE,
      info: {
        movement: false,
        on_show_tutorial: undefined,
      },
    });
  };

  this._onMouseDownPowerBar = function () {
    if (s_iPlayerMode !== GAME_MODE_CPU) {
      s_oTable._onMouseDownPowerBar();
    }
    s_oTable.startToShot();
    
    // Устанавливаем подсветку при первом ударе
    this._setInitialHighlight();
  };

  // Метод для установки начальной подсветки при первом ударе
  this._setInitialHighlight = function() {
    // Проверяем, что игра сетевая и это первый удар
    if (s_iPlayerMode === GAME_MODE_TWO && _oTable && _oTable.isBreakShot && _oTable.isBreakShot()) {
      console.log("Setting initial highlight for first shot in network game");
      
      // Определяем, кто делает первый удар (текущий игрок или оппонент)
      var isMyTurn = _oTable.isMyTurn ? _oTable.isMyTurn() : false;
      
      console.log("_setInitialHighlight: isMyTurn=", isMyTurn);
      
      if (isMyTurn) {
        // Если удар делает текущий игрок, подсвечиваем левую сторону
        _oPlayer1.highlight();
        _oPlayer2.unlight();
        console.log("Первый удар - подсвечен текущий игрок (левая панель)");
      } else {
        // Если удар делает оппонент, подсвечиваем правую сторону
        _oPlayer2.highlight();
        _oPlayer1.unlight();
        console.log("Первый удар - подсвечен оппонент (правая панель)");
      }
    }
  };

  this._onPressMovePowerBar = function (iOffset) {
    if (s_iPlayerMode !== GAME_MODE_CPU) {
      // s_oTable._onPressMoveHitArea();
    }
    s_oTable.holdShotStickMovement(iOffset);
  };

  this._onPressUpPowerBar = function () {
    if (s_iPlayerMode !== GAME_MODE_CPU) {
      s_oTable._onReleaseHitArea();
    }
    if (s_oTable.startStickAnimation()) {
      _oShotPowerBar.setInput(false);
      
      // Устанавливаем подсветку при первом ударе
      this._setInitialHighlight();
    }
  };

  this.hideShotBar = function () {
    if (s_bMobile) {
      _oShotPowerBar.hide();
    }
  };

  this.showShotBar = function () {
    if (s_bMobile) {
      _oShotPowerBar.show();
    }
  };

  this._onEndTutorial = function () {
    $("#canvas_upper_3d").css("pointer-events", "none");
    _bUpdate = true;

    if (s_bMobile) {
      _oShotPowerBar.initEventListener();
      _oShotPowerBar.addEventListener(
        ON_MOUSE_DOWN_POWER_BAR,
        this._onMouseDownPowerBar,
        this
      );
      _oShotPowerBar.addEventListener(
        ON_PRESS_MOVE_POWER_BAR,
        this._onPressMovePowerBar,
        this
      );
      _oShotPowerBar.addEventListener(
        ON_PRESS_UP_POWER_BAR,
        this._onPressUpPowerBar,
        this
      );
      _oShotPowerBar.show();
    }

    if (_oInteractiveHelp) {
      _oInteractiveHelp.unload();
      _oInteractiveHelp = null;
      localStorage.setItem("8ball_game_helped", true);
    }
  };

  this._onPressDownStickCommand = function (iDir) {
    _iDirStickCommand = iDir;
    _bHoldStickCommand = true;
    _iDirStickSpeedCommand = COMMAND_STICK_START_SPEED;
  };

  this._onPressUpStickCommand = function () {
    _bHoldStickCommand = false;
  };

  this.unload = function (oCbCompleted = null, oCbScope) {
    _bUpdate = false;

    if (s_iPlayerMode !== GAME_MODE_CPU) {
      $(_messagebar).hide();
      document.removeEventListener("keydown", this.onKeyDown);
      socket.removeEventListener("send-message", this.onMessage);
    }

    var oFade = new createjs.Shape();
    oFade.graphics
      .beginFill("black")
      .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    oFade.alpha = 0;
    s_oStageUpper3D.addChild(oFade);
    createjs.Tween.get(oFade)
      .to({ alpha: 1 }, 700, createjs.Ease.cubicIn)
      .call(function () {
        _oTable.unload();
        _oInterface.unload();
        _oScenario.unload();
        _oGameOverPanel.unload();
        _oNetGameOverPanel.unload();
        s_oStageUpper3D.removeAllChildren();
        s_oStage.removeAllChildren();
        if (oCbCompleted !== null) {
          oCbCompleted.call(oCbScope);
        }
      });
  };

  this.reset = function () {
    _iCurTurn = 1;
    _bSuitAssigned = false;
  };

  this.refreshButtonPos = function() {
    // Проверяем существование объектов перед вызовом методов
    if (_oInterface) {
        _oInterface.refreshButtonPos();
    }
    
    if (_oPlayer1) {
        _oPlayer1.refreshButtonPos();
    }
    
    if (_oPlayer2) {
        _oPlayer2.refreshButtonPos();
    }

    if (_oCointainerShotPowerBarInput && _oContainerShotPowerBar) {
        _oCointainerShotPowerBarInput.x = _oContainerShotPowerBar.x = s_iOffsetX * 0.5;
    }

    if (_oInteractiveHelp) {
        _oInteractiveHelp.refreshButtonsPos();
    }
    
    if (_oScoreGUI) {
        _oScoreGUI.refreshButtonPos();
    }
  };
    
  //set the lowest ball currently on the table in the player interface
  this.setNextBallToHit = function (iNextBall, curTurn) {
    if (curTurn) {
      if (_oTable.getSelfPid() == "player1") {
        if (curTurn === 1) {
          _oPlayer2.setBallVisible(false);
          _oPlayer1.setBall(iNextBall);
        } else {
          _oPlayer1.setBallVisible(false);
          _oPlayer2.setBall(iNextBall);
        }
      } else {
        if (curTurn === 1) {
          _oPlayer1.setBallVisible(false);
          _oPlayer2.setBall(iNextBall);
        } else {
          _oPlayer2.setBallVisible(false);
          _oPlayer1.setBall(iNextBall);
        }
      }
    } else {
      if (_iCurTurn === 1) {
        _oPlayer2.setBallVisible(false);
        _oPlayer1.setBall(iNextBall);
      } else {
        _oPlayer1.setBallVisible(false);
        _oPlayer2.setBall(iNextBall);
      }
    }
  };

  //change player turn
  this.changeTurn = function (bFault) {
    console.log("changeTurn: current =", _iCurTurn, "selfPid =", _oTable ? _oTable.getSelfPid() : "unknown");
    
    if (_iCurTurn === 1) {
      _iCurTurn = 2;
    } else {
      _iCurTurn = 1;
    }

    if (!s_oTable.isCpuTurn()) {
      s_oGame.showShotBar();
    }

    // В сетевой игре позиции игроков фиксированы:
    // _oPlayer1 (left) - всегда локальный игрок
    // _oPlayer2 (right) - всегда оппонент
    if (s_iPlayerMode === GAME_MODE_TWO && _oTable && _oTable.isMyTurn) {
      // Определяем, кто сейчас ходит - текущий игрок или оппонент
      var isMyTurn = _oTable.isMyTurn();
      
      if (isMyTurn) {
        // Если ход текущего игрока, подсвечиваем левую панель (свою)
        _oPlayer1.highlight();
        _oPlayer2.unlight();
        s_oGame.showShotBar(); // Показываем панель силы удара, если ходит текущий игрок
        console.log("Ход текущего игрока (левая панель)");
      } else {
        // Если ход оппонента, подсвечиваем правую панель (оппонента)
        _oPlayer2.highlight();
        _oPlayer1.unlight();
        s_oGame.hideShotBar(); // Скрываем панель силы удара, если ходит оппонент
        console.log("Ход оппонента (правая панель)");
      }
    } else {
      // В обычной игре просто подсвечиваем по очереди
      if (_iCurTurn === 1) {
        _oPlayer1.highlight();
        _oPlayer2.unlight();
        s_oGame.showShotBar();
      } else {
        _oPlayer2.highlight();
        _oPlayer1.unlight();
        if (!s_oTable.isCpuTurn()) {
          s_oGame.showShotBar();
        } else {
          s_oGame.hideShotBar();
        }
      }
    }
    
    s_oInterface.resetSpin();

    if (bFault) {
      new CEffectText(TEXT_FAULT, s_oStageUpper3D);
    } else {
      new CEffectText(TEXT_CHANGE_TURN, s_oStageUpper3D);
    }
  };

  this.netChangeTurn = function (pid, bFault) {
    console.log("netChangeTurn: pid =", pid);
    
    // Обновляем _iCurTurn на основе pid
    _iCurTurn = pid;
    
    // Сначала снимаем подсветку с обоих игроков
    if (_oPlayer1 && _oPlayer2) {
      _oPlayer1.unlight();
      _oPlayer2.unlight();
    }
    
    // Определяем, кто сейчас ходит - текущий игрок или оппонент
    var isMyTurn = _oTable && _oTable.isMyTurn ? _oTable.isMyTurn() : false;
    
    console.log("netChangeTurn: isMyTurn =", isMyTurn);
    
    // Используем ту же логику, что и в setInitialPlayerHighlight
    if (isMyTurn) {
      // Если ход текущего игрока, подсвечиваем ЛЕВУЮ панель (свою)
      if (_oPlayer1) {
        _oPlayer1.highlight();
        console.log("Подсвечен текущий игрок (левый)");
        this.showShotBar(); // Показываем панель силы удара
      }
    } else {
      // Если ход оппонента, подсвечиваем ПРАВУЮ панель (оппонента)
      if (_oPlayer2) {
        _oPlayer2.highlight();
        console.log("Подсвечен оппонент (правый)");
        this.hideShotBar(); // Скрываем панель силы удара
      }
    }

    if (bFault == 1) {
      new CEffectText(TEXT_FAULT, s_oStageUpper3D);
    } else {
      new CEffectText(TEXT_CHANGE_TURN, s_oStageUpper3D);
    }
  };

  this.assignSuits = function (iBallNumber) {
    _aSuitePlayer = new Array();
    if (iBallNumber < 8) {
      if (_iCurTurn === 1) {
        _aSuitePlayer[0] = "solid";
        _aSuitePlayer[1] = "stripes";
        this.setBallInInterface("solid");
      } else {
        _aSuitePlayer[0] = "stripes";
        _aSuitePlayer[1] = "solid";
        this.setBallInInterface("stripes");
      }
    } else {
      if (_iCurTurn === 1) {
        _aSuitePlayer[0] = "stripes";
        _aSuitePlayer[1] = "solid";
        this.setBallInInterface("stripes");
      } else {
        _aSuitePlayer[0] = "solid";
        _aSuitePlayer[1] = "stripes";
        this.setBallInInterface("solid");
      }
    }
    _bSuitAssigned = true;
  };

  this.setBallInInterface = function (szSuites1) {
    if (szSuites1 == "solid") {
      _oPlayer1.setBall(2);
      _oPlayer2.setBall(15);
    } else {
      _oPlayer1.setBall(15);
      _oPlayer2.setBall(2);
    }
  };

  this.setNetBallInInterface = function (szSuites1) {
    console.log(szSuites1, _oTable.getSelfPid());
    if (_oTable.getSelfPid() == "player1") {
      if (szSuites1 == "solid") {
        _oPlayer1.setBall(2);
        _oPlayer2.setBall(15);
      } else {
        _oPlayer1.setBall(15);
        _oPlayer2.setBall(2);
      }
    } else {
      if (szSuites1 == "solid") {
        _oPlayer1.setBall(15);
        _oPlayer2.setBall(2);
      } else {
        _oPlayer1.setBall(2);
        _oPlayer2.setBall(15);
      }
    }
  };

  this.isLegalShotFor8Ball = function (iBall, iNumBallToPot) {
    if (_bSuitAssigned) {
      if (_aSuitePlayer[_iCurTurn - 1] == "solid" && iBall < 8) {
        return true;
      } else {
        if (_aSuitePlayer[_iCurTurn - 1] == "stripes" && iBall > 8) {
          return true;
        } else if (iBall == 8 && iNumBallToPot == 0) {
          return true;
        } else {
          return false;
        }
      }
    } else {
      if (iBall != 8) {
        return true;
      } else {
        return false;
      }
    }
  };

  this.increaseWinStreak = function () {
    _iWinStreak++;
    //oWinStreak.text = "Win Streak: "+CAppBiliardo.m_iWinStreak;
  };

  this.resetWinStreak = function () {
    _iWinStreak = 0;
    //oWinStreak.text = "Win Streak: "+_iWinStreak;
  };

  this.gameOver = function (szText) {
    _oGameOverPanel.show(szText);
    $("#canvas_upper_3d").css("pointer-events", "initial");
    _bUpdate = false;
  };

  this._netgameOver = function (szText) {
    _oNetGameOverPanel.show(szText);
    $("#canvas_upper_3d").css("pointer-events", "initial");
    _bUpdate = false;
  };

  this._netshowWinPanel = function (szText) {
    var iScore = s_iGameMode === GAME_MODE_CPU ? _iScore : undefined;
    _oNetGameOverPanel.show(szText, iScore);
    $("#canvas_upper_3d").css("pointer-events", "initial");
    _bUpdate = false;
  };

  this.showWinPanel = function (szText) {
    var iScore = s_iGameMode === GAME_MODE_CPU ? _iScore : undefined;
    _oGameOverPanel.show(szText, iScore);
    $("#canvas_upper_3d").css("pointer-events", "initial");
    _bUpdate = false;
  };

  this.onExit = function () {
    _oScenario.update();
    tweenVolume("soundtrack", SOUNDTRACK_VOLUME_DEFAULT, 1000);
    this.unload(s_oMain.gotoMenu, s_oMain);
    $(s_oMain).trigger("show_interlevel_ad");
    $(s_oMain).trigger("end_session");
  };

  this.onNetExit = function () {
    _oScenario.update();
    tweenVolume("soundtrack", SOUNDTRACK_VOLUME_DEFAULT, 1000);
    this.unload(s_oMain.gotoMenu, s_oMain);
    $(s_oMain).trigger("show_interlevel_ad");
    $(s_oMain).trigger("end_session");
  };
  this.restartGame = function () {
    _oScenario.update();
    this.unload(s_oMain.gotoGame, s_oMain);

    $(s_oMain).trigger("show_interlevel_ad");
    $(s_oMain).trigger("end_session");
  };

  this.updateScore = function (iVal) {
    if (!_oScoreGUI) {
      return;
    }

    var iNewScore = _iScore + iVal;

    _iScore = iNewScore < 0 ? 0 : iNewScore;

    _oScoreGUI.refreshScore(_iScore);
    _oScoreGUI.highlight();
  };

  this.getCurTurn = function () {
    return _iCurTurn;
  };

  this.getNextTurn = function () {
    return _iCurTurn === 1 ? 2 : 1;
  };

  this.getSuiteForCurPlayer = function () {
    return _aSuitePlayer[_iCurTurn - 1];
  };

  this.isSuiteAssigned = function () {
    return _bSuitAssigned;
  };

  this.getPlayer1Name = function () {
    return _oPlayer1.getPlayerName();
  };

  this.getPlayer2Name = function () {
    return _oPlayer2.getPlayerName();
  };

  // Метод для обновления имени оппонента
  this.updateOpponentName = function(opponentName) {
    if (!_oPlayer2 || !opponentName) {
      return;
    }
    
    // Не будем заменять имя на "Игрок", просто используем полученное firstName
    console.log("CGame updateOpponentName: Обновление имени оппонента на", opponentName);
    _oPlayer2.setName(opponentName);
  };

  this._updateInput = function () {
    if (!_bHoldStickCommand) {
      return;
    }

    _oTable.rotateStick(_iDirStickCommand * _iDirStickSpeedCommand);
    _iDirStickSpeedCommand += COMMAND_STICK_SPEED_INCREMENT;

    if (_iDirStickSpeedCommand >= COMMAND_STICK_MAX_SPEED) {
      _iDirStickSpeedCommand = COMMAND_STICK_MAX_SPEED;
    }
  };

  this.update = function () {
    if (_bUpdate === false) {
      return;
    }

    this._updateInput();

    _oTable.update();
    _oScenario.update();
  };

  // Метод для установки начальной подсветки игроков на основе текущего состояния
  this.setInitialPlayerHighlight = function() {
    console.log("CGame setInitialPlayerHighlight: режим игры =", s_iPlayerMode);
    
    if (s_iPlayerMode === GAME_MODE_TWO) {
      try {
        // Сначала снимаем подсветку с обоих игроков
        if (_oPlayer1 && _oPlayer2) {
          _oPlayer1.unlight();
          _oPlayer2.unlight();
        }
        
        // Проверяем, определен ли игрок как player1 или player2
        var isPlayer1 = _oTable && _oTable.isPlayer1 ? _oTable.isPlayer1() : false;
        var isPlayer2 = _oTable && _oTable.isPlayer2 ? _oTable.isPlayer2() : false;
        
        // Определяем, чей сейчас ход
        var isMyTurn = _oTable && _oTable.isMyTurn ? _oTable.isMyTurn() : false;
        
        console.log("CGame setInitialPlayerHighlight: Проверка типа игрока через новые методы:", 
                    "isPlayer1() =", isPlayer1, 
                    "isPlayer2() =", isPlayer2,
                    "isMyTurn() =", isMyTurn);
        
        // НОВАЯ ЛОГИКА ПОДСВЕТКИ
        // 1. Если это ваш ход:
        //    - Player1: подсвечиваем ЛЕВУЮ панель (своё имя)
        //    - Player2: подсвечиваем ЛЕВУЮ панель (своё имя)
        // 2. Если это ход оппонента:
        //    - Player1: подсвечиваем ПРАВУЮ панель (имя оппонента)
        //    - Player2: подсвечиваем ПРАВУЮ панель (имя оппонента)
        
        if (isMyTurn) {
          // Если сейчас ваш ход - подсвечиваем ЛЕВУЮ панель (ваше имя)
          if (_oPlayer1) {
            _oPlayer1.highlight();
            _oPlayer2.unlight();
            console.log("CGame setInitialPlayerHighlight: Ваш ход - подсвечена ЛЕВАЯ панель (ваше имя)");
            this.showShotBar();
          }
        } else {
          // Если сейчас ход оппонента - подсвечиваем ПРАВУЮ панель (имя оппонента)
          if (_oPlayer2) {
            _oPlayer2.highlight();
            _oPlayer1.unlight();
            console.log("CGame setInitialPlayerHighlight: Ход оппонента - подсвечена ПРАВАЯ панель (имя оппонента)");
            this.hideShotBar();
          }
        }
        
        return; // Завершаем метод, так как логика подсветки полностью определена
        
        // СТАРАЯ ЛОГИКА - больше не используется
        if (isPlayer1) {
          // Это player1
          if (_oPlayer1) {
            _oPlayer1.highlight();
            console.log("CGame setInitialPlayerHighlight: Player1 - подсвечена ЛЕВАЯ панель");
            this.showShotBar();
          }
          return;
        } 
        
        if (isPlayer2) {
          // Это player2
          if (_oPlayer2) {
            _oPlayer2.highlight();
            console.log("CGame setInitialPlayerHighlight: Player2 - подсвечена ПРАВАЯ панель");
            this.showShotBar();
          }
          return;
        }
        
        // Запасные варианты определения типа игрока...
        // ... existing code ...
        
      } catch (e) {
        console.error("CGame setInitialPlayerHighlight: ошибка при определении активного игрока", e);
      }
    } else {
      // В обычной игре против компьютера
      if (_iCurTurn === 1) {
        _oPlayer1.highlight();
        _oPlayer2.unlight();
      } else {
        _oPlayer2.highlight();
        _oPlayer1.unlight();
      }
    }
  };

  s_oGame = this;

  this._init();
}

var s_oGame = null;