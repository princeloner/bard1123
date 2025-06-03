function CAdminPanel() {
  var _pStartPosExit;
  var _oBg;
  var _oButExit;
  var _oFade;
  var _oContainer;
  var _oTitleText;
  var _oTabContainer;
  var _oContentContainer;
  var _aTabButtons = [];
  var _iCurrentTab = 0;
  
  // Статистика
  var _oUserStatsContainer;
  var _oTransactionsContainer;
  var _oGameStatsContainer;
  var _oSettingsContainer;
  
  // Данные
  var _aUsers = [];
  var _aTransactions = [];
  var _aGames = [];
  
  this._init = function() {
    _oBg = createBitmap(s_oSpriteLibrary.getSprite("bg_menu"));
    s_oStage.addChild(_oBg);
    
    _oContainer = new createjs.Container();
    s_oStage.addChild(_oContainer);
    
    // Создаем затемнение
    _oFade = new createjs.Shape();
    _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    _oFade.alpha = 0.7;
    _oContainer.addChild(_oFade);
    
    // Заголовок админ-панели
    _oTitleText = new createjs.Text("АДМИН ПАНЕЛЬ", "50px " + FONT_GAME, "#ffffff");
    _oTitleText.x = CANVAS_WIDTH / 2;
    _oTitleText.y = 80;
    _oTitleText.textAlign = "center";
    _oContainer.addChild(_oTitleText);
    
    // Создаем кнопку выхода
    var oSpriteExit = s_oSpriteLibrary.getSprite("but_exit");
    _pStartPosExit = {
      x: CANVAS_WIDTH - oSpriteExit.width / 2 - 10,
      y: oSpriteExit.height / 2 + 10
    };
    
    _oButExit = new CGfxButton(
      _pStartPosExit.x,
      _pStartPosExit.y,
      oSpriteExit,
      _oContainer
    );
    _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
    
    // Создаем контейнер для вкладок
    _oTabContainer = new createjs.Container();
    _oTabContainer.x = 50;
    _oTabContainer.y = 150;
    _oContainer.addChild(_oTabContainer);
    
    // Создаем контейнер для содержимого
    _oContentContainer = new createjs.Container();
    _oContentContainer.x = 50;
    _oContentContainer.y = 200;
    _oContainer.addChild(_oContentContainer);
    
    // Создаем вкладки
    this._createTabs();
    
    // Загружаем данные
    this._loadData();
    
    // Показываем первую вкладку по умолчанию
    this._showTab(0);
    
    // Анимация появления
    _oContainer.alpha = 0;
    createjs.Tween.get(_oContainer).to({alpha: 1}, 300);
  };
  
  this._createTabs = function() {
    // Определения вкладок: [название, callback]
    var tabs = [
      ["Статистика игроков", this._showUserStats.bind(this)],
      ["Транзакции", this._showTransactions.bind(this)],
      ["Статистика игр", this._showGameStats.bind(this)],
      ["Настройки", this._showSettings.bind(this)]
    ];
    
    var startX = 0;
    var tabWidth = 200;
    var tabHeight = 40;
    var spacing = 10;
    
    // Создаем кнопки вкладок
    for (var i = 0; i < tabs.length; i++) {
      var tabContainer = new createjs.Container();
      tabContainer.x = startX;
      tabContainer.y = 0;
      _oTabContainer.addChild(tabContainer);
      
      // Фон вкладки
      var tabBg = new createjs.Shape();
      tabBg.graphics.beginFill("#444444").drawRoundRect(0, 0, tabWidth, tabHeight, 5);
      tabContainer.addChild(tabBg);
      
      // Текст вкладки
      var tabText = new createjs.Text(tabs[i][0], "20px " + FONT_GAME, "#FFFFFF");
      tabText.textAlign = "center";
      tabText.textBaseline = "middle";
      tabText.x = tabWidth / 2;
      tabText.y = tabHeight / 2;
      tabContainer.addChild(tabText);
      
      // Добавляем интерактивность
      tabContainer.cursor = "pointer";
      tabContainer.on("click", this._createTabClickHandler(i, tabs[i][1]));
      
      // Эффекты наведения
      tabContainer.on("mouseover", function(tabBg) {
        return function() {
          tabBg.graphics.clear().beginFill("#555555").drawRoundRect(0, 0, tabWidth, tabHeight, 5);
        };
      }(tabBg));
      
      tabContainer.on("mouseout", function(tabBg, index) {
        return function() {
          var color = _iCurrentTab === index ? "#666666" : "#444444";
          tabBg.graphics.clear().beginFill(color).drawRoundRect(0, 0, tabWidth, tabHeight, 5);
        };
      }(tabBg, i));
      
      _aTabButtons.push({
        container: tabContainer,
        background: tabBg,
        text: tabText
      });
      
      startX += tabWidth + spacing;
    }
  };
  
  this._createTabClickHandler = function(index, callback) {
    return function() {
      this._showTab(index);
      if (typeof callback === "function") {
        callback();
      }
    }.bind(this);
  };
  
  this._showTab = function(index) {
    // Обновляем стиль вкладок
    for (var i = 0; i < _aTabButtons.length; i++) {
      var color = i === index ? "#666666" : "#444444";
      _aTabButtons[i].background.graphics.clear().beginFill(color).drawRoundRect(0, 0, 200, 40, 5);
    }
    
    // Обновляем текущую вкладку
    _iCurrentTab = index;
    
    // Очищаем контейнер содержимого
    _oContentContainer.removeAllChildren();
    
    // Показываем содержимое выбранной вкладки
    switch(index) {
      case 0:
        this._showUserStats();
        break;
      case 1:
        this._showTransactions();
        break;
      case 2:
        this._showGameStats();
        break;
      case 3:
        this._showSettings();
        break;
    }
  };
  
  this._loadData = function() {
    // Здесь в реальном приложении будет загрузка данных через API
    // Для примера используем заглушки
    
    // Пример данных пользователей
    _aUsers = [
      { id: 1, name: "Пользователь 1", balance: 100, gamesPlayed: 25, gamesWon: 10 },
      { id: 2, name: "Пользователь 2", balance: 50, gamesPlayed: 18, gamesWon: 5 },
      { id: 3, name: "Пользователь 3", balance: 75, gamesPlayed: 30, gamesWon: 12 }
    ];
    
    // Пример данных транзакций
    _aTransactions = [
      { id: 1, userId: 1, type: "deposit", amount: 20, status: "completed", date: "2023-05-12" },
      { id: 2, userId: 2, type: "withdraw", amount: 10, status: "completed", date: "2023-05-13" },
      { id: 3, userId: 1, type: "deposit", amount: 30, status: "pending", date: "2023-05-14" }
    ];
    
    // Пример данных игр
    _aGames = [
      { id: 1, player1: "Пользователь 1", player2: "Пользователь 2", winner: "Пользователь 1", date: "2023-05-12" },
      { id: 2, player1: "Пользователь 3", player2: "Пользователь 1", winner: "Пользователь 3", date: "2023-05-13" },
      { id: 3, player1: "Пользователь 2", player2: "Пользователь 3", winner: null, date: "2023-05-14", status: "in progress" }
    ];
  };
  
  this._showUserStats = function() {
    _oUserStatsContainer = new createjs.Container();
    _oContentContainer.addChild(_oUserStatsContainer);
    
    // Создаем заголовок
    var statsTitle = new createjs.Text("Статистика игроков", "30px " + FONT_GAME, "#FFFFFF");
    statsTitle.x = CANVAS_WIDTH / 2 - 50;
    statsTitle.y = 0;
    _oUserStatsContainer.addChild(statsTitle);
    
    // Создаем таблицу пользователей
    var startY = 50;
    var rowHeight = 40;
    var colWidths = [50, 200, 150, 150, 150];
    
    // Заголовки столбцов
    var headers = ["ID", "Имя", "Баланс", "Игры", "Победы"];
    for (var i = 0; i < headers.length; i++) {
      var headerText = new createjs.Text(headers[i], "20px " + FONT_GAME, "#FFD700");
      headerText.x = this._getColumnX(colWidths, i);
      headerText.y = startY;
      _oUserStatsContainer.addChild(headerText);
    }
    
    // Данные пользователей
    for (var j = 0; j < _aUsers.length; j++) {
      var user = _aUsers[j];
      var y = startY + rowHeight + (j * rowHeight);
      
      // Добавляем фон строки
      var rowBg = new createjs.Shape();
      rowBg.graphics.beginFill(j % 2 === 0 ? "#333333" : "#3A3A3A").drawRect(0, y - 10, CANVAS_WIDTH - 100, rowHeight);
      _oUserStatsContainer.addChild(rowBg);
      
      // Добавляем данные
      var cells = [
        user.id.toString(),
        user.name,
        user.balance + " TON",
        user.gamesPlayed.toString(),
        user.gamesWon.toString()
      ];
      
      for (var k = 0; k < cells.length; k++) {
        var cellText = new createjs.Text(cells[k], "18px " + FONT_GAME, "#FFFFFF");
        cellText.x = this._getColumnX(colWidths, k);
        cellText.y = y;
        _oUserStatsContainer.addChild(cellText);
      }
      
      // Добавляем кнопку редактирования
      var editButton = this._createButton("Изменить", 800, y, function(userId) {
        return function() {
          this._editUser(userId);
        }.bind(this);
      }.bind(this)(user.id));
      
      _oUserStatsContainer.addChild(editButton);
    }
    
    // Кнопка добавления пользователя
    var addButton = this._createButton("Добавить пользователя", 400, startY + rowHeight * (_aUsers.length + 2), this._addUser.bind(this));
    _oUserStatsContainer.addChild(addButton);
  };
  
  this._showTransactions = function() {
    _oTransactionsContainer = new createjs.Container();
    _oContentContainer.addChild(_oTransactionsContainer);
    
    // Создаем заголовок
    var statsTitle = new createjs.Text("Транзакции", "30px " + FONT_GAME, "#FFFFFF");
    statsTitle.x = CANVAS_WIDTH / 2 - 50;
    statsTitle.y = 0;
    _oTransactionsContainer.addChild(statsTitle);
    
    // Создаем таблицу транзакций
    var startY = 50;
    var rowHeight = 40;
    var colWidths = [50, 150, 150, 150, 150, 200];
    
    // Заголовки столбцов
    var headers = ["ID", "Пользователь", "Тип", "Сумма", "Статус", "Дата"];
    for (var i = 0; i < headers.length; i++) {
      var headerText = new createjs.Text(headers[i], "20px " + FONT_GAME, "#FFD700");
      headerText.x = this._getColumnX(colWidths, i);
      headerText.y = startY;
      _oTransactionsContainer.addChild(headerText);
    }
    
    // Данные транзакций
    for (var j = 0; j < _aTransactions.length; j++) {
      var transaction = _aTransactions[j];
      var y = startY + rowHeight + (j * rowHeight);
      
      // Добавляем фон строки
      var rowBg = new createjs.Shape();
      rowBg.graphics.beginFill(j % 2 === 0 ? "#333333" : "#3A3A3A").drawRect(0, y - 10, CANVAS_WIDTH - 100, rowHeight);
      _oTransactionsContainer.addChild(rowBg);
      
      // Находим имя пользователя
      var userName = "Пользователь " + transaction.userId;
      for (var u = 0; u < _aUsers.length; u++) {
        if (_aUsers[u].id === transaction.userId) {
          userName = _aUsers[u].name;
          break;
        }
      }
      
      // Добавляем данные
      var cells = [
        transaction.id.toString(),
        userName,
        transaction.type === "deposit" ? "Пополнение" : "Вывод",
        transaction.amount + " TON",
        this._getStatusText(transaction.status),
        transaction.date
      ];
      
      for (var k = 0; k < cells.length; k++) {
        var cellText = new createjs.Text(cells[k], "18px " + FONT_GAME, "#FFFFFF");
        cellText.x = this._getColumnX(colWidths, k);
        cellText.y = y;
        _oTransactionsContainer.addChild(cellText);
      }
    }
    
    // Кнопка фильтрации
    var filterButton = this._createButton("Фильтр по дате", 400, startY + rowHeight * (_aTransactions.length + 2), this._filterTransactions.bind(this));
    _oTransactionsContainer.addChild(filterButton);
  };
  
  this._showGameStats = function() {
    _oGameStatsContainer = new createjs.Container();
    _oContentContainer.addChild(_oGameStatsContainer);
    
    // Создаем заголовок
    var statsTitle = new createjs.Text("Статистика игр", "30px " + FONT_GAME, "#FFFFFF");
    statsTitle.x = CANVAS_WIDTH / 2 - 50;
    statsTitle.y = 0;
    _oGameStatsContainer.addChild(statsTitle);
    
    // Создаем таблицу игр
    var startY = 50;
    var rowHeight = 40;
    var colWidths = [50, 200, 200, 200, 150];
    
    // Заголовки столбцов
    var headers = ["ID", "Игрок 1", "Игрок 2", "Победитель", "Дата"];
    for (var i = 0; i < headers.length; i++) {
      var headerText = new createjs.Text(headers[i], "20px " + FONT_GAME, "#FFD700");
      headerText.x = this._getColumnX(colWidths, i);
      headerText.y = startY;
      _oGameStatsContainer.addChild(headerText);
    }
    
    // Данные игр
    for (var j = 0; j < _aGames.length; j++) {
      var game = _aGames[j];
      var y = startY + rowHeight + (j * rowHeight);
      
      // Добавляем фон строки
      var rowBg = new createjs.Shape();
      rowBg.graphics.beginFill(j % 2 === 0 ? "#333333" : "#3A3A3A").drawRect(0, y - 10, CANVAS_WIDTH - 100, rowHeight);
      _oGameStatsContainer.addChild(rowBg);
      
      // Добавляем данные
      var cells = [
        game.id.toString(),
        game.player1,
        game.player2,
        game.winner || (game.status === "in progress" ? "В процессе" : "Ничья"),
        game.date
      ];
      
      for (var k = 0; k < cells.length; k++) {
        var cellText = new createjs.Text(cells[k], "18px " + FONT_GAME, "#FFFFFF");
        cellText.x = this._getColumnX(colWidths, k);
        cellText.y = y;
        _oGameStatsContainer.addChild(cellText);
      }
    }
    
    // Кнопка экспорта
    var exportButton = this._createButton("Экспорт статистики", 400, startY + rowHeight * (_aGames.length + 2), this._exportGameStats.bind(this));
    _oGameStatsContainer.addChild(exportButton);
  };
  
  this._showSettings = function() {
    _oSettingsContainer = new createjs.Container();
    _oContentContainer.addChild(_oSettingsContainer);
    
    // Создаем заголовок
    var settingsTitle = new createjs.Text("Настройки системы", "30px " + FONT_GAME, "#FFFFFF");
    settingsTitle.x = CANVAS_WIDTH / 2 - 50;
    settingsTitle.y = 0;
    _oSettingsContainer.addChild(settingsTitle);
    
    // Создаем настройки
    var startY = 70;
    var settingHeight = 60;
    
    // Добавляем настройки
    var settings = [
      {
        name: "Минимальная ставка",
        value: "10 TON",
        action: this._editMinBet.bind(this)
      },
      {
        name: "Комиссия системы",
        value: "5%",
        action: this._editCommission.bind(this)
      },
      {
        name: "Бонус при регистрации",
        value: "5 TON",
        action: this._editSignupBonus.bind(this)
      },
      {
        name: "Режим технического обслуживания",
        value: "Выключен",
        action: this._toggleMaintenanceMode.bind(this)
      }
    ];
    
    for (var i = 0; i < settings.length; i++) {
      var y = startY + (i * settingHeight);
      
      // Фон настройки
      var settingBg = new createjs.Shape();
      settingBg.graphics.beginFill("#333333").drawRoundRect(0, y - 10, CANVAS_WIDTH - 100, settingHeight - 10, 5);
      _oSettingsContainer.addChild(settingBg);
      
      // Название настройки
      var nameText = new createjs.Text(settings[i].name, "22px " + FONT_GAME, "#FFFFFF");
      nameText.x = 20;
      nameText.y = y;
      _oSettingsContainer.addChild(nameText);
      
      // Значение настройки
      var valueText = new createjs.Text(settings[i].value, "22px " + FONT_GAME, "#FFD700");
      valueText.x = 400;
      valueText.y = y;
      _oSettingsContainer.addChild(valueText);
      
      // Кнопка изменения
      var editButton = this._createButton("Изменить", 700, y + 10, settings[i].action);
      _oSettingsContainer.addChild(editButton);
    }
    
    // Кнопки быстрых действий
    var clearCacheButton = this._createButton("Очистить кэш", 200, startY + settingHeight * (settings.length + 1), this._clearCache.bind(this));
    _oSettingsContainer.addChild(clearCacheButton);
    
    var restartServerButton = this._createButton("Перезапустить сервер", 500, startY + settingHeight * (settings.length + 1), this._restartServer.bind(this));
    _oSettingsContainer.addChild(restartServerButton);
  };
  
  // Вспомогательные методы
  this._getColumnX = function(widths, index) {
    var x = 0;
    for (var i = 0; i < index; i++) {
      x += widths[i];
    }
    return x;
  };
  
  this._getStatusText = function(status) {
    switch(status) {
      case "completed": return "Завершено";
      case "pending": return "В обработке";
      case "failed": return "Ошибка";
      default: return status;
    }
  };
  
  this._createButton = function(text, x, y, callback) {
    var buttonContainer = new createjs.Container();
    buttonContainer.x = x;
    buttonContainer.y = y;
    
    var buttonBg = new createjs.Shape();
    buttonBg.graphics.beginFill("#555555").drawRoundRect(0, 0, 160, 36, 5);
    buttonContainer.addChild(buttonBg);
    
    var buttonText = new createjs.Text(text, "18px " + FONT_GAME, "#FFFFFF");
    buttonText.textAlign = "center";
    buttonText.textBaseline = "middle";
    buttonText.x = 80;
    buttonText.y = 18;
    buttonContainer.addChild(buttonText);
    
    buttonContainer.cursor = "pointer";
    buttonContainer.on("click", callback);
    
    buttonContainer.on("mouseover", function() {
      buttonBg.graphics.clear().beginFill("#666666").drawRoundRect(0, 0, 160, 36, 5);
    });
    
    buttonContainer.on("mouseout", function() {
      buttonBg.graphics.clear().beginFill("#555555").drawRoundRect(0, 0, 160, 36, 5);
    });
    
    return buttonContainer;
  };
  
  // Методы действий - здесь будет взаимодействие с сервером
  this._editUser = function(userId) {
    alertShow("Редактирование пользователя ID: " + userId);
    // В реальном приложении здесь будет открытие диалога редактирования
  };
  
  this._addUser = function() {
    alertShow("Открытие формы добавления пользователя");
    // В реальном приложении здесь будет открытие диалога добавления
  };
  
  this._filterTransactions = function() {
    alertShow("Открытие фильтра транзакций");
    // В реальном приложении здесь будет открытие диалога фильтрации
  };
  
  this._exportGameStats = function() {
    alertShow("Экспорт статистики игр");
    // В реальном приложении здесь будет логика экспорта
  };
  
  this._editMinBet = function() {
    alertShow("Изменение минимальной ставки");
    // В реальном приложении здесь будет открытие диалога редактирования
  };
  
  this._editCommission = function() {
    alertShow("Изменение комиссии системы");
    // В реальном приложении здесь будет открытие диалога редактирования
  };
  
  this._editSignupBonus = function() {
    alertShow("Изменение бонуса при регистрации");
    // В реальном приложении здесь будет открытие диалога редактирования
  };
  
  this._toggleMaintenanceMode = function() {
    alertShow("Переключение режима обслуживания");
    // В реальном приложении здесь будет запрос на сервер
  };
  
  this._clearCache = function() {
    alertShow("Очистка системного кэша");
    // В реальном приложении здесь будет запрос на сервер
  };
  
  this._restartServer = function() {
    alertShow("Запрос на перезапуск сервера");
    // В реальном приложении здесь будет запрос на сервер
  };
  
  this._onExit = function() {
    createjs.Tween.get(_oContainer).to({alpha: 0}, 300).call(function() {
      this.unload();
      s_oMain.gotoMenu();
    }.bind(this));
  };
  
  this.unload = function() {
    // Удаляем обработчики событий
    if (_oButExit) {
      _oButExit.unload();
      _oButExit = null;
    }
    
    // Удаляем обработчики событий для вкладок
    for (var i = 0; i < _aTabButtons.length; i++) {
      _aTabButtons[i].container.removeAllEventListeners();
    }
    
    // Очищаем сцену
    s_oStage.removeChild(_oBg);
    s_oStage.removeChild(_oContainer);
    
    s_oAdminPanel = null;
  };
  
  this.refreshButtonPos = function() {
    if (_oButExit) {
      _oButExit.setPosition(
        _pStartPosExit.x - s_iOffsetX,
        s_iOffsetY + _pStartPosExit.y
      );
    }
  };
  
  s_oAdminPanel = this;
  
  this._init();
}

var s_oAdminPanel = null; 

