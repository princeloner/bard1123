function CGameInvitation(oData) {
  // Глобальная обработка ошибок для компонента
  window.onerror = function(message, source, lineno, colno, error) {
    console.error("CGameInvitation глобальная ошибка:", message, "Источник:", source, "Строка:", lineno);
    return true; // Не останавливаем выполнение
  };

  var _oContainer;
  var _oBackground;
  var _oTitleText;
  var _oInvitationText;
  var _oButAccept;
  var _oButDecline;
  var _oAvatar;
  
  var _gameId = oData.gameId;
  var _fromUserId = oData.fromUserId;
  var _fromUsername = oData.fromUsername;
  var _fromUserAvatar = oData.fromUserAvatar || null;
  var _message = oData.message || null;
  var _callbackAccept;
  var _callbackDecline;
  
  this._init = function() {
    console.log("%cCGameInvitation: Инициализация с данными:", "background: #4CAF50; color: white; padding: 3px;", oData);
    
    try {
      // Проверяем доступность необходимых объектов
      if (!createjs || !createjs.Container) {
        throw new Error("createjs не инициализирован");
      }
      
      if (!s_oStage) {
        throw new Error("s_oStage не инициализирован");
      }
      
      _oContainer = new createjs.Container();
      s_oStage.addChild(_oContainer);
      
      console.log("CGameInvitation: Контейнер создан и добавлен в stage");
      
      // Полупрозрачный фон на весь экран
      _oBackground = new createjs.Shape();
      _oBackground.graphics.beginFill("rgba(0,0,0,0.7)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      _oContainer.addChild(_oBackground);
      
      console.log("CGameInvitation: Фон создан и добавлен в контейнер");
      
      // Создаем UI для приглашения
      this._createInvitationUI();
      
      // Анимируем появление
      _oContainer.alpha = 0;
      createjs.Tween.get(_oContainer).to({alpha: 1}, 300, createjs.Ease.cubicOut);
      
      // Добавляем обновление объекта в общий цикл отрисовки
      if (!this.updateInterval) {
        this.updateInterval = setInterval(function() {
          s_oStage.update();
        }, 100);
      }
      
      // Добавляем звуковое оповещение о приглашении
      if (s_bAudioActive) {
        if (createjs.Sound.isLoaded("notification")) {
          createjs.Sound.play("notification");
          console.log("CGameInvitation: Звук уведомления воспроизведен");
        } else {
          console.warn("CGameInvitation: Звук notification не загружен");
        }
      }
      
      console.log("%cCGameInvitation: Успешно инициализирован", "background: #4CAF50; color: white; padding: 3px;");
      
      // Добавим проверку, что объект действительно отображается
      setTimeout(function() {
        if (_oContainer && _oContainer.visible && _oContainer.alpha > 0) {
          console.log("CGameInvitation: Подтверждено, что объект видим на экране");
        } else {
          console.error("CGameInvitation: Объект не отображается на экране!");
          
          // Пробуем восстановить видимость
          if (_oContainer) {
            _oContainer.visible = true;
            _oContainer.alpha = 1;
            s_oStage.update();
          }
        }
      }, 500);
    } catch (error) {
      console.error("%cCGameInvitation: Критическая ошибка инициализации:", "background: #F44336; color: white; padding: 3px;", error);
      // Пробуем создать аварийное сообщение
      this._createEmergencyMessage(oData);
    }
  };
  
  this._createEmergencyMessage = function(data) {
    try {
      // Проверяем, доступен ли stage
      if (!s_oStage) {
        console.error("s_oStage недоступен для аварийного сообщения");
        return;
      }
      
      // Создаем простое сообщение о приглашении
      var text = new createjs.Text(
        "Приглашение от " + data.fromUsername,
        "30px Arial",
        "#FFFFFF"
      );
      text.x = CANVAS_WIDTH / 2;
      text.y = 100;
      text.textAlign = "center";
      s_oStage.addChild(text);
      
      console.log("CGameInvitation: Создано аварийное сообщение");
    } catch (e) {
      console.error("CGameInvitation: Не удалось создать аварийное сообщение:", e);
    }
  };
  
  this._createInvitationUI = function() {
    console.log("CGameInvitation: Создание UI приглашения");
    try {
      // Контейнер для окна приглашения
      var oInvitationContainer = new createjs.Container();
      oInvitationContainer.x = CANVAS_WIDTH / 2;
      oInvitationContainer.y = CANVAS_HEIGHT / 2;
      _oContainer.addChild(oInvitationContainer);
      
      // Фон окна приглашения с улучшенным стилем
      var oInvitationBg = new createjs.Shape();
      oInvitationBg.graphics.beginFill("rgba(20,20,20,0.95)").drawRoundRect(-200, -150, 400, 300, 15);
      oInvitationBg.graphics.beginStroke("#22A7F0").setStrokeStyle(4).drawRoundRect(-200, -150, 400, 300, 15);
      // Добавляем тень
      oInvitationBg.shadow = new createjs.Shadow("#22A7F0", 0, 0, 15);
      oInvitationContainer.addChild(oInvitationBg);
      
      // Проверяем доступность локализации
      if (typeof TEXT_INVITATION === 'undefined' || typeof s_iCurLang === 'undefined') {
        console.warn("CGameInvitation: Локализация недоступна");
        var titleText = "ПРИГЛАШЕНИЕ В ИГРУ";
      } else {
        var titleText = TEXT_INVITATION[s_iCurLang];
      }
      
      // Заголовок с эффектом
      _oTitleText = new createjs.Text(titleText, "bold 32px " + FONT_GAME, "#FFFFFF");
      _oTitleText.textAlign = "center";
      _oTitleText.y = -120;
      _oTitleText.shadow = new createjs.Shadow("rgba(0,149,255,0.5)", 0, 0, 8);
      oInvitationContainer.addChild(_oTitleText);
      
      // Аватар пользователя (если есть)
      if (_fromUserAvatar) {
        console.log("CGameInvitation: Загружаем аватар:", _fromUserAvatar);
        var img = new Image();
        img.crossOrigin = "Anonymous"; // Разрешаем кросс-доменные изображения
        img.onload = function() {
          console.log("CGameInvitation: Аватар загружен успешно");
          _oAvatar = new createjs.Bitmap(img);
          _oAvatar.x = 0;
          _oAvatar.y = -50;
          _oAvatar.regX = img.width / 2;
          _oAvatar.regY = img.height / 2;
          
          // Масштабируем аватар
          var scale = 80 / Math.max(img.width, img.height);
          _oAvatar.scaleX = _oAvatar.scaleY = scale;
          
          // Делаем аватар круглым
          var mask = new createjs.Shape();
          mask.graphics.beginFill("#fff").drawCircle(0, -50, 40);
          _oAvatar.mask = mask;
          
          oInvitationContainer.addChild(_oAvatar);
          oInvitationContainer.addChild(mask);
          
          // Обновляем отрисовку
          s_oStage.update();
        };
        img.onerror = function(error) {
          console.error("CGameInvitation: Ошибка загрузки аватара:", error);
          // Создаем заглушку в случае ошибки
          _createAvatarPlaceholder(oInvitationContainer);
        };
        img.src = _fromUserAvatar;
      } else {
        console.log("CGameInvitation: Используем заглушку аватара");
        _createAvatarPlaceholder(oInvitationContainer);
      }
      
      // Функция для создания заглушки аватара
      function _createAvatarPlaceholder(container) {
        var placeholder = new createjs.Shape();
        placeholder.graphics.beginFill("#444").drawCircle(0, -50, 40);
        placeholder.graphics.beginStroke("#22A7F0").setStrokeStyle(3).drawCircle(0, -50, 40);
        
        // Улучшенный силуэт пользователя
        placeholder.graphics.beginFill("#666").drawCircle(0, -60, 15); // голова
        placeholder.graphics.beginFill("#666").drawRoundRect(-20, -40, 40, 50, 5); // тело
        
        container.addChild(placeholder);
        
        // Обновляем отрисовку
        s_oStage.update();
      }
      
      // Проверяем текст сообщения
      if (!_message || _message.length === 0) {
        _message = `Игрок ${_fromUsername || "Неизвестный"} \nприглашает вас сыграть!`;
      }
      
      // Текст приглашения с улучшенным форматированием
      _oInvitationText = new createjs.Text(
        _message, 
        "bold 26px " + FONT_GAME, 
        "#FFFFFF"
      );
      _oInvitationText.textAlign = "center";
      _oInvitationText.lineHeight = 34;
      _oInvitationText.y = 20;
      oInvitationContainer.addChild(_oInvitationText);
      
      // Проверяем доступность локализации
      if (typeof TEXT_ACCEPT === 'undefined' || typeof TEXT_DECLINE === 'undefined') {
        console.warn("CGameInvitation: Локализация для кнопок недоступна");
        var acceptText = "ПРИНЯТЬ";
        var declineText = "ОТКЛОНИТЬ";
      } else {
        var acceptText = TEXT_ACCEPT[s_iCurLang];
        var declineText = TEXT_DECLINE[s_iCurLang];
      }
      
      // Кнопка принять с улучшенным стилем
      try {
        // Проверяем доступность спрайта
        if (!s_oSpriteLibrary || !s_oSpriteLibrary.getSprite("but_text")) {
          throw new Error("Спрайт but_text недоступен");
        }
        
        _oButAccept = new CTextButton(
          -80,
          100,
          s_oSpriteLibrary.getSprite("but_text"),
          acceptText,
          FONT_GAME,
          "#ffffff",
          24,
          "center",
          oInvitationContainer
        );
        _oButAccept.addEventListener(ON_MOUSE_UP, this._onAcceptClick, this);
        
        // Кнопка отклонить с улучшенным стилем
        _oButDecline = new CTextButton(
          80,
          100,
          s_oSpriteLibrary.getSprite("but_text"),
          declineText,
          FONT_GAME,
          "#ffffff",
          24,
          "center",
          oInvitationContainer
        );
        _oButDecline.addEventListener(ON_MOUSE_UP, this._onDeclineClick, this);
      } catch (error) {
        console.error("CGameInvitation: Ошибка создания кнопок:", error);
        
        // Создаем аварийные кнопки без использования CTextButton
        this._createEmergencyButtons(oInvitationContainer, acceptText, declineText);
      }
      
      // Анимируем кнопки с более заметной пульсацией
      try {
        if (_oButAccept && _oButAccept.getContainer && _oButDecline && _oButDecline.getContainer) {
          _oButAccept.getContainer().scaleX = _oButAccept.getContainer().scaleY = 0.9;
          _oButDecline.getContainer().scaleX = _oButDecline.getContainer().scaleY = 0.9;
          
          createjs.Tween.get(_oButAccept.getContainer(), {loop: true})
            .to({scaleX: 1.1, scaleY: 1.1}, 800, createjs.Ease.quadOut)
            .to({scaleX: 0.9, scaleY: 0.9}, 800, createjs.Ease.quadIn);
        } else {
          console.warn("CGameInvitation: Невозможно анимировать кнопки - getContainer недоступен");
        }
      } catch (error) {
        console.error("CGameInvitation: Ошибка анимации кнопок:", error);
      }
      
      // Принудительно обновляем отрисовку
      s_oStage.update();
      
      console.log("CGameInvitation: UI приглашения создан успешно");
    } catch (error) {
      console.error("CGameInvitation: Критическая ошибка создания UI:", error);
    }
  };
  
  this._createEmergencyButtons = function(container, acceptText, declineText) {
    try {
      // Создаем простые кнопки вместо CTextButton
      
      // Кнопка принятия
      var acceptContainer = new createjs.Container();
      acceptContainer.x = -80;
      acceptContainer.y = 100;
      container.addChild(acceptContainer);
      
      var acceptBg = new createjs.Shape();
      acceptBg.graphics.beginFill("#22A7F0").drawRoundRect(-70, -20, 140, 40, 10);
      acceptContainer.addChild(acceptBg);
      
      var acceptLabel = new createjs.Text(acceptText, "bold 20px Arial", "#FFFFFF");
      acceptLabel.textAlign = "center";
      acceptLabel.textBaseline = "middle";
      acceptContainer.addChild(acceptLabel);
      
      // Кнопка отклонения
      var declineContainer = new createjs.Container();
      declineContainer.x = 80;
      declineContainer.y = 100;
      container.addChild(declineContainer);
      
      var declineBg = new createjs.Shape();
      declineBg.graphics.beginFill("#F44336").drawRoundRect(-70, -20, 140, 40, 10);
      declineContainer.addChild(declineBg);
      
      var declineLabel = new createjs.Text(declineText, "bold 20px Arial", "#FFFFFF");
      declineLabel.textAlign = "center";
      declineLabel.textBaseline = "middle";
      declineContainer.addChild(declineLabel);
      
      // Добавляем обработчики событий
      acceptContainer.on("click", this._onAcceptClick, this);
      declineContainer.on("click", this._onDeclineClick, this);
      
      console.log("CGameInvitation: Созданы аварийные кнопки");
    } catch (e) {
      console.error("CGameInvitation: Не удалось создать аварийные кнопки:", e);
    }
  };
  
  this._onAcceptClick = function() {
    console.log("CGameInvitation: Нажата кнопка принятия приглашения");
    try {
      if (_callbackAccept) {
        _callbackAccept();
      } else {
        console.warn("CGameInvitation: callbackAccept не определен");
      }
      
      this.unload();
    } catch (error) {
      console.error("CGameInvitation: Ошибка при принятии приглашения:", error);
    }
  };
  
  this._onDeclineClick = function() {
    console.log("CGameInvitation: Нажата кнопка отклонения приглашения");
    try {
      if (_callbackDecline) {
        _callbackDecline();
      } else {
        console.warn("CGameInvitation: callbackDecline не определен");
      }
      
      this.unload();
    } catch (error) {
      console.error("CGameInvitation: Ошибка при отклонении приглашения:", error);
    }
  };
  
  this.setCallbacks = function(cbAccept, cbDecline) {
    console.log("CGameInvitation: Установлены колбэки для кнопок");
    _callbackAccept = cbAccept;
    _callbackDecline = cbDecline;
  };
  
  this.unload = function() {
    console.log("CGameInvitation: Выгрузка приглашения");
    try {
      // Останавливаем интервал обновления
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      createjs.Tween.get(_oContainer).to({alpha: 0}, 300, createjs.Ease.cubicOut).call(function() {
        try {
          if (_oButAccept) {
            _oButAccept.unload();
            _oButAccept = null;
          }
          
          if (_oButDecline) {
            _oButDecline.unload();
            _oButDecline = null;
          }
          
          s_oStage.removeChild(_oContainer);
          console.log("CGameInvitation: Приглашение успешно выгружено");
        } catch (error) {
          console.error("CGameInvitation: Ошибка в колбэке выгрузки:", error);
        }
      });
    } catch (error) {
      console.error("CGameInvitation: Ошибка при выгрузке приглашения:", error);
      
      // Аварийная очистка
      try {
        if (_oContainer) {
          s_oStage.removeChild(_oContainer);
        }
        
        if (_oButAccept) {
          _oButAccept.unload();
        }
        
        if (_oButDecline) {
          _oButDecline.unload();
        }
      } catch (e) {
        console.error("CGameInvitation: Критическая ошибка аварийной очистки:", e);
      }
    }
  };
  
  this._init();
} 