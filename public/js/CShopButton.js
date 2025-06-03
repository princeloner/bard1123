function CShopButton(iXPos, iYPos, oParentContainer) {
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
    
    // Добавляем фон кнопки (круг)
    var oCircle = new createjs.Shape();
    oCircle.graphics.beginFill("#ffffff").drawCircle(0, 0, 30);
    _oButton.addChild(oCircle);
    
    // Добавляем иконку монеты
    var oCoinSprite = s_oSpriteLibrary.getSprite("shop_button");
    var oCoin = createBitmap(oCoinSprite);
    oCoin.regX = oCoinSprite.width/2;
    oCoin.regY = oCoinSprite.height/2;
    oCoin.scaleX = oCoin.scaleY = 0.3;
    _oButton.addChild(oCoin);
    
    // Добавляем текст "SHOP"
    var oText = new createjs.Text("", "16px " + FONT_GAME, "#000000");
    oText.textAlign = "center";
    oText.textBaseline = "middle";
    oText.y = 40;
    _oButton.addChild(oText);
    
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
  
  this.buttonDown = function() {
    _oButton.scaleX = 0.9;
    _oButton.scaleY = 0.9;
  };
  
  this.buttonRelease = function() {
    _oButton.scaleX = 1;
    _oButton.scaleY = 1;
    
    if(_aCbCompleted[ON_MOUSE_UP]){
      _aCbCompleted[ON_MOUSE_UP].call(_aCbOwner[ON_MOUSE_UP]);
    }
  };
  
  this.setPosition = function(iXPos, iYPos) {
    _oButton.x = iXPos;
    _oButton.y = iYPos;
  };
  
  this.setX = function(iXPos) {
    _oButton.x = iXPos;
  };
  
  this.setY = function(iYPos) {
    _oButton.y = iYPos;
  };
  
  this.getButtonImage = function() {
    return _oButton;
  };
  
  this.getX = function() {
    return _oButton.x;
  };
  
  this.getY = function() {
    return _oButton.y;
  };
  
  this._init(iXPos, iYPos, oParentContainer);
} 