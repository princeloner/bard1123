function CShop() {
  var _oFade;
  var _oContainer;
  var _oButExit;
  var _oWalletButton;
  var _oBalanceText;
  var _oItemsContainer;
  var _oTitleText;
  
  var _pStartPosExit;
  
  this._init = function() {
    _oContainer = new createjs.Container();
    s_oStage.addChild(_oContainer);
    
    _oFade = new createjs.Shape();
    _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    _oFade.alpha = 0.7;
    _oContainer.addChild(_oFade);
    
    // Заголовок магазина
    _oTitleText = new createjs.Text(TEXT_SHOP, "50px " + FONT_GAME, "#ffffff");
    _oTitleText.x = CANVAS_WIDTH / 2;
    _oTitleText.y = 80;
    _oTitleText.textAlign = "center";
    _oContainer.addChild(_oTitleText);
    
    // Создаем кнопку подключения кошелька
    _oWalletButton = new CGfxButton(
      CANVAS_WIDTH / 2, 
      150, 
      s_oSpriteLibrary.getSprite("ton_wallet_button"), 
      _oContainer
    );
    _oWalletButton.addEventListener(ON_MOUSE_UP, this._onWalletButtonClick, this);
    
    // Отображение баланса
    _oBalanceText = new createjs.Text("", "24px " + FONT_GAME, "#FFFFFF");
    _oBalanceText.x = CANVAS_WIDTH / 2;
    _oBalanceText.y = 200;
    _oBalanceText.textAlign = "center";
    _oContainer.addChild(_oBalanceText);
    
    // Обновляем статус кошелька
    this._updateWalletStatus();
    
    // Контейнер для предметов магазина
    _oItemsContainer = new createjs.Container();
    _oItemsContainer.y = 250;
    _oContainer.addChild(_oItemsContainer);
    
    // Создаем товары в магазине
    this._createShopItems();
    
    var oSpriteExit = s_oSpriteLibrary.getSprite('but_exit');
    _pStartPosExit = {x: CANVAS_WIDTH - oSpriteExit.width/2 - 10, y: oSpriteExit.height/2 + 10};
    _oButExit = new CGfxButton(_pStartPosExit.x, _pStartPosExit.y, oSpriteExit, _oContainer);
    _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
    
    _oContainer.alpha = 0;
    createjs.Tween.get(_oContainer).to({alpha: 1}, 300);
    
    // Подписываемся на события кошелька
    if(s_oTonWallet) {
      s_oTonWallet.addEventListener(ON_TON_WALLET_CONNECTED, this._onWalletConnected, this);
      s_oTonWallet.addEventListener(ON_TON_WALLET_DISCONNECTED, this._onWalletDisconnected, this);
      s_oTonWallet.addEventListener(ON_TON_BALANCE_UPDATED, this._onBalanceUpdated, this);
    }
  };
  
  this._createShopItems = function() {
    // Очищаем контейнер
    _oItemsContainer.removeAllChildren();
    
    // Создаем кнопки для пополнения баланса
    const depositOptions = [
      { amount: 10, label: "10 TON", price: "$20" },
      { amount: 50, label: "50 TON", price: "$100" },
      { amount: 100, label: "100 TON", price: "$200" }
    ];
    
    const startX = CANVAS_WIDTH / 2 - 220;
    let currentX = startX;
    
    // Создаем кнопки пополнения
    depositOptions.forEach((option, i) => {
      const container = new createjs.Container();
      container.x = currentX;
      container.y = 0;
      
      // Фон кнопки
      const bg = new createjs.Shape();
      bg.graphics.beginFill("#333333").drawRoundRect(0, 0, 200, 150, 10);
      container.addChild(bg);
      
      // Текст с количеством TON
      const amountText = new createjs.Text(option.label, "30px " + FONT_GAME, "#FFD700");
      amountText.textAlign = "center";
      amountText.x = 100;
      amountText.y = 40;
      container.addChild(amountText);
      
      // Цена в USD
      const priceText = new createjs.Text(option.price, "20px " + FONT_GAME, "#FFFFFF");
      priceText.textAlign = "center";
      priceText.x = 100;
      priceText.y = 80;
      container.addChild(priceText);
      
      // Добавляем обработчик клика
      container.cursor = "pointer";
      container.on("click", () => this._onDepositClick(option.amount));
      
      // Добавляем эффекты наведения
      container.on("mouseover", function() {
        bg.graphics.clear().beginFill("#444444").drawRoundRect(0, 0, 200, 150, 10);
      });
      
      container.on("mouseout", function() {
        bg.graphics.clear().beginFill("#333333").drawRoundRect(0, 0, 200, 150, 10);
      });
      
      _oItemsContainer.addChild(container);
      
      currentX += 220;
    });
    
    // Кнопка вывода средств
    const withdrawContainer = new createjs.Container();
    withdrawContainer.x = CANVAS_WIDTH / 2 - 100;
    withdrawContainer.y = 200;
    
    const withdrawBg = new createjs.Shape();
    withdrawBg.graphics.beginFill("#444444").drawRoundRect(0, 0, 200, 60, 10);
    withdrawContainer.addChild(withdrawBg);
    
    const withdrawText = new createjs.Text("Вывести TON", "24px " + FONT_GAME, "#FFFFFF");
    withdrawText.textAlign = "center";
    withdrawText.x = 100;
    withdrawText.y = 20;
    withdrawContainer.addChild(withdrawText);
    
    withdrawContainer.cursor = "pointer";
    withdrawContainer.on("click", () => this._onWithdrawClick());
    
    // Добавляем эффекты наведения
    withdrawContainer.on("mouseover", function() {
      withdrawBg.graphics.clear().beginFill("#555555").drawRoundRect(0, 0, 200, 60, 10);
    });
    
    withdrawContainer.on("mouseout", function() {
      withdrawBg.graphics.clear().beginFill("#444444").drawRoundRect(0, 0, 200, 60, 10);
    });
    
    _oItemsContainer.addChild(withdrawContainer);
  };
  
  this._updateWalletStatus = function() {
    if(s_oTonWallet && s_oTonWallet.isConnected()) {
      // Кошелек подключен - показываем адрес и баланс
      _oWalletButton.changeText(this._formatAddress(s_oTonWallet.getAddress()));
      _oBalanceText.text = "Баланс: " + s_oTonWallet.getFormattedBalance();
    } else {
      // Кошелек не подключен - показываем кнопку подключения
      _oWalletButton.changeText("Подключить TON кошелек");
      _oBalanceText.text = "Подключите кошелек для игры на TON";
    }
  };
  
  this._formatAddress = function(address) {
    if(!address) return "";
    
    // Сокращаем адрес для отображения (первые 6 и последние 4 символа)
    return address.substring(0, 6) + "..." + address.substring(address.length - 4);
  };
  
  this._onWalletButtonClick = function() {
    if(s_oTonWallet) {
      if(s_oTonWallet.isConnected()) {
        // Если кошелек уже подключен - отключаем
        s_oTonWallet.disconnect();
      } else {
        // Иначе подключаем
        s_oTonWallet.connect();
      }
    }
  };
  
  this._onDepositClick = function(amount) {
    if(!s_oTonWallet || !s_oTonWallet.isConnected()) {
      alertShow("Пожалуйста, подключите TON кошелек!");
      return;
    }
    
    s_oTonWallet.deposit(amount);
  };
  
  this._onWithdrawClick = function() {
    if(!s_oTonWallet || !s_oTonWallet.isConnected()) {
      alertShow("Пожалуйста, подключите TON кошелек!");
      return;
    }
    
    // Запрашиваем сумму для вывода
    const amount = parseFloat(prompt("Введите сумму для вывода (TON):", ""));
    
    if(isNaN(amount) || amount <= 0) {
      alertShow("Пожалуйста, введите корректную сумму");
      return;
    }
    
    if(amount > s_oTonWallet.getBalance()) {
      alertShow("Недостаточно средств на балансе");
      return;
    }
    
    s_oTonWallet.withdraw(amount);
  };
  
  this._onWalletConnected = function() {
    this._updateWalletStatus();
  };
  
  this._onWalletDisconnected = function() {
    this._updateWalletStatus();
  };
  
  this._onBalanceUpdated = function() {
    this._updateWalletStatus();
  };
  
  this.unload = function() {
    // Отписываемся от событий
    if(s_oTonWallet) {
      s_oTonWallet.removeEventListener(ON_TON_WALLET_CONNECTED, this._onWalletConnected);
      s_oTonWallet.removeEventListener(ON_TON_WALLET_DISCONNECTED, this._onWalletDisconnected);
      s_oTonWallet.removeEventListener(ON_TON_BALANCE_UPDATED, this._onBalanceUpdated);
    }
    
    _oButExit.unload();
    _oWalletButton.unload();
    s_oStage.removeChild(_oContainer);
  };
  
  this._onExit = function() {
    createjs.Tween.get(_oContainer).to({alpha: 0}, 300).call(function() {
      this.unload();
      s_oMain.gotoMenu();
    }.bind(this));
  };
  
  this._init();
  
  return this;
}