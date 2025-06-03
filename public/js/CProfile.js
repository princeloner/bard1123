function CProfile() {
    var _oContainer;
    var _oButExit;
    var _oFade;
    var _oProfilePanel;
    var _pStartPosExit;
    
    this._init = function() {
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        // Создаем затемненный фон
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oFade.alpha = 0.7;
        _oContainer.addChild(_oFade);
        
        // Создаем панель профиля
        var oBg = new createjs.Shape();
        oBg.graphics.beginFill("#2C3E50").drawRoundRect(0, 0, 800, 600, 10);
        _oProfilePanel = new createjs.Container();
        _oProfilePanel.addChild(oBg);
        _oProfilePanel.x = CANVAS_WIDTH/2 - 400;
        _oProfilePanel.y = CANVAS_HEIGHT/2 - 300;
        _oContainer.addChild(_oProfilePanel);
        
        // Заголовок профиля
        var oTitle = new createjs.Text("ПРОФИЛЬ ИГРОКА", "bold 36px " + FONT_GAME, "#ffffff");
        oTitle.textAlign = "center";
        oTitle.x = 400;
        oTitle.y = 40;
        _oProfilePanel.addChild(oTitle);
        
        // Добавляем статистику игрока
        this._createPlayerStats();
        
        // Кнопка выхода
        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _pStartPosExit = {x: 740, y: 40};
        _oButExit = new CGfxButton(_pStartPosExit.x, _pStartPosExit.y, oSprite, _oProfilePanel);
        _oButExit.addEventListener(ON_MOUSE_UP, this._onExit, this);
        
        // Анимация появления
        _oContainer.alpha = 0;
        createjs.Tween.get(_oContainer).to({alpha:1}, 300);
    };
    
    this._createPlayerStats = function() {
        var startY = 120;
        var lineHeight = 50;
        
        // Получаем данные игрока из Telegram или используем тестовые данные
        var playerData = {
            name: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || "Гость",
            gamesPlayed: s_oLocalStorage.getItem('games_played') || 0,
            gamesWon: s_oLocalStorage.getItem('games_won') || 0,
            winRate: "0%",
            rating: s_oLocalStorage.getItem('player_rating') || 1000
        };
        
        // Вычисляем процент побед
        if (playerData.gamesPlayed > 0) {
            playerData.winRate = Math.round((playerData.gamesWon / playerData.gamesPlayed) * 100) + "%";
        }
        
        var stats = [
            {label: "Имя:", value: playerData.name},
            {label: "Сыграно игр:", value: playerData.gamesPlayed},
            {label: "Побед:", value: playerData.gamesWon},
            {label: "Процент побед:", value: playerData.winRate},
            {label: "Рейтинг:", value: playerData.rating}
        ];
        
        stats.forEach((stat, index) => {
            var y = startY + (lineHeight * index);
            
            // Метка
            var label = new createjs.Text(stat.label, "24px " + FONT_GAME, "#7F8C8D");
            label.x = 100;
            label.y = y;
            _oProfilePanel.addChild(label);
            
            // Значение
            var value = new createjs.Text(stat.value, "bold 24px " + FONT_GAME, "#ECF0F1");
            value.x = 300;
            value.y = y;
            _oProfilePanel.addChild(value);
        });
    };
    
    this._onExit = function() {
        createjs.Tween.get(_oContainer)
            .to({alpha: 0}, 300)
            .call(function() {
                s_oStage.removeChild(_oContainer);
                s_oMain.gotoMenu();
            });
    };
    
    this._init();
    
    return this;
}
