//import { requestFullscreen, isFullscreen } from '@telegram-apps/sdk';
function CMenu() {
  var _pStartPosAudio;
  var _pStartPosCredits;
  var _pStartPosFullscreen;
  var _pStartPosButSingle;
  var _pStartPosButTwo;
  var _pStartPosTelegramMulti;
  var _pStartPosPlayById;
  var _pStartPosLang;
  var _pStartPosAdmin;

  var _oBg;
  var _oLogo;
  var _oButPlaySingle;
  var _oButPlayTwo;
  var _oButTelegramMulti;
  var _oButPlayById;
  var _oAudioToggle;
  var _oButCredits;
  var _oFade;
  var _oButFullscreen;
  var _oButLang;
  var _oShopButton;
  var _oAdminButton;
  var _oProfileButton; // Новая кнопка профиля
  var _fRequestFullScreen = null;
  var _fCancelFullScreen = null;

  // Универсальная функция для проверки и активации fullscreen в Telegram Mini App
  function checkAndRequestFullscreen() {
    // 1. Проверка через TWASDK (jsDelivr CDN)
    if (window.TWASDK && typeof window.TWASDK.isFullscreen === 'function') {
      console.log('TWASDK isFullscreen:', window.TWASDK.isFullscreen());
      if (!window.TWASDK.isFullscreen() &&
          window.TWASDK.requestFullscreen &&
          window.TWASDK.requestFullscreen.isAvailable &&
          window.TWASDK.requestFullscreen.isAvailable()) {
        window.TWASDK.requestFullscreen().then(() => {
          console.log('TWASDK: Fullscreen requested, isFullscreen:', window.TWASDK.isFullscreen());
        });
      }
      return;
    }
    // 2. Проверка через TelegramAppsSDK (альтернативный CDN)
    if (window.TelegramAppsSDK && typeof window.TelegramAppsSDK.isFullscreen === 'function') {
      console.log('TelegramAppsSDK isFullscreen:', window.TelegramAppsSDK.isFullscreen());
      if (!window.TelegramAppsSDK.isFullscreen() &&
          window.TelegramAppsSDK.requestFullscreen &&
          window.TelegramAppsSDK.requestFullscreen.isAvailable &&
          window.TelegramAppsSDK.requestFullscreen.isAvailable()) {
        window.TelegramAppsSDK.requestFullscreen().then(() => {
          console.log('TelegramAppsSDK: Fullscreen requested, isFullscreen:', window.TelegramAppsSDK.isFullscreen());
        });
      }
      return;
    }
    // 3. Проверка через Telegram.WebApp API (isExpanded/isFullScreen)
    if (window.Telegram && window.Telegram.WebApp) {
      const isFull = window.Telegram.WebApp.isExpanded || window.Telegram.WebApp.isFullScreen;
      console.log('Telegram.WebApp isExpanded/isFullScreen:', isFull);
      if (!isFull && typeof window.Telegram.WebApp.expand === 'function') {
        window.Telegram.WebApp.expand();
        setTimeout(() => {
          const after = window.Telegram.WebApp.isExpanded || window.Telegram.WebApp.isFullScreen;
          console.log('After expand, isExpanded/isFullScreen:', after);
        }, 500);
      }
      return;
    }
    // 4. Фолбек: вывести, что fullscreen не поддерживается
    console.warn('Fullscreen API for Telegram Mini App is not available in this environment.');
  }

  this._init = function () {
    checkAndRequestFullscreen();
    // Надёжный Telegram Mini App fullscreen: только expand и ready
    if (window.Telegram && window.Telegram.WebApp) {
      if (typeof window.Telegram.WebApp.expand === 'function') {
        window.Telegram.WebApp.expand();
      }
      if (typeof window.Telegram.WebApp.ready === 'function') {
        window.Telegram.WebApp.ready();
      }
    }
    // Telegram Mini App: request fullscreen через TWASDK (jsDelivr CDN)
    if (window.TWASDK &&
        window.TWASDK.requestFullscreen &&
        window.TWASDK.requestFullscreen.isAvailable &&
        window.TWASDK.requestFullscreen.isAvailable()) {
      window.TWASDK.requestFullscreen().then(() => {
        if (window.TWASDK.isFullscreen) {
          console.log('CMenu: TWASDK isFullscreen:', window.TWASDK.isFullscreen());
        }
      }).catch(e => {
        console.warn('CMenu: TWASDK fullscreen request failed', e);
      });
    }
    //_oBg = createBitmap(s_oSpriteLibrary.getSprite("bg_menu"));
    //s_oStage.addChild(_oBg);

    // Добавляем кнопку магазина в верхней части экрана
    _oShopButton = new CShopButton(CANVAS_WIDTH / 2, 300, s_oStage);
    _oShopButton.addEventListener(ON_MOUSE_UP, this._onShopButtonRelease, this);
    
    // Добавляем кнопку профиля слева от кнопки магазина
    _oProfileButton = new CProfileButton(CANVAS_WIDTH / 2 - 100, 300, s_oStage);
    _oProfileButton.addEventListener(ON_MOUSE_UP, this._onProfileButtonRelease, this);
    
    // Добавляем кнопку администратора рядом с кнопкой магазина
    var oSpriteAdmin = s_oSpriteLibrary.getSprite("but_admin");
    _pStartPosAdmin = {
      x: CANVAS_WIDTH / 2 + 300, // Смещение вправо от кнопки магазина
      y: 300, // Та же высота, что и у кнопки магазина
    };
    _oAdminButton = new CGfxButton(
      _pStartPosAdmin.x,
      _pStartPosAdmin.y,
      oSpriteAdmin,
      s_oStage
    );
    _oAdminButton.addEventListener(ON_MOUSE_UP, this._onAdminButtonRelease, this);
    
    // Делаем кнопку админа видимой только для определенных пользователей
    // В реальном приложении здесь должна быть проверка на права администратора
    this._checkAdminAccess();

    _pStartPosButSingle = { x: CANVAS_WIDTH / 4, y: CANVAS_HEIGHT / 1.4 };
    _oButPlaySingle = new CGfxButton(
      CANVAS_WIDTH / 5,
      _pStartPosButSingle.y,
      s_oSpriteLibrary.getSprite("vs_man_panel_ton"),
      s_oStage
    );
    _oButPlaySingle.addEventListener(ON_MOUSE_UP, this._onButPlaySingle, this);

    _pStartPosButTwo = {
      x: CANVAS_WIDTH - CANVAS_WIDTH / 4,
      y: CANVAS_HEIGHT / 1.4,
    };
    
    // Закомментирована кнопка стандартного мультиплеера
    /*
    _oButPlayTwo = new CGfxButton(
      CANVAS_WIDTH - CANVAS_WIDTH / 5,
      _pStartPosButTwo.y,
      s_oSpriteLibrary.getSprite("vs_man_panel"),
      s_oStage
    );
    _oButPlayTwo.addEventListener(ON_MOUSE_UP, this._onButPlayTwo, this);
    */

    // Кнопка Telegram мультиплеера теперь на месте обычного мультиплеера
    _pStartPosTelegramMulti = {
      x: CANVAS_WIDTH - CANVAS_WIDTH / 4,
      y: CANVAS_HEIGHT / 1.4,
    };
    _oButTelegramMulti = new CGfxButton(
      CANVAS_WIDTH - CANVAS_WIDTH / 5,
      _pStartPosTelegramMulti.y,
      s_oSpriteLibrary.getSprite("vs_man_panel_random"),
      s_oStage
    );
    _oButTelegramMulti.addEventListener(ON_MOUSE_UP, this._onButTelegramMulti, this);

    // Новая кнопка - игра по ID
    _pStartPosPlayById = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 1.7 + 100 };
    _oButPlayById = new CGfxButton(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 1.7 + 130,  // Размещаем ниже существующих кнопок
      s_oSpriteLibrary.getSprite("vs_man_panel"),  // Используем ту же иконку или замените на другую
      s_oStage
    );
    _oButPlayById.addEventListener(ON_MOUSE_UP, this._onButPlayById, this);

    _pStartPosButMatch = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 1.7 };
    _oButPlayMatch = new CGfxButton(
      _pStartPosButMatch.x,
      CANVAS_HEIGHT / 2.3,
      //s_oSpriteLibrary.getSprite("winner_match"),
      s_oStage
    );

    createjs.Tween.get(_oButPlaySingle.getGraphic(), { override: false }).to(
      { x: _pStartPosButSingle.x },
      500,
      createjs.Ease.cubicOut
    );

    /* Закомментирована анимация кнопки стандартного мультиплеера
    createjs.Tween.get(_oButPlayTwo.getGraphic(), { override: false }).to(
      { x: _pStartPosButTwo.x },
      500,
      createjs.Ease.cubicOut
    );
    */

    // Анимация для кнопки Telegram мультиплеера
    createjs.Tween.get(_oButTelegramMulti.getGraphic(), { override: false }).to(
      { x: _pStartPosTelegramMulti.x },
      500,
      createjs.Ease.cubicOut
    );

    // Анимация для кнопки игры по ID
    createjs.Tween.get(_oButPlayById.getGraphic(), { override: false }).to(
      { y: _pStartPosPlayById.y },
      500,
      createjs.Ease.cubicOut
    );

    createjs.Tween.get(_oButPlayMatch.getGraphic(), { override: false }).to(
      { y: _pStartPosButMatch.y },
      500,
      createjs.Ease.cubicOut
    );

    var oSpriteLang = s_oSpriteLibrary.getSprite("but_lang");

    if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
      var oSprite = s_oSpriteLibrary.getSprite("audio_icon");
      _pStartPosAudio = {
        x: CANVAS_WIDTH - oSprite.height / 2 - 10,
        y: oSprite.height / 2 + 10,
      };
      _oAudioToggle = new CToggle(
        _pStartPosAudio.x,
        _pStartPosAudio.y,
        oSprite,
        s_bAudioActive,
        s_oStage
      );
      _oAudioToggle.addEventListener(ON_MOUSE_UP, this._onAudioToggle, this);
      _pStartPosLang = {
        x: _pStartPosAudio.x - oSpriteLang.width / NUM_LANGUAGES - 10,
        y: _pStartPosAudio.y,
      };
    } else {
      _pStartPosLang = {
        x: CANVAS_WIDTH - oSprite.width / 4 - 10,
        y: oSprite.height / 2 + 10,
      };
    }

    _oButLang = new CButLang(
      _pStartPosLang.x,
      _pStartPosLang.y,
      NUM_LANGUAGES,
      s_iCurLang,
      oSpriteLang,
      s_oStage
    );

    _oButLang.addEventListener(ON_SELECT_LANG, this._onChangeLang, this);

    var oSprite = s_oSpriteLibrary.getSprite("but_credits");
    _pStartPosCredits = {
      x: oSprite.width / 2 + 10,
      y: oSprite.height / 2 + 10,
    };

    _oButCredits = new CGfxButton(
      _pStartPosCredits.x,
      _pStartPosCredits.y,
      oSprite,
      s_oStage
    );

    _oButCredits.addEventListener(ON_MOUSE_UP, this._onButCreditsRelease, this);

    var doc = window.document;
    var docEl = doc.documentElement;
    _fRequestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;
    _fCancelFullScreen =
      doc.exitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.webkitExitFullscreen ||
      doc.msExitFullscreen;

    if (ENABLE_FULLSCREEN === false) {
      _fRequestFullScreen = false;
    }

    if (_fRequestFullScreen && screenfull.isEnabled) {
      oSprite = s_oSpriteLibrary.getSprite("but_fullscreen");
      _pStartPosFullscreen = {
        x: _pStartPosCredits.x + oSprite.width / 2 + 10,
        y: _pStartPosCredits.y,
      };

      _oButFullscreen = new CToggle(
        _pStartPosFullscreen.x,
        _pStartPosFullscreen.y,
        oSprite,
        s_bFullscreen,
        s_oStage
      );
      _oButFullscreen.addEventListener(
        ON_MOUSE_UP,
        this._onFullscreenRelease,
        this
      );
    }

    if (!s_oLocalStorage.isUsed()) {
      var oMsgBoxPanel = new CAreYouSurePanel();
      oMsgBoxPanel.changeMessage(TEXT_ERR_LS, -170);
      oMsgBoxPanel.setOneButton();
    }

    _oFade = new createjs.Shape();
    _oFade.graphics
      .beginFill("black")
      .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    s_oStage.addChild(_oFade);

    createjs.Tween.get(_oFade).to({ alpha: 0 }, 1000, createjs.Ease.cubicOut);

    $("#canvas_upper_3d").css("pointer-events", "none");
    sizeHandler();
  };

  this._onButPlayMatch = function () {
    alertShow("Not completed");
  };

  this._onExit = function (oCbCompleted) {
    _oFade.on("click", function () {});

    createjs.Tween.get(_oButPlaySingle.getGraphic(), { override: true }).to(
      { x: CANVAS_WIDTH / 5 },
      500,
      createjs.Ease.cubicOut
    );

    /* Закомментирована анимация выхода для стандартного мультиплеера
    createjs.Tween.get(_oButPlayTwo.getGraphic(), { override: true }).to(
      { x: CANVAS_WIDTH - CANVAS_WIDTH / 5 },
      500,
      createjs.Ease.cubicOut
    );
    */

    // Обновлена анимация выхода для кнопки Telegram мультиплеера
    createjs.Tween.get(_oButTelegramMulti.getGraphic(), { override: true }).to(
      { x: CANVAS_WIDTH - CANVAS_WIDTH / 5 },
      500,
      createjs.Ease.cubicOut
    );

    // Анимация выхода для кнопки игры по ID
    createjs.Tween.get(_oButPlayById.getGraphic(), { override: true }).to(
      { y: CANVAS_HEIGHT / 1.7 + 130 },  // Возвращаем на исходную позицию
      500,
      createjs.Ease.cubicOut
    );

    createjs.Tween.get(_oButPlayMatch.getGraphic(), { override: true }).to(
      { y: CANVAS_HEIGHT / 2.5 },
      500,
      createjs.Ease.cubicOut
    );

    _oFade.visible = true;
    createjs.Tween.get(_oFade)
      .to({ alpha: 1 }, 300, createjs.Ease.cubicOut)
      .call(oCbCompleted);
  };

  this.unload = function () {
    if(_oButPlaySingle) _oButPlaySingle.unload();
    if(_oButCredits) _oButCredits.unload();
    if(_oButTelegramMulti) _oButTelegramMulti.unload();
    if(_oButPlayById) _oButPlayById.unload();
    if(_oButPlayMatch) _oButPlayMatch.unload();
    if(_oShopButton) _oShopButton.unload();
    if(_oAdminButton) _oAdminButton.unload();
    if(_oProfileButton) _oProfileButton.unload(); // Удаляем кнопку профиля

    if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
      if(_oAudioToggle) {
        _oAudioToggle.unload();
        _oAudioToggle = null;
      }
    }

    if (_fRequestFullScreen && screenfull.isEnabled && _oButFullscreen) {
      _oButFullscreen.unload();
    }

    if(_oButLang) _oButLang.unload();
    if(_oFade) _oFade.removeAllEventListeners();
    s_oStage.removeAllChildren();
    s_oMenu = null;
  };

  this.refreshButtonPos = function () {
    if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
      _oAudioToggle.setPosition(
        _pStartPosAudio.x - s_iOffsetX,
        s_iOffsetY + _pStartPosAudio.y
      );
    }
    if (_fRequestFullScreen && screenfull.isEnabled) {
      _oButFullscreen.setPosition(
        _pStartPosFullscreen.x + s_iOffsetX,
        _pStartPosFullscreen.y + s_iOffsetY
      );
    }
    _oButCredits.setPosition(
      _pStartPosCredits.x + s_iOffsetX,
      _pStartPosCredits.y + s_iOffsetY
    );

    _oButPlaySingle.setPosition(
      _pStartPosButSingle.x,
      _pStartPosButSingle.y - s_iOffsetY
    );
    
    /* Закомментировано позиционирование стандартного мультиплеера
    _oButPlayTwo.setPosition(
      _pStartPosButTwo.x,
      _pStartPosButTwo.y - s_iOffsetY
    );
    */

    _oButTelegramMulti.setPosition(
      _pStartPosTelegramMulti.x,
      _pStartPosTelegramMulti.y - s_iOffsetY
    );

    // Обновляем позицию кнопки игры по ID
    _oButPlayById.setPosition(
      _pStartPosPlayById.x,
      _pStartPosPlayById.y - s_iOffsetY
    );

    _oButPlayMatch.setPosition(
      _pStartPosButMatch.x,
      _pStartPosButMatch.y - s_iOffsetY
    );

    _oButLang.setPosition(
      _pStartPosLang.x - s_iOffsetX,
      _pStartPosLang.y + s_iOffsetY
    );
    
    // Добавляем проверку существования кнопки магазина
    if (_oShopButton) {
      _oShopButton.setPosition(
        CANVAS_WIDTH / 2,
        300 - s_iOffsetY
      );
    }

    // Обновляем позицию кнопки администратора
    if (_oAdminButton) {
      _oAdminButton.setPosition(
        _pStartPosAdmin.x,
        _pStartPosAdmin.y - s_iOffsetY
      );
    }

    // Обновляем позицию кнопки профиля
    if (_oProfileButton) {
      _oProfileButton.setPosition(
        CANVAS_WIDTH / 2 - 100,
        300 - s_iOffsetY
      );
    }
  };

  this._onButPlaySingle = function () {
    s_iPlayerMode = GAME_MODE_CPU;
    s_iGameMode = GAME_MODE_EIGHT;

    this._onExit(function () {
      s_oMenu.unload();
      s_oMain.gotoDifficultyMenu();
    });
  };

  /* Закомментирован обработчик кнопки стандартного мультиплеера
  this._onButPlayTwo = function () {
    s_iPlayerMode = GAME_MODE_TWO;
    s_iGameMode = GAME_MODE_EIGHT;

    this._onExit(function () {
      s_oMenu.unload();
      s_oMain.gotoRoomList();
    });
  };
  */

  this._onChangeLang = function (iLang) {
    s_iCurLang = iLang;
    refreshLanguage();
  };

  this._onButCreditsRelease = function () {
    new CCreditsPanel();
  };

  this._onAudioToggle = function () {
    Howler.mute(s_bAudioActive);
    s_bAudioActive = !s_bAudioActive;
  };

  this.resetFullscreenBut = function () {
    if (_fRequestFullScreen && screenfull.isEnabled) {
      _oButFullscreen.setActive(s_bFullscreen);
    }
  };

  this._onFullscreenRelease = function () {
    if (s_bFullscreen) {
      _fCancelFullScreen.call(window.document);
    } else {
      _fRequestFullScreen.call(window.document.documentElement);
    }

    sizeHandler();
  };

  this._onShopButtonRelease = function() {
    this._onExit(function() {
      s_oMenu.unload();
      var oShop = new CShop();
    });
  };

  this._onButTelegramMulti = function () {
    s_iPlayerMode = GAME_MODE_TWO;
    s_iGameMode = GAME_MODE_EIGHT;
    
    // Устанавливаем флаг, что это Telegram мультиплеер
    s_bTelegramMultiplayer = true;

    this._onExit(function () {
      s_oMenu.unload();
      s_oMain.gotoTelegramRoomList();
    });
  };

  this._onButPlayById = function () {
    var _this = this;
    this._onExit(function () {
      _this.unload();
      s_oMain.gotoPlayByIdRoom();
      $(s_oMain).trigger("start_session");
    });
  };

  // Проверка доступа к админ-панели
  this._checkAdminAccess = function() {
    var isAdmin = false;
    
    // Проверяем, есть ли у пользователя права администратора
    // В реальном приложении здесь будет проверка прав через API или локальное хранилище
    if (window.TelegramGameData && window.TelegramGameData.user) {
      const adminIds = ['123456789', '987654321']; // Список ID пользователей-администраторов
      const userId = window.TelegramGameData.user.id.toString();
      
      if (adminIds.includes(userId)) {
        isAdmin = true;
      }
    }
    
    // Для целей разработки всегда показываем кнопку администратора
    isAdmin = true;
    
    // Показываем или скрываем кнопку администратора
    if (_oAdminButton) {
      _oAdminButton.setVisible(isAdmin);
    }
  };

  // Добавляем обработчик нажатия на кнопку администратора
  this._onAdminButtonRelease = function() {
    this._onExit(function() {
      s_oMenu.unload();
      // Создаем новую админ-панель
      s_oMain.gotoAdminPanel();
    });
  };

  this._onProfileButtonRelease = function() {
    this._onExit(function() {
      s_oMenu.unload();
      new CPlayerProfile();
    });
  };

  s_oMenu = this;

  this._init();
}

var s_oMenu = null;
