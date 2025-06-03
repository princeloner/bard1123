function CScrollingList(iX, iY, oParentContainer, aItems, iWidth, iHeight) {
    var _oContainer;
    var _oParentContainer = oParentContainer;
    var _aItems = [];
    var _iCurSelectedIndex = 0;
    var _aCbCompleted;
    var _aCbOwner;
    
    this._init = function(iX, iY, aItems, iWidth, iHeight) {
        _aCbCompleted = new Array();
        _aCbOwner = new Array();
        
        _oContainer = new createjs.Container();
        _oContainer.x = iX;
        _oContainer.y = iY;
        _oParentContainer.addChild(_oContainer);
        
        for(var i = 0; i < aItems.length; i++) {
            var oItem = new CTextButton(
                0,
                i * (iHeight + 10),
                s_oSpriteLibrary.getSprite('but_text'),
                aItems[i].text,
                "Arial",
                "#fff",
                24,
                _oContainer
            );
            
            oItem.addEventListenerWithParams(ON_MOUSE_UP, this._onItemSelected, this, i);
            _aItems.push({button: oItem, id: aItems[i].id});
        }
        
        this._selectItem(0);
    };
    
    this.unload = function() {
        for(var i = 0; i < _aItems.length; i++) {
            _aItems[i].button.unload();
        }
        _oParentContainer.removeChild(_oContainer);
    };
    
    this.setSelected = function(sId) {
        for(var i = 0; i < _aItems.length; i++) {
            if(_aItems[i].id === sId) {
                this._selectItem(i);
                break;
            }
        }
    };
    
    this._selectItem = function(iIndex) {
        _aItems[_iCurSelectedIndex].button.setActive(false);
        _aItems[iIndex].button.setActive(true);
        _iCurSelectedIndex = iIndex;
    };
    
    this._onItemSelected = function(iIndex) {
        this._selectItem(iIndex);
        
        if(_aCbCompleted[ON_SELECT_CHANGE]){
            _aCbCompleted[ON_SELECT_CHANGE].call(_aCbOwner[ON_SELECT_CHANGE], _aItems[iIndex].id);
        }
    };
    
    this.addEventListener = function(iEvent, cbCompleted, cbOwner) {
        _aCbCompleted[iEvent] = cbCompleted;
        _aCbOwner[iEvent] = cbOwner;
    };
    
    this._init(iX, iY, aItems, iWidth, iHeight);
    
    return this;
}