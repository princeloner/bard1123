function CMain(oData) {
  var _bUpdate;
  var _bGameUpdate;
  var _iCurResource = 0;
  var RESOURCE_TO_LOAD = 0;
  var _iState = STATE_LOADING;

  var _oPreloader;
  var _oMenu;
  var _oDifficultyMenu;
  var _oRoomlist;
  var _oTelegramRoomlist;
  var _oGame;
  var _oProfile;
  var _oAdminPanel;

  this.initContainer = function () {
    var canvas = document.getElementById("canvas_game");
    s_oStage = new createjs.Stage(canvas);
    //s_oStage.setClearColor("#000");
    s_oStage.preventSelection = false;
    createjs.Touch.enable(s_oStage, true);

    s_oStageUpper3D = new createjs.Stage(
      document.getElementById("canvas_upper_3d")
    );

    s_bMobile = isMobile();
    if (s_bMobile === false) {
      s_oStage.enableMouseOver(20);
    }

    s_iPrevTime = new Date().getTime();

    // setInterval(this._update,  FPS_TIME);
    createjs.Ticker.framerate = FPS;

    createjs.Ticker.on("tick", this._update);

    if (navigator.userAgent.match(/Windows Phone/i)) {
      DISABLE_SOUND_MOBILE = true;
    }

    s_oSpriteLibrary = new CSpriteLibrary();
    s_oLocalStorage = new CLocalStorage();

    //ADD PRELOADER
    _oPreloader = new CPreloader();
    Wallet = new WalletClass();
  };

  this.preloaderReady = function () {
    if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
      this._initSounds();
    }

    this._loadImages();

    _bGameUpdate = true;
    _bUpdate = true;
  };

  this.soundLoaded = function () {
    _iCurResource++;
    var iPerc = Math.floor((_iCurResource / RESOURCE_TO_LOAD) * 100);

    _oPreloader.refreshLoader(iPerc);
  };

  this._initSounds = function () {
    Howler.mute(!s_bAudioActive);

    s_aSoundsInfo = new Array();
    s_aSoundsInfo.push({
      path: "./sounds/",
      filename: "click",
      loop: false,
      volume: 1,
      ingamename: "click",
    });
    s_aSoundsInfo.push({
      path: "./sounds/",
      filename: "level_win",
      loop: false,
      volume: 1,
      ingamename: "level_win",
    });
    s_aSoundsInfo.push({
      path: "./sounds/",
      filename: "game_over",
      loop: false,
      volume: 1,
      ingamename: "game_over",
    });
    s_aSoundsInfo.push({
      path: "./sounds/",
      filename: "ball_collision",
      loop: false,
      volume: 1,
      ingamename: "ball_collision",
    });
    s_aSoundsInfo.push({
      path: "./sounds/",
      filename: "ball_in_hole",
      loop: false,
      volume: 1,
      ingamename: "ball_in_hole",
    });
    s_aSoundsInfo.push({
      path: "./sounds/",
      filename: "edge_collision",
      loop: false,
      volume: 1,
      ingamename: "edge_collision",
    });
    s_aSoundsInfo.push({
      path: "./sounds/",
      filename: "stick_shot",
      loop: false,
      volume: 1,
      ingamename: "stick_shot",
    });

    s_aSoundsInfo.push({
      path: "./sounds/",
      filename: "soundtrack",
      loop: true,
      volume: 1,
      ingamename: "soundtrack",
    });

    RESOURCE_TO_LOAD += s_aSoundsInfo.length;

    s_aSounds = new Array();
    for (var i = 0; i < s_aSoundsInfo.length; i++) {
      this.tryToLoadSound(s_aSoundsInfo[i], false);
    }
  };

  this.tryToLoadSound = function (oSoundInfo, bDelay) {
    setTimeout(
      function () {
        s_aSounds[oSoundInfo.ingamename] = new Howl({
          src: [oSoundInfo.path + oSoundInfo.filename + ".mp3"],
          autoplay: false,
          preload: true,
          loop: oSoundInfo.loop,
          volume: oSoundInfo.volume,
          onload: s_oMain.soundLoaded,
          onloaderror: function (szId, szMsg) {
            for (var i = 0; i < s_aSoundsInfo.length; i++) {
              if (
                szId === s_aSounds[s_aSoundsInfo[i].ingamename]._sounds[0]._id
              ) {
                s_oMain.tryToLoadSound(s_aSoundsInfo[i], true);
                break;
              }
            }
          },
          onplayerror: function (szId) {
            for (var i = 0; i < s_aSoundsInfo.length; i++) {
              if (
                szId === s_aSounds[s_aSoundsInfo[i].ingamename]._sounds[0]._id
              ) {
                s_aSounds[s_aSoundsInfo[i].ingamename].once(
                  "unlock",
                  function () {
                    s_aSounds[s_aSoundsInfo[i].ingamename].play();
                    if (
                      s_aSoundsInfo[i].ingamename === "soundtrack" &&
                      s_oGame !== null
                    ) {
                      setVolume("soundtrack", SOUNDTRACK_VOLUME_IN_GAME);
                    }
                  }
                );
                break;
              }
            }
          },
        });
      },
      bDelay ? 200 : 0
    );
  };

  this._loadImages = function () {
    s_oSpriteLibrary.init(this._onImagesLoaded, this._onAllImagesLoaded, this);

    s_oSpriteLibrary.addSprite("but_play", "./sprites/but_play.png");
    s_oSpriteLibrary.addSprite("logo_menu", "./sprites/logo_menu.png");

    s_oSpriteLibrary.addSprite("bg_game", "./sprites/bg_game.jpg");
    s_oSpriteLibrary.addSprite("but_exit", "./sprites/but_exit.png");
    s_oSpriteLibrary.addSprite("bg_menu", "./sprites/bg_menu.jpg");
    s_oSpriteLibrary.addSprite("audio_icon", "./sprites/audio_icon.png");
    //s_oSpriteLibrary.addSprite("logo_ctl", "./sprites/logo_ctl.png");
    s_oSpriteLibrary.addSprite("but_credits", "./sprites/but_credits.png");
    s_oSpriteLibrary.addSprite(
      "but_fullscreen",
      "./sprites/but_fullscreen.png"
    );
    s_oSpriteLibrary.addSprite("but_settings", "./sprites/but_settings.png");
    s_oSpriteLibrary.addSprite("pool_table", "./sprites/pool_table.png");
    s_oSpriteLibrary.addSprite("pool_table_red", "./sprites/pool_table_red.png");
    s_oSpriteLibrary.addSprite("pool_table_blue", "./sprites/pool_table_blue.png");
    s_oSpriteLibrary.addSprite("balls", "./sprites/2d_balls.png");
    s_oSpriteLibrary.addSprite("stick", "./sprites/stick.png");
    s_oSpriteLibrary.addSprite("player_gui", "./sprites/player_gui.png");
    s_oSpriteLibrary.addSprite(
      "highlight_player",
      "./sprites/highlight_player.png"
    );
    s_oSpriteLibrary.addSprite("msg_box", "./sprites/msg_box.png");
    s_oSpriteLibrary.addSprite("ball_spin_gui", "./sprites/ball_spin_gui.png");
    s_oSpriteLibrary.addSprite(
      "ball_spin_token",
      "./sprites/ball_spin_token.png"
    );
    s_oSpriteLibrary.addSprite("but_home", "./sprites/but_home.png");
    s_oSpriteLibrary.addSprite("but_restart", "./sprites/but_restart.png");
    s_oSpriteLibrary.addSprite("but_lang", "./sprites/but_lang.png");
    s_oSpriteLibrary.addSprite("but_next", "./sprites/but_next.png");
    s_oSpriteLibrary.addSprite("but_continue", "./sprites/but_continue.png");

    s_oSpriteLibrary.addSprite("but_yes", "./sprites/but_yes.png");
    s_oSpriteLibrary.addSprite("but_no", "./sprites/but_no.png");

    s_oSpriteLibrary.addSprite("vs_man_panel", "./sprites/vs_man_panel.png");
    s_oSpriteLibrary.addSprite("vs_man_panel_random", "./sprites/vs_man_panel_random.png");
    s_oSpriteLibrary.addSprite("vs_man_panel_ton", "./sprites/vs_man_panel_ton.png");
    s_oSpriteLibrary.addSprite("vs_pc_panel", "./sprites/vs_pc_panel.png");
    s_oSpriteLibrary.addSprite("winner_match", "./sprites/winner_match.png");
    s_oSpriteLibrary.addSprite("shop_button", "./sprites/shop_button.png");
    s_oSpriteLibrary.addSprite("but_admin", "./sprites/but_admin.png");   
    s_oSpriteLibrary.addSprite("but_nft", "./sprites/but_nft.png");

    s_oSpriteLibrary.addSprite("but_text", "./sprites/but_text.png");

    s_oSpriteLibrary.addSprite("ball_shadow", "./sprites/ball_shadow.png");

    //s_oSpriteLibrary.addSprite("connect_icon", "./sprites/connect_icon.png");

    s_oSpriteLibrary.addSprite("btn_userProfile", "./sprites/userProfile.png");

    s_oSpriteLibrary.addSprite("btn_balance", "./sprites/but_balance.png");

    s_oSpriteLibrary.addSprite(
      "but_arrow_left",
      "./sprites/but_arrow_left.png"
    );
    s_oSpriteLibrary.addSprite(
      "but_arrow_right",
      "./sprites/but_arrow_right.png"
    );

    s_oSpriteLibrary.addSprite("hand_cue_ball", "./sprites/hand_cue_ball.png");
    s_oSpriteLibrary.addSprite("shot_bar", "./sprites/shot_bar.png");
    s_oSpriteLibrary.addSprite("over_shot_bar", "./sprites/over_shot_bar.png");

    s_oSpriteLibrary.addSprite("btcIcon", "./sprites/btc.png");

    s_oSpriteLibrary.addSprite("coin_front_texture", "./img/coin_front_texture.png");

    for (var i = 0; i < TABLE_UPPER_BUMPER.length; i++) {
      var szName = TABLE_UPPER_BUMPER[i].sprite;
      s_oSpriteLibrary.addSprite(szName, "./sprites/" + szName + ".png");
    }

    for (var i = 0; i < 4; i++) {
      s_oSpriteLibrary.addSprite(
        "bg_interactive_help_" + i,
        "./sprites/bg_interactive_help_" + i + ".png"
      );
    }

    for (var i = 0; i < HAND_ANIM_NUM_FRAMES; i++) {
      s_oSpriteLibrary.addSprite(
        "hand_anim_" + i,
        "./sprites/hand_anim/hand_anim_" + i + ".png"
      );
    }

    // Add customization sprites
    // В методе _loadImages добавьте:
    s_oSpriteLibrary.addSprite("pool_table", "./sprites/pool_table.png");
    s_oSpriteLibrary.addSprite("pool_table_red", "./sprites/pool_table_red.png");
    s_oSpriteLibrary.addSprite("pool_table_blue", "./sprites/pool_table_blue.png");
    s_oSpriteLibrary.addSprite("stick_gold", "./sprites/stick_gold.png");
    s_oSpriteLibrary.addSprite("stick_silver", "./sprites/stick_silver.png");

    // Добавлено по предложению
    s_oSpriteLibrary.addSprite("profile_icon", "./sprites/userProfile.png");

    RESOURCE_TO_LOAD += s_oSpriteLibrary.getNumSprites();

    s_oTextureLibrary = [];
    var oLoadingTextureManager = new THREE.LoadingManager();
    oLoadingTextureManager.onLoad = this._onTexturesLoaded();

    RESOURCE_TO_LOAD += TEXTURE_NAME.length;

    var oLoaderTexture = new THREE.TextureLoader(oLoadingTextureManager);
    for (var i = 0; i < TEXTURE_NAME.length; i++) {
      var szName = TEXTURE_NAME[i].name;
      var szPath = TEXTURE_NAME[i].path;
      s_oTextureLibrary[szName] = oLoaderTexture.load(
        szPath,
        this._onImagesLoaded
      );
    }

    s_oSpriteLibrary.loadSprites();
  };

  this._onTexturesLoaded = function () {};

  this._onImagesLoaded = function () {
    _iCurResource++;

    var iPerc = Math.floor((_iCurResource / RESOURCE_TO_LOAD) * 100);

    _oPreloader.refreshLoader(iPerc);
  };

  this._onAllImagesLoaded = function () {};

  this._allResourcesLoaded = function () {
    _oPreloader.unload();

    try {
      saveItem(LOCALSTORAGE_STRING + "ls_available", "ok");
    } catch (evt) {
      // localStorage not defined
      s_bStorageAvailable = false;
    }

    s_oSoundTrack = playSound("soundtrack", 1, true);

    s_oMain.gotoMenu();
  };

  this.gotoMenu = function () {
    _oMenu = new CMenu();
    _iState = STATE_MENU;
  };

  this.gotoDifficultyMenu = function () {
    _oDifficultyMenu = new CDifficutlyMenu();
    _iState = STATE_MENU;
  };

  this.gotoRoomList = function () {
    _oMenu = null;
    _oRoomList = new CRoomList();
    s_oRoomList = _oRoomList;
    _bUpdate = true;
  };

  this.gotoTelegramRoomList = function () {
    _oMenu = null;
    _oTelegramRoomList = new CTelegramRoomList();
    s_oTelegramRoomList = _oTelegramRoomList;
    _bUpdate = true;
  };

  this.gotoPlayByIdRoom = function () {
    _oMenu = null;
    _oPlayByIdRoom = new CPlayByIdRoom();
    s_oPlayByIdRoom = _oPlayByIdRoom;
    _bUpdate = true;
  };

  this.gotoProfile = function () {
    _oProfile = new CProfile();
    _iState = STATE_MENU;
  };

  this.gotoGame = function (pid) {
    console.log("CMain: gotoGame вызван с параметром:", pid, "тип:", typeof pid);
    
    // Проверка gameId на валидность
    var gameIdValid = (typeof pid === 'string' && pid.length > 5);
    var isMultiplayer = false;
    
    // Если pid - строка (gameId), значит это мультиплеер (приглашение по ID)
    if (gameIdValid) {
      console.log("CMain: Запуск мультиплеерной игры с gameId:", pid);
      
      // Устанавливаем режим игры на мультиплеер
      window.s_iPlayerMode = GAME_MODE_TWO;
      s_iPlayerMode = GAME_MODE_TWO;
      isMultiplayer = true;
      
      // Дополнительная проверка: если режим игры не установлен правильно,
      // выводим предупреждение и принудительно устанавливаем
      if (s_iPlayerMode !== GAME_MODE_TWO) {
        console.warn("CMain: ВНИМАНИЕ! Режим игры не установлен правильно. Исправляем.");
        s_iPlayerMode = GAME_MODE_TWO;
        window.s_iPlayerMode = GAME_MODE_TWO;
      }
      
      // Сохраняем режим в localStorage для дополнительной надежности
      try {
        localStorage.setItem('billiard_player_mode', GAME_MODE_TWO);
      } catch(e) {
        console.warn("CMain: Ошибка при сохранении режима игры в localStorage:", e);
      }
    } else {
      console.log("CMain: Запуск обычной игры (не мультиплеер)");
    }
    
    // Проверяем, что режим игры правильно установлен
    console.log("CMain: Режим игры s_iPlayerMode =", s_iPlayerMode, 
               "(GAME_MODE_TWO =", GAME_MODE_TWO, ", GAME_MODE_CPU =", GAME_MODE_CPU, ")");
    
    // Для мультиплеера, добавляем глобальную переменную для дополнительной проверки
    if (isMultiplayer) {
      window.MULTIPLAYER_GAME_ID = pid;
      // Удалим переменную через 30 секунд, чтобы не засорять память
      setTimeout(function() {
        delete window.MULTIPLAYER_GAME_ID;
      }, 30000);
      
      // Отправляем событие о старте мультиплеерной игры для других компонентов
      setTimeout(function() {
        try {
          $(document).trigger("multiplayer_game_launch", {gameId: pid});
        } catch(e) {
          console.error("CMain: Ошибка при отправке события multiplayer_game_launch:", e);
        }
      }, 100);
    }
    
    // Создаем игру
    _oGame = new CGame(pid);
    _iState = STATE_GAME;
  };

  this.levelSelected = function (iLevel) {
    s_iLevelSelected = iLevel;

    if (iLevel >= s_iLastLevel) {
      s_iLastLevel = iLevel;
    }
  };

  this.stopUpdateNoBlockAndTick = function () {
    _bGameUpdate = false;
  };

  this.startUpdateNoBlockAndTick = function () {
    _bGameUpdate = true;
  };

  this.stopUpdateNoBlock = function () {
    _bUpdate = false;
    createjs.Ticker.paused = true;
  };

  this.startUpdateNoBlock = function () {
    s_iPrevTime = new Date().getTime();
    _bUpdate = true;
    createjs.Ticker.paused = false;
  };

  this.stopUpdate = function () {
    _bUpdate = false;
    createjs.Ticker.paused = true;
    $("#block_game").css("display", "block");

    if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
      Howler.mute(true);
    }
  };

  this.startUpdate = function () {
    s_iPrevTime = new Date().getTime();
    _bUpdate = true;
    createjs.Ticker.paused = false;
    $("#block_game").css("display", "none");

    if (DISABLE_SOUND_MOBILE === false || s_bMobile === false) {
      if (s_bAudioActive) {
        Howler.mute(false);
      }
    }
  };

  this._update = function (event) {
    if (_bUpdate === false) {
      return;
    }
    var iCurTime = new Date().getTime();
    s_iTimeElaps = iCurTime - s_iPrevTime;
    s_iCntTime += s_iTimeElaps;
    s_iCntFps++;
    s_iPrevTime = iCurTime;

    if (s_iCntTime >= 1000) {
      s_iCurFps = s_iCntFps;
      s_iCntTime -= 1000;
      s_iCntFps = 0;
    }

    if (_iState === STATE_GAME && _bGameUpdate) {
      _oGame.update();
    }

    if (s_oStage !== undefined) {
      s_oStage.update(event);
    }

    if (s_oStageUpper3D !== undefined) {
      s_oStageUpper3D.update(event);
    }
  };

  this.gotoAdminPanel = function() {
    _iState = STATE_ADMIN_PANEL;
    
    // Если админ-панель уже создана, выходим
    if (_oAdminPanel) {
      return;
    }
    
    // Создаем новую админ-панель
    _oAdminPanel = new CAdminPanel();
  };

  s_oMain = this;
  s_bAudioActive = oData.audio_enable_on_startup;

  ENABLE_FULLSCREEN = oData.fullscreen;
  ENABLE_CHECK_ORIENTATION = oData.check_orientation;
  POINTS_FOR_BALL_POT = oData.points_for_ball_pot;
  POINTS_FOR_FAULT = oData.points_for_fault;

  var iLang = navigator.language.split("-")[0];
  s_iCurLang = LANG_CODES[iLang];
  console.log("LANG_CODES[" + navigator.language + "] " + s_iCurLang);
  refreshLanguage();

  this.initContainer();
}

var s_bMobile;
var s_bAudioActive = false;
var s_iCntTime = 0;
var s_iTimeElaps = 0;
var s_iPrevTime = 0;
var s_iCntFps = 0;
var s_iCurFps = 0;

var s_oSoundTrack = null;
var s_oDrawLayer;
var s_oStage;
var s_oStageUpper3D;
var s_oMain = null;
var s_oSpriteLibrary;
var s_oTextureLibrary;
var s_oLocalStorage;

var s_bFullscreen = false;
var s_bStorageAvailable = true;
var s_bInteractiveHelp = true;
var s_aSoundsInfo;
var s_iGameMode = GAME_MODE_EIGHT;
var s_iPlayerMode = GAME_MODE_CPU;
var s_iCurLang = LANG_EN;
var s_iGameDifficulty = EASY;
var Wallet;
