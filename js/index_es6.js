const stream = {
  type: 'dash',
  uri: 'https://storage.googleapis.com/shaka-demo-assets/sintel-mp4-wvtt/dash.mpd',
};

const videoWithControls = document.getElementById("player0");
const videoElement = videoWithControls.getElementsByTagName('video')[0];
const videoPoster = videoWithControls.getElementsByClassName('veygo-poster')[0];
videoPoster.addEventListener('click', function(event) {
  player.play();
});
const videoPosterImg = videoWithControls.getElementsByClassName('veygo-poster-img')[0];
let player;
const autoplay = false;
const posterSrc = 'https://via.placeholder.com/640x360.png';
const autoplayUnmuteDiv = videoWithControls.getElementsByClassName('veygo-autoplay-unmute')[0];
autoplayUnmuteDiv.addEventListener('click', function(event) {
  player.setVolume({muted: false});
  autoplayUnmuteDiv.style.display = 'none';
});
if (posterSrc) {
  // videoElement.poster = posterSrc;
  videoPosterImg.src = posterSrc;
}

let controlsUi;

async function init() {
  const { player: localPlayer, reporter } = await vip.setup({
      app_key: vipConfig.CONFIG_VIP_ANALYTICS_API_KEY,
      app: {
        name: 'VeygoWebDemoPlayer',
        version: '0.1',
      },
    },
    'default', // or an hash of your application userId
    videoElement,
  );

  player = localPlayer;

  // reporter.checkForApplicationUpdate();
  const controlsUi = new VeygoControls();
  controlsUi.init(videoWithControls, null);
  controlsUi.registerPlayer(player);

  if (!autoplay) {
    controlsUi.onControlPause();
  }
  player.addEventListener('status', onPlayerStatus, false);

  // starting the player
  player.start();
}

async function onPlayerStatus(info)
{
  console.log("vip-player status " + info.status);
  if (info.status === "initialized") {
    const options = {};
    await player.setup();
    if (autoplayUnmuteDiv.style.display === 'block') {
       player.setVolume({muted: false});
       autoplayUnmuteDiv.style.display = 'none';
    }
    player.notifyStartStreamConfiguration(stream);
    player.setSource(stream, options);
  } else if (info.status === "ready") {
    if (autoplay) {
      try {
        await player.play();
      } catch (ex) {
        // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
        player.setVolume({muted: true});
        player.play();
        autoplayUnmuteDiv.style.display = 'block';
      }
    }
  } else if (info.status === "playing") {
    videoPoster.style.display = 'none';
  }
}
window.addEventListener("DOMContentLoaded", init);
