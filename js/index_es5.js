var stream = {
  type: 'dash',
  uri: 'https://storage.googleapis.com/shaka-demo-assets/sintel-mp4-wvtt/dash.mpd',
};
var videoWithControls = document.getElementById("player0");
var videoElement = this.videoWithControls.getElementsByTagName('video')[0];
var videoPoster = this.videoWithControls.getElementsByClassName('veygo-poster')[0];
videoPoster.addEventListener('click', function(event) {
  player.play();
});
var videoPosterImg = this.videoWithControls.getElementsByClassName('veygo-poster-img')[0];
var player;
var autoplay = false;
var posterSrc = 'https://via.placeholder.com/640x360.png';
var autoplayUnmuteDiv = videoWithControls.getElementsByClassName('veygo-autoplay-unmute')[0];
autoplayUnmuteDiv.addEventListener('click', function(event) {
  player.setVolume({muted: false});
  autoplayUnmuteDiv.style.display = 'none';
});
if (posterSrc) {
  // videoElement.poster = posterSrc;
  videoPosterImg.src = posterSrc;
}

var controlsUi;

function init() {
  vip.setup({
      app_key: vipConfig.CONFIG_VIP_ANALYTICS_API_KEY,
      app: {
        name: 'VeygoWebSimpleDemoPlayer',
        version: vip.CONFIG_VIP_BUILD_ID,
      },
    },
    'default', // or an hash of your application userId
    videoElement
  ).then(function(result) {
    player = result.player;

    // result.reporter.checkForApplicationUpdate();
    controlsUi = new VeygoControls();
    controlsUi.init(videoWithControls, null);

    controlsUi.registerPlayer(player);


    if (!autoplay) {
      controlsUi.onControlPause();
    }

    player.addEventListener('status', onPlayerStatus, false);

    // starting the player
    player.start();
  }).catch(function(err) {
    console.log('error on vip.setup', err);
  });
}

function onPlayerStatus(info)
{
  console.log("vip-player status " + info.status);
  if (info.status === "initialized") {
    player.setup().then(function() {
      var options = {};
      if (autoplayUnmuteDiv.style.display === 'block') {
         player.setVolume({muted: false});
         autoplayUnmuteDiv.style.display = 'none';
      }
      player.notifyStartStreamConfiguration(stream);
      player.setSource(stream, options);
    }).catch(function(err) {
      console.log('error on vip.Player.setup', err);
    });;
  } else if (info.status === "ready") {
    if (autoplay) {
      player.play().catch(function(ex) {
        // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
        player.setVolume({muted: true});
        player.play();
        autoplayUnmuteDiv.style.display = 'block';
      }.bind(this));
    }
  } else if (info.status === "playing") {
    videoPoster.style.display = 'none';
  }
}
window.addEventListener("DOMContentLoaded", init);
