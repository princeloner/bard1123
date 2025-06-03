function CCustomizePanel(oParentContainer) {
    var _oContainer;
    var _oParentContainer = oParentContainer;
    var _oButExit;
    var _oFade;
    var _oTableStyleText;
    var _oCueStyleText;
    var _oMsgText;
    var _oParent;
    var _oContainerPanel;
    var _aTableButtons = [];
    var _aCueButtons = [];
    var _sCurrentTableStyle = "default";
    var _sCurrentCueStyle = "default";
    
    this._init = function() {
        // Load current preferences if available
        this._loadSavedPreferences();
        
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        _oFade = new createjs.Shape();
        _oFade.graphics.beginFill("black").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oFade.alpha = 0.7;
        _oContainer.addChild(_oFade);
        
        var oSpriteBg = s_oSpriteLibrary.getSprite('msg_box');
        _oContainerPanel = new createjs.Container();
        _oContainerPanel.x = CANVAS_WIDTH/2;
        _oContainerPanel.y = CANVAS_HEIGHT/2;
        _oContainer.addChild(_oContainerPanel);
        
        var oBg = createBitmap(oSpriteBg);
        oBg.regX = oSpriteBg.width/2;
        oBg.regY = oSpriteBg.height/2;
        _oContainerPanel.addChild(oBg);
        
        // Table Style Text
        _oTableStyleText = new CTLText(_oContainerPanel, 
                    -250, -180, 500, 40, 
                    40, "center", "#fff", FONT_GAME, 1,
                    0, 0,
                    TEXT_SELECT_TABLE[s_iCurLang],
                    true, true, false,
                    false);
                    
        // Table Style Buttons
        this._createTableButtons();
        
        // Cue Style Text
        _oCueStyleText = new CTLText(_oContainerPanel, 
                    -250, 20, 500, 40, 
                    40, "center", "#fff", FONT_GAME, 1,
                    0, 0,
                    TEXT_SELECT_CUE[s_iCurLang],
                    true, true, false,
                    false);
                    
        // Cue Style Buttons
        this._createCueButtons();
        
        // Exit Button
        var oSprite = s_oSpriteLibrary.getSprite('but_exit');
        _oButExit = new CGfxButton(270, -250, oSprite, _oContainerPanel);
        _oButExit.addEventListener(ON_MOUSE_UP, this.unload, this);
        
        // Message Text for feedback
        _oMsgText = new CTLText(_oContainerPanel, 
                    -250, 200, 500, 40, 
                    30, "center", "#fff", FONT_GAME, 1,
                    0, 0,
                    "",
                    true, true, false,
                    false);
                    
        // Highlight current selections
        this._highlightCurrentSelections();
        
        // Add entrance animation
        _oContainerPanel.scale = 0.1;
        createjs.Tween.get(_oContainerPanel).to({scale: 1}, 500, createjs.Ease.backOut);
    };
    
    this._loadSavedPreferences = function() {
        try {
            var savedTableStyle = localStorage.getItem('billiard_table_style');
            var savedCueStyle = localStorage.getItem('billiard_cue_style');
            
            if (savedTableStyle) {
                _sCurrentTableStyle = savedTableStyle;
            }
            
            if (savedCueStyle) {
                _sCurrentCueStyle = savedCueStyle;
            }
        } catch(e) {
            console.warn("Could not load saved preferences");
        }
    };
    
    this._createTableButtons = function() {
        // Default Table Button
        var oSprite = s_oSpriteLibrary.getSprite('but_restart');
        var oButDefault = new CTextButton(-150, -100, oSprite, TEXT_DEFAULT[s_iCurLang], FONT_GAME, "#fff", 24, "center", _oContainerPanel);
        oButDefault.addEventListener(ON_MOUSE_UP, function() { this._onTableSelect('default'); }, this);
        _aTableButtons.push({button: oButDefault, style: 'default'});
        
        // Red Table Button
        var oButRed = new CTextButton(0, -100, oSprite, TEXT_RED[s_iCurLang], FONT_GAME, "#fff", 24, "center", _oContainerPanel);
        oButRed.addEventListener(ON_MOUSE_UP, function() { this._onTableSelect('red'); }, this);
        _aTableButtons.push({button: oButRed, style: 'red'});
        
        // Blue Table Button
        var oButBlue = new CTextButton(150, -100, oSprite, TEXT_BLUE[s_iCurLang], FONT_GAME, "#fff", 24, "center", _oContainerPanel);
        oButBlue.addEventListener(ON_MOUSE_UP, function() { this._onTableSelect('blue'); }, this);
        _aTableButtons.push({button: oButBlue, style: 'blue'});
    };
    
    this._createCueButtons = function() {
        // Default Cue Button
        var oSprite = s_oSpriteLibrary.getSprite('but_text');
        var oButDefault = new CTextButton(-150, 100, oSprite, TEXT_DEFAULT[s_iCurLang], FONT_GAME, "#fff", 24, "center", _oContainerPanel);
        oButDefault.addEventListener(ON_MOUSE_UP, function() { this._onCueSelect('default'); }, this);
        _aCueButtons.push({button: oButDefault, style: 'default'});
        
        // Gold Cue Button
        var oButGold = new CTextButton(0, 100, oSprite, TEXT_GOLD[s_iCurLang], FONT_GAME, "#fff", 24, "center", _oContainerPanel);
        oButGold.addEventListener(ON_MOUSE_UP, function() { this._onCueSelect('gold'); }, this);
        _aCueButtons.push({button: oButGold, style: 'gold'});
        
        // Silver Cue Button
        var oButSilver = new CTextButton(150, 100, oSprite, TEXT_SILVER[s_iCurLang], FONT_GAME, "#fff", 24, "center", _oContainerPanel);
        oButSilver.addEventListener(ON_MOUSE_UP, function() { this._onCueSelect('silver'); }, this);
        _aCueButtons.push({button: oButSilver, style: 'silver'});
    };
    
    this._highlightCurrentSelections = function() {
        // Highlight current table style
        for (var i = 0; i < _aTableButtons.length; i++) {
            var buttonData = _aTableButtons[i];
            try {
                // Проверяем, есть ли у кнопки метод для изменения цвета текста
                if (buttonData.style === _sCurrentTableStyle) {
                    // Пробуем найти текстовый объект напрямую
                    if (buttonData.button._oText) {
                        buttonData.button._oText.color = "#ffcc00";
                    } else if (buttonData.button._oTextBack) {
                        buttonData.button._oTextBack.color = "#ffcc00";
                    }
                } else {
                    // Сбрасываем цвет
                    if (buttonData.button._oText) {
                        buttonData.button._oText.color = "#ffffff";
                    } else if (buttonData.button._oTextBack) {
                        buttonData.button._oTextBack.color = "#ffffff";
                    }
                }
            } catch (e) {
                console.warn("Не удалось изменить цвет кнопки стола:", e);
            }
        }
        
        // Highlight current cue style
        for (var i = 0; i < _aCueButtons.length; i++) {
            var buttonData = _aCueButtons[i];
            try {
                if (buttonData.style === _sCurrentCueStyle) {
                    // Пробуем найти текстовый объект напрямую
                    if (buttonData.button._oText) {
                        buttonData.button._oText.color = "#ffcc00";
                    } else if (buttonData.button._oTextBack) {
                        buttonData.button._oTextBack.color = "#ffcc00";
                    }
                } else {
                    // Сбрасываем цвет
                    if (buttonData.button._oText) {
                        buttonData.button._oText.color = "#ffffff";
                    } else if (buttonData.button._oTextBack) {
                        buttonData.button._oTextBack.color = "#ffffff";
                    }
                }
            } catch (e) {
                console.warn("Не удалось изменить цвет кнопки кия:", e);
            }
        }
    };
    
    this._onTableSelect = function(style) {
        // Проверяем наличие спрайта перед применением
        var spriteKey = style === 'default' ? 'pool_table' : 'pool_table_' + style;
        var oSprite = s_oSpriteLibrary.getSprite(spriteKey);
        
        if (!oSprite) {
            console.error("Спрайт не найден:", spriteKey);
            this._showMessage("Ошибка: спрайт не найден");
            return;
        }
        
        if (s_oTable) {
            // Save previous style for animation
            var prevStyle = _sCurrentTableStyle;
            _sCurrentTableStyle = style;
            
            // Apply visual change with animation
            this._animateTableChange(spriteKey);
            
            // Update button highlights
            this._highlightCurrentSelections();
            
            // Show success message
            this._showMessage(TEXT_CUSTOMIZE_SUCCESS);
            
            // Play sound effect
            playSound("click", 1, false);
            
            // Save preference
            try {
                localStorage.setItem('billiard_table_style', style);
            } catch(e) {
                console.warn("Could not save table style preference");
            }
        }
    };
    
    this._animateTableChange = function(spriteKey) {
        // Отладочная информация о структуре сцены
        console.log("Структура s_oStage:", JSON.stringify({type: "Stage"})); // Заменяем вызов _dumpObjectStructure
        
        // Apply the style change with a visual effect
        if (s_oTable) {
            // Create a flash effect
            var oFlash = new createjs.Shape();
            oFlash.graphics.beginFill("#ffffff").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            oFlash.alpha = 0;
            s_oStage.addChild(oFlash);
            
            // Flash animation
            createjs.Tween.get(oFlash)
                .to({alpha: 0.3}, 100)
                .call(function() {
                    // Пробуем обновить спрайт стола
                    var success = this._updateTableSpriteInternal(spriteKey);
                    
                    // Если не удалось, используем запасной вариант
                    if (!success) {
                        console.log("Используем запасной метод создания оверлея");
                        this._createTableOverlay(spriteKey);
                    }
                }.bind(this))
                .to({alpha: 0}, 100)
                .call(function() {
                    s_oStage.removeChild(oFlash);
                });
        }
    };
    
    this._createTableOverlay = function(spriteKey) {
        var oSprite = s_oSpriteLibrary.getSprite(spriteKey);
        if (!oSprite) return false;
        
        // Получаем координаты стола
        var tableX = 0, tableY = 0;
        if (s_oTable.getTableX && s_oTable.getTableY) {
            tableX = s_oTable.getTableX();
            tableY = s_oTable.getTableY();
        }
        
        // Удаляем предыдущий оверлей, если он существует
        for (var i = 0; i < s_oStage.children.length; i++) {
            if (s_oStage.children[i].name === "custom_table_overlay") {
                s_oStage.removeChildAt(i);
                break;
            }
        }
        
        // Создаем новый контейнер
        var newContainer = new createjs.Container();
        newContainer.name = "custom_table_overlay";
        newContainer.x = tableX;
        newContainer.y = tableY;
        
        // Добавляем спрайт
        var oBg = createBitmap(oSprite);
        newContainer.addChild(oBg);
        
        // Находим индекс элементов, которые должны быть поверх стола
        var trajectoryIndex = -1;
        var panelIndex = -1;
        
        // Ищем индексы важных элементов
        for (var i = 0; i < s_oStage.children.length; i++) {
            var child = s_oStage.children[i];
            
            // Ищем контейнер панели настроек
            if (child === _oContainer) {
                panelIndex = i;
            }
            
            // Ищем элементы, связанные с траекторией шара
            // Обычно это Shape или Container с именами, содержащими "trajectory", "path", "line" и т.д.
            if (child.name && (
                child.name.indexOf("trajectory") !== -1 || 
                child.name.indexOf("path") !== -1 || 
                child.name.indexOf("line") !== -1 ||
                child.name.indexOf("guide") !== -1 ||
                child.name.indexOf("direction") !== -1)) {
                trajectoryIndex = i;
            }
            
            // Также проверяем, если это контейнер с _oDollyDir, _oCueBallDir или _oHittenBallDir
            if (child === s_oTable._oDollyDir || 
                child === s_oTable._oCueBallDir || 
                child === s_oTable._oHittenBallDir) {
                trajectoryIndex = i;
            }
        }
        
        // Определяем, куда добавить новый контейнер
        var insertIndex = 0; // По умолчанию в самый низ
        
        // Если нашли индекс траектории, добавляем перед ней
        if (trajectoryIndex > 0) {
            insertIndex = trajectoryIndex;
        } 
        // Если нашли индекс панели, добавляем перед ней
        else if (panelIndex > 0) {
            insertIndex = panelIndex;
        }
        
        // Добавляем контейнер стола на нужный уровень
        s_oStage.addChildAt(newContainer, insertIndex);
        
        console.log("Создан новый слой стола с правильным z-индексом (перед траекторией)");
        return true;
    };
    
    this._updateTableSpriteInternal = function(spriteKey) {
        try {
            // Проверяем наличие спрайта
            var oSprite = s_oSpriteLibrary.getSprite(spriteKey);
            if (!oSprite) {
                console.error("Спрайт не найден:", spriteKey);
                return false;
            }
            
            if (!s_oTable) {
                console.error("Объект стола не инициализирован");
                return false;
            }
            
            // Используем метод changeTableStyle, если он доступен
            if (s_oTable.changeTableStyle && typeof s_oTable.changeTableStyle === 'function') {
                return s_oTable.changeTableStyle(spriteKey);
            }
            
            // Запасной вариант, если метод не найден
            console.warn("Метод changeTableStyle не найден, используем запасной вариант");
            return this._createTableOverlay(spriteKey);
        } catch (e) {
            console.error("Ошибка при обновлении спрайта стола:", e);
            return false;
        }
    };
    
    this._onCueSelect = function(style) {
        var spriteKey = style === 'default' ? 'stick' : 
                       'stick_' + style;
                       
        if (s_oTable) {
            // Save previous style for animation
            var prevStyle = _sCurrentCueStyle;
            _sCurrentCueStyle = style;
            
            // Apply visual change with animation
            this._animateCueChange(spriteKey);
            
            // Update button highlights
            this._highlightCurrentSelections();
            
            // Show success message
            this._showMessage(TEXT_CUSTOMIZE_SUCCESS);
            
            // Play sound effect
            playSound("click", 1, false);
            
            // Save preference
            try {
                localStorage.setItem('billiard_cue_style', style);
            } catch(e) {
                console.warn("Could not save cue style preference");
            }
        }
    };
    
    this._animateCueChange = function(spriteKey) {
        // Apply the style change with a visual effect
        if (s_oTable) {
            // Create a flash effect similar to table change
            var oFlash = new createjs.Shape();
            oFlash.graphics.beginFill("#ffffff").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            oFlash.alpha = 0;
            s_oStage.addChild(oFlash);
            
            // Flash animation
            createjs.Tween.get(oFlash)
                .to({alpha: 0.2}, 100)
                .call(function() {
                    // Try to update the stick directly
                    var success = this._updateCueSpriteInternal(spriteKey);
                    
                    if (!success) {
                        console.warn("Не удалось обновить спрайт кия");
                    }
                }.bind(this))
                .to({alpha: 0}, 100)
                .call(function() {
                    s_oStage.removeChild(oFlash);
                });
        }
    };
    
    this._updateCueSpriteInternal = function(spriteKey) {
        try {
            var oSprite = s_oSpriteLibrary.getSprite(spriteKey);
            if (!oSprite) {
                console.error("Спрайт кия не найден:", spriteKey);
                return false;
            }
            
            if (!s_oTable) {
                console.error("Объект стола не инициализирован");
                return false;
            }
            
            console.log("Обновляем стиль кия на:", spriteKey);
            
            // Проверяем доступ к объекту кия
            if (s_oTable.getStick && typeof s_oTable.getStick === 'function') {
                var stick = s_oTable.getStick();
                if (stick && typeof stick.changeStyle === 'function') {
                    stick.changeStyle(spriteKey);
                    console.log("Стиль кия успешно обновлен на:", spriteKey);
                    return true;
                } else if (stick && typeof stick.changeSprite === 'function') {
                    stick.changeSprite(oSprite);
                    console.log("Спрайт кия успешно обновлен");
                    return true;
                }
            }
            
            // Если у s_oTable есть прямой метод для изменения кия
            if (s_oTable.changeCueStyle && typeof s_oTable.changeCueStyle === 'function') {
                s_oTable.changeCueStyle(spriteKey);
                console.log("Стиль кия успешно обновлен через метод стола");
                return true;
            }
            
            console.warn("Не найден подходящий метод для изменения кия");
            return false;
        } catch (e) {
            console.error("Ошибка при обновлении спрайта кия:", e);
            return false;
        }
    };
    
    this._showMessage = function(text) {
        _oMsgText.refreshText(text);
        
        // Add animation to the message
        _oMsgText.setAlpha(0);
        createjs.Tween.get(_oMsgText)
            .to({alpha: 1}, 300)
            .wait(1500)
            .to({alpha: 0}, 300)
            .call(function() {
                if (_oMsgText) {
                    _oMsgText.refreshText("");
                }
            });
    };
    
    this.unload = function() {
        // Exit animation
        createjs.Tween.get(_oContainerPanel)
            .to({scale: 0.1}, 300, createjs.Ease.backIn)
            .call(function() {
                _oButExit.unload();
                
                // Unload all table buttons
                for (var i = 0; i < _aTableButtons.length; i++) {
                    _aTableButtons[i].button.unload();
                }
                
                // Unload all cue buttons
                for (var i = 0; i < _aCueButtons.length; i++) {
                    _aCueButtons[i].button.unload();
                }
                
                s_oStage.removeChild(_oContainer);
            });
    };
    
    _oParent = this;
    this._init();
}

this._dumpObjectStructure = function(obj, depth, currentDepth) {
    if (currentDepth === undefined) currentDepth = 0;
    if (depth !== undefined && currentDepth > depth) return "...";
    
    var result = {};
    
    if (obj instanceof createjs.Container) {
        result.type = "Container";
        result.x = obj.x;
        result.y = obj.y;
        result.visible = obj.visible;
        result.alpha = obj.alpha;
        result.name = obj.name;
        
        if (obj.children && obj.children.length > 0 && currentDepth < depth) {
            result.children = [];
            for (var i = 0; i < obj.children.length; i++) {
                result.children.push(this._dumpObjectStructure(obj.children[i], depth, currentDepth + 1));
            }
        } else {
            result.childrenCount = obj.children ? obj.children.length : 0;
        }
    } else if (obj instanceof createjs.Bitmap) {
        result.type = "Bitmap";
        result.x = obj.x;
        result.y = obj.y;
        result.visible = obj.visible;
        result.alpha = obj.alpha;
        result.name = obj.name;
        if (obj.image && obj.image.src) {
            result.src = obj.image.src.split('/').pop();
        }
    } else {
        result.type = obj.constructor ? obj.constructor.name : typeof obj;
        result.x = obj.x;
        result.y = obj.y;
    }
    
    return result;
};