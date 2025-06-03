function CStick(oParentContainer){
    
    var _oContainer;
    var _oParentContainer = oParentContainer;
    var _oStick;
    var _oStickSprite;
    
    this._init = function(){
        _oContainer = new createjs.Container();
        //_oContainer.visible = false;
        _oParentContainer.addChild(_oContainer);
        
        _oStick = new createjs.Container();
        _oContainer.addChild(_oStick);
        
        _oStickSprite = createBitmap(s_oSpriteLibrary.getSprite("stick"));
        _oStick.addChild(_oStickSprite);
        
        _oContainer.regX = _oContainer.getBounds().width+BALL_RADIUS;
        _oContainer.regY = _oContainer.getBounds().height/2;
        
        _oContainer.rotation = 0;
    };
    
    this.setVisible = function(bVisible){

        _oContainer.visible = bVisible;
    };
    
    this.setPos = function(iX,iY){
        _oContainer.x = iX;
        _oContainer.y = iY;
    };
    
    this.getRotation = function (){
       return  _oContainer.rotation;
    };
    
    this.setRotation = function(iAngle){
        _oContainer.rotation = iAngle;
    };
    
    this.getX = function(){
        return _oContainer.x;
    };
    
    this.getY = function(){
        return _oContainer.y;
    };
    
    this.changeSprite = function(oSprite) {
        if(!oSprite) {
            return false;
        }
        
        _oContainer.removeChild(_oStick);
        _oStick = createBitmap(oSprite);
        _oStick.x = 0;
        _oStick.y = 0;
        _oStick.regX = oSprite.width/2;
        _oStick.regY = oSprite.height/2;
        _oContainer.addChild(_oStick);
        
        return true;
    };
    
    this.changeStyle = function(spriteKey) {
        var oSprite = s_oSpriteLibrary.getSprite(spriteKey);
        if (!oSprite) {
            console.warn("CStick: Sprite not found:", spriteKey);
            return;
        }
        
        // Remove old sprite
        if (_oStick) {
            _oContainer.removeChild(_oStick);
        }
        
        // Create and add new sprite
        _oStick = createBitmap(oSprite);
        _oStick.regX = oSprite.width/2;
        _oStick.regY = STICK_START_Y_OFFSET;
        _oContainer.addChild(_oStick);
    };
    
    this._init();
}