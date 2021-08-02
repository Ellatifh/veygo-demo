/**
 * @license
 * Copyright 2018 Veygo
 */



/**
 * A Chromecast receiver app.
 * @constructor
 * @suppress {missingProvide}
 */
function  VeygoReceiverApp() {
  /** @private {HTMLMediaElement} */
  this.videoElement = null;

  /** @private {VeygoControls} */
  this.controlsUi_ = null;

  /** @private {HTMLMediaElement} */
  this.posterDiv = null;

  /** @private {Element} */
  this.idle_ = null;

  /** @private {?number} */
  this.idleTimerId_ = null;

  /**
   * In seconds.
   * @const
   * @private {number}
   */
  this.idleTimeout_ = 300;
}


/**
 * Initialize the application.
 */
VeygoReceiverApp.prototype.init = async function() {
  /** @type {!HTMLMediaElement} */
  this.videoWithControls = document.getElementById("player0");
  /** @type {!HTMLMediaElement} */
  this.videoElement = this.videoWithControls.getElementsByTagName('video')[0];

   var options = {
     app_key: vipConfig.CONFIG_VIP_ANALYTICS_API_KEY,
     app: {
       name: `VeygoDemoCastReceiver`,
       major_version: `1.0.0-${window.vip.CONFIG_VIP_BUILD_ID}`,
     },
     activate_veygo_analytics: true,
   };
   const { player } = await vip.setup(options, "default", this.videoElement)
   .catch((error) => {
     console.log("unable to initialize vip", error);
   });
   this.player = player;
  this.player.addEventListener(
    'status', this.onPlayerStatus.bind(this), false);

  this.views = {
    idle: document.querySelector("#idle"),
    menu:  document.querySelector("#menu"),
    player: document.querySelector("#player"),
    control: document.querySelector("#control"),
  };
  this.active = this.views.loading;

  this.controlsUi_ = new VeygoControls();
  this.controlsUi_.init(this.videoWithControls, this);

  this.controlsUi_.registerPlayer(this.player);

  this.controlsElement_ = document.getElementById('controls');
  this.pauseIcon_ = document.getElementById('pauseIcon');
  this.idle_ = document.getElementById('idle');

  this.videoElement.addEventListener(
      'play', this.onPlayStateChange_.bind(this));
  this.videoElement.addEventListener(
      'pause', this.onPlayStateChange_.bind(this));
  this.videoElement.addEventListener(
      'seeking', this.onPlayStateChange_.bind(this));
  this.videoElement.addEventListener(
      'emptied', this.onPlayStateChange_.bind(this));

  this.posterDiv = this.videoWithControls.getElementsByClassName('veygo-poster')[0];

  this.startIdleTimer_();

  this.player.start();
};



VeygoReceiverApp.prototype.playerInitialized = async function ()
{
  await this.player.setup();
  this.receiver = new window.vipExtCastReceiver.CastReceiver(
    this.videoElement, this.player, this.appDataCallback_.bind(this));
  this.receiver.addEventListener(
    'caststatuschanged', this.checkIdle.bind(this));
};

VeygoReceiverApp.prototype.onPlayerStatus = function (info)
{
  console.log("vip-player status " + info.status);
  if (info.status === "initialized") {
    this.playerReady = true;
    this.playerInitialized();
    return;
  }

  if (info.status === "ready") {
    this.posterDiv.style.display = 'none';
    this.playerPrepared();
    return;
  }

  if (info.status === "ended") {
    this.playerCompleted();
    return;
  }

  if (info.status === "error") {
    console.log("player error: " + JSON.stringify(info.what));
    this.playerCompleted();
    return;
  }

  if (info.status === "buffering") {
    return;
  }
};


/**
 * @param {Object} appData
 * @private
 */
 VeygoReceiverApp.prototype.appDataCallback_ = function(appData) {
  // appData is null if we start the app without any media loaded.
  if (!appData) return;
  console.log('appData', appData);
};

/** @private */
VeygoReceiverApp.prototype.playerPrepared = function ()
{
  this.showPlayer();
};


VeygoReceiverApp.prototype.playerCompleted = function ()
{
  this.controlsUi_.clearControlTimers();
  this.playing = false;
  this.showPanel('idle');
};


VeygoReceiverApp.prototype.showPanel = function (name)
{
  if (this.active) {
    this.active.classList.remove("panel-active");
    this.active.classList.add("panel-hidden");
  }

  if (this.views[name]) {
    this.active = this.views[name];
    this.active.classList.add("panel-active");
    this.active.classList.remove("panel-hidden");
  }
};

VeygoReceiverApp.prototype.showPlayer = function ()
{
  this.controlsUi_.resetProgress();
  this.controlsUi_.moveProgressCursor("0%");
  this.showPanel('player');
  this.controlsUi_.show();
};

/** @private */
VeygoReceiverApp.prototype.checkIdle = function() {
  console.debug('status changed',
                'idle=', this.receiver.isIdle());

  // If the app is idle, show the idle card and set a timer to close the app.
  // Otherwise, hide the idle card and cancel the timer.
  if (this.receiver.isIdle()) {
    this.showPanel('idle');
    this.startIdleTimer_();
  } else {
    this.showPanel('player');
    this.cancelIdleTimer_();
    document.getElementById('idle').innerHTML = '<h1>Veygo player</h1>';
    // Set a special poster for audio-only assets.
    if (false) {
      this.videoElement.poster = 'assets/audioOnly.gif';
    } else {
      // The cast receiver never shows the poster for assets with video streams.
      this.videoElement.removeAttribute('poster');
    }
  }
};


/** @private */
 VeygoReceiverApp.prototype.startIdleTimer_ = function() {
  this.cancelIdleTimer_();

  this.idleTimerId_ = window.setTimeout(
      window.close.bind(window), this.idleTimeout_ * 1000.0);
};


/** @private */
 VeygoReceiverApp.prototype.cancelIdleTimer_ = function() {
  if (this.idleTimerId_ != null) {
    window.clearTimeout(this.idleTimerId_);
    this.idleTimerId_ = null;
  }
};


/** @private */
VeygoReceiverApp.prototype.onPlayStateChange_ = function() {
  this.controlsUi_.show();
};


/**
 * Initialize the receiver app by instantiating  VeygoReceiverApp.
 */
function receiverAppInit() {
  window.receiver = new  VeygoReceiverApp();
  window.receiver.init();
}


if (document.readyState == 'loading' ||
    document.readyState == 'interactive') {
  window.addEventListener('load', receiverAppInit);
} else {
  receiverAppInit();
}
