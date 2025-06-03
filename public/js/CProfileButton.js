function CProfileButton(iXPos, iYPos, oParentContainer) {
    var _oButton;
    var _oParentContainer;
    var _aCbCompleted;
    var _aCbOwner;
    
    this._init = function(iXPos, iYPos, oParentContainer) {
        _aCbCompleted = [];
        _aCbOwner = [];
        
        _oParentContainer = oParentContainer;
        
        // Создаем контейнер для кнопки
        _oButton = new createjs.Container();
        _oButton.x = iXPos;
        _oButton.y = iYPos;
        _oButton.cursor = "pointer";
        _oParentContainer.addChild(_oButton);
        
        // Добавляем круглый фон
        var oCircle = new createjs.Shape();
        oCircle.graphics.beginFill("#ffffff").drawCircle(0, 0, 30);
        _oButton.addChild(oCircle);
        
        // Добавляем иконку профиля
        var oProfileSprite = s_oSpriteLibrary.getSprite("profile_icon");
        var oIcon = createBitmap(oProfileSprite);
        oIcon.regX = oProfileSprite.width/2;
        oIcon.regY = oProfileSprite.height/2;
        oIcon.scaleX = oIcon.scaleY = 0.3;
        _oButton.addChild(oIcon);
        
        this._initListener();
    };
    
    this.unload = function() {
        _oButton.off("mousedown");
        _oButton.off("pressup");
        _oParentContainer.removeChild(_oButton);
    };
    
    this.setVisible = function(bVisible) {
        _oButton.visible = bVisible;
    };
    
    this._initListener = function() {
        _oButton.on("mousedown", this.buttonDown);
        _oButton.on("pressup", this.buttonRelease);
    };
    
    this.addEventListener = function(iEvent, cbCompleted, cbOwner) {
        _aCbCompleted[iEvent] = cbCompleted;
        _aCbOwner[iEvent] = cbOwner;
    };
    
    this.buttonRelease = function() {
        if(_aCbCompleted[ON_MOUSE_UP]) {
            _aCbCompleted[ON_MOUSE_UP].call(_aCbOwner[ON_MOUSE_UP]);
        }
    };
    
    this.buttonDown = function() {
        if(_aCbCompleted[ON_MOUSE_DOWN]) {
            _aCbCompleted[ON_MOUSE_DOWN].call(_aCbOwner[ON_MOUSE_DOWN]);
        }
    };
    
    this.setPosition = function(iXPos, iYPos) {
        _oButton.x = iXPos;
        _oButton.y = iYPos;
    };
    
    this._init(iXPos, iYPos, oParentContainer);
    
    return this;
}