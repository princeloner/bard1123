function CPreloader() {
    var _iMaskWidth;
    var _iMaskHeight;
    var _oLoadingText;
    var _oProgressBar;
    var _oMaskPreloader;
    var _oIcon;
    var _oIconMask;
    var _oContainer;
    var _oLoadingBg;
    var _oProgressText;
    var _oGlowEffect;

    this._init = function () {
        s_oSpriteLibrary.init(this._onImagesLoaded, this._onAllImagesLoaded, this);
        s_oSpriteLibrary.addSprite("progress_bar", "./sprites/progress_bar.png");
        s_oSpriteLibrary.addSprite("mask_progress_bar", "./sprites/mask_progress_bar.png");
        s_oSpriteLibrary.addSprite("200x200", "./sprites/200x200.jpg");
        s_oSpriteLibrary.loadSprites();

        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
    };

    this.unload = function () {
        _oContainer.removeAllChildren();
    };

    this._onImagesLoaded = function () {

    };

    this._onAllImagesLoaded = function () {
        this.attachSprites();
        s_oMain.preloaderReady();
    };

    this.attachSprites = function () {
        // Создаем черный фон
        var oBg = new createjs.Shape();
        oBg.graphics.beginFill("#000000")
            .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oContainer.addChild(oBg);

        // Добавляем центральную иконку с эффектом свечения
        var oSprite = s_oSpriteLibrary.getSprite('200x200');
        _oIcon = createBitmap(oSprite);
        _oIcon.regX = oSprite.width * 0.5;
        _oIcon.regY = oSprite.height * 0.5;
        _oIcon.x = CANVAS_WIDTH/2;
        _oIcon.y = CANVAS_HEIGHT/2 - 80;
        
        // Добавляем эффект свечения
        _oGlowEffect = new createjs.Shape();
        _oGlowEffect.graphics.beginFill("#304FFE")
            .drawRoundRect(_oIcon.x - 105, _oIcon.y - 105, 210, 210, 15);
        _oGlowEffect.alpha = 0.2;
        _oContainer.addChild(_oGlowEffect);
        
        // Анимация свечения
        createjs.Tween.get(_oGlowEffect, {loop: true})
            .to({alpha: 0.4}, 1000, createjs.Ease.quadInOut)
            .to({alpha: 0.2}, 1000, createjs.Ease.quadInOut);

        _oContainer.addChild(_oIcon);

        // Современный прогресс-бар с закругленными краями
        _oLoadingBg = new createjs.Shape();
        _oLoadingBg.graphics.beginFill("#2a2a2a")
            .drawRoundRect(CANVAS_WIDTH/2 - 150, CANVAS_HEIGHT/2 + 70, 300, 6, 3);
        _oContainer.addChild(_oLoadingBg);

        _oProgressBar = new createjs.Shape();
        _oProgressBar.graphics.beginFill("#304FFE")
            .drawRoundRect(CANVAS_WIDTH/2 - 150, CANVAS_HEIGHT/2 + 70, 300, 6, 3);
        _oContainer.addChild(_oProgressBar);
        _oProgressBar.scaleX = 0;

        // Современный текст загрузки
        _oLoadingText = new createjs.Text("ЗАГРУЗКА", "bold 24px " + FONT_GAME, "#fff");
        _oLoadingText.x = CANVAS_WIDTH/2;
        _oLoadingText.y = CANVAS_HEIGHT/2 + 120;
        _oLoadingText.textBaseline = "alphabetic";
        _oLoadingText.textAlign = "center";
        _oContainer.addChild(_oLoadingText);

        // Процент загрузки
        _oProgressText = new createjs.Text("0%", "18px " + FONT_GAME, "#8F8F8F");
        _oProgressText.x = CANVAS_WIDTH/2;
        _oProgressText.y = CANVAS_HEIGHT/2 + 50;
        _oProgressText.textBaseline = "alphabetic";
        _oProgressText.textAlign = "center";
        _oContainer.addChild(_oProgressText);
    };

    this.refreshLoader = function (iPerc) {
        // Обновляем текст процентов
        _oProgressText.text = iPerc + "%";
        
        // Плавная анимация прогресс-бара
        createjs.Tween.get(_oProgressBar)
            .to({scaleX: iPerc/100}, 300, createjs.Ease.quartOut);

        if (iPerc === 100) {
            // Эффект завершения загрузки
            createjs.Tween.get(_oLoadingText)
                .to({alpha: 0}, 500, createjs.Ease.cubicOut);
            createjs.Tween.get(_oProgressText)
                .to({alpha: 0}, 500, createjs.Ease.cubicOut);
            createjs.Tween.get(_oProgressBar)
                .to({alpha: 0}, 500, createjs.Ease.cubicOut);
            createjs.Tween.get(_oLoadingBg)
                .to({alpha: 0}, 500, createjs.Ease.cubicOut)
                .call(function() {
                    s_oMain._allResourcesLoaded();
                });
        }
    };

    this._init();
}