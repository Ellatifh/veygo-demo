
var VeygoControls = function() {

}

// Maximum percentage of player height that the thumbnail will fill
var maxPercentageThumbnailScreen = 0.15;
// Separation between the control bar and the thumbnail (in px)
var bottomMarginThumbnail = 10;
// Maximum scale so small thumbs are not scaled too high
var maximumScale = 2;

VeygoControls.prototype = {
  initCommon: function(videoContainerRect, delegate) {
    this.videoContainerRect = videoContainerRect;
    this.delegate = delegate;
    this.currentVideoRepresentationId = undefined;
    this.player = undefined;
  },

  init: function(videoWithControls, delegate) {
    this.videoWithControls = videoWithControls;
    var videoElement = videoWithControls.getElementsByTagName("video")[0];
    this.initCommon(videoElement.parentNode, delegate);
    this.control = videoWithControls.getElementsByClassName("veygo-control")[0];
    this.playButton = this.control.getElementsByClassName("play")[0];
    if (this.playButton)
      this.playButton.addEventListener("click", this.onControlPlay.bind(this));
    this.pauseButton =  this.control.getElementsByClassName("pause")[0];
    if (this.pauseButton)
      this.pauseButton.addEventListener("click", this.onControlPause.bind(this));

    this.progress = videoWithControls.getElementsByClassName("progress")[0];
    this.cursor = videoWithControls.getElementsByClassName("cursor")[0];
    this.cursorContainer = videoWithControls.getElementsByClassName("cursor-container")[0];
    this.cursorHolder = videoWithControls.getElementsByClassName("cursor-holder")[0];
    this.cursorHolder.addEventListener("mousedown",
                                       this.onControlSeekStart.bind(this), true);
    this.cursorHolder.addEventListener("mouseup", this.onControlSeekUp.bind(this), true);
    this.cursorHolder.addEventListener("mousemove", this.onControlSeekMove.bind(this), true);
    this.cursorHolder.addEventListener("mouseout", this.onControlSeekOut.bind(this), true);

    this.tracksButton = videoWithControls.getElementsByClassName("bt-tracks")[0];
    if (this.tracksButton)
      this.tracksButton.addEventListener("click", this.onControlTracks.bind(this));
    this.positionLabel = videoWithControls.getElementsByClassName("position")[0];
    this.durationLabel = videoWithControls.getElementsByClassName("duration")[0];
    this.fullscreenButton = videoWithControls.getElementsByClassName("bt-fullscreen")[0];
    if (this.fullscreenButton) { // not available on tv (cast)
      this.fullscreenButton.addEventListener("click", this.onControlFullscreen.bind(this));
      this.fullscreenexitButton = videoWithControls.getElementsByClassName("bt-fullscreen-exit")[0];
      this.fullscreenexitButton.addEventListener("click", this.onControlFullscreen.bind(this));

      this.tracksPanel = videoWithControls.getElementsByClassName("tracks")[0];
      this.tracksPanel.addEventListener("click", this.onTrack.bind(this), true);
      this.audioTracksList = videoWithControls.getElementsByClassName("audio-tracks")[0];
      this.textTracksList = videoWithControls.getElementsByClassName("text-tracks")[0];

      //volume bar
      this.volumeBar = videoWithControls.getElementsByClassName("volume-bar")[0];
      this.volumeBar.addEventListener("change", this.onControlVolume.bind(this));

      this.muteButton = videoWithControls.getElementsByClassName("bt-mute")[0];
      this.unmuteButton = videoWithControls.getElementsByClassName("bt-unmute")[0];
      this.muteButton.addEventListener("click", this.onToggleVolume.bind(this));
      this.unmuteButton.addEventListener("click", this.onToggleVolume.bind(this));

      this.castButton = videoWithControls.getElementsByClassName("bt-cast")[0];
      if (this.castButton)
        this.castButton.addEventListener(
          "click", this.onCastClick_.bind(this));

      this.castReceiverName_ = videoWithControls.getElementsByClassName("veygo-castreceiver-name")[0];

      this.thumbnailContainer = videoWithControls.getElementsByClassName("thumbnail-container")[0];
      this.thumbnailElem = videoWithControls.getElementsByClassName("thumbnail-elem")[0];
      this.thumbnailTimeLabel = videoWithControls.getElementsByClassName("thumbnail-time-label")[0];
      this.thumbnailContainer.style.display = "block";
      this.thumbnailContainer.style.display = "none";
    }

    this.setupFullscreen();

    if (typeof Intl != "undefined") {
      this.numberTimeFormat = new Intl.NumberFormat("en-EN", {
        minimumIntegerDigits: 2,
        maximumFractionDigits: 0
      });
    } else {
      this.numberTimeFormat = {
        format: function (value) {
          var x = "" + Math.floor(value);
          while (x.length < 2) {
            x = "0" + x;
          }
          return x;
        }
      }
    }
  },

  registerPlayer: function(player) {
    this.player = player;
    this.player.addEventListener('adaptation', function(event) {
      this.currentVideoRepresentationId = event.detail.video.id;
    }.bind(this));
    player.addEventListener('playing', this.onPlayerPlayingEvent.bind(this));
    player.addEventListener('pause', this.onPlayerPlayingEvent.bind(this));
    player.addEventListener('endReached', this.onPlayerPlayingEvent.bind(this));
    player.addEventListener('seeked', this.onPlayerPlayingEvent.bind(this));
    player.addEventListener('volume', function(volumeData) {
      if (volumeData.muted !== undefined) {
        this.volumeIsMuted = volumeData.muted;
        if (volumeData.muted) {
          this.volumeBar.value = 0;
          this.muteButton.style.display = "none";
          this.unmuteButton.style.display = "block";
        } else {
          this.muteButton.style.display = "block";
          this.unmuteButton.style.display = "none";
        }
      }
      if (volumeData.volume !== undefined && !volumeData.muted) {
        this.volumeBar.value = volumeData.volume;
      }
    }.bind(this));
  },

  moveProgressCursor: function (position)
  {
    this.cursor.style.left = position;
  },
  pad: function(n, width, z) {
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  },
  durationToLabel: function (ms) {
    var minutes = this.numberTimeFormat.format(Math.floor(ms / 60000));
    var seconds = this.numberTimeFormat.format(Math.floor((ms % 60000) / 1000));
    return minutes  + ":" + seconds;
  },
  timeToLabel: function (epoch) {
    var d = new Date(epoch);
    var hours = d.getHours();
    var minutes = this.pad(d.getMinutes(), 2);
    var seconds = this.pad(d.getSeconds(), 2);
    return hours  + ":" + minutes  + ":" + seconds;
  },

  show: function (e)
  {
    this.resetControlTimers();
    this.updateProgress().then(function() {
      this.control.classList.add("veygo-control-active");
    }.bind(this));
  },

  hide: function ()
  {
    this.control.classList.remove("veygo-control-active");
    this.clearControlTimers();
  },

  resetControlTimers: function ()
  {
    this.clearControlTimers();
    this.hideControlTimer = window.setTimeout(this.hide.bind(this), 5000);
    this.controlProgressTimer = window.setInterval(this.updateProgress.bind(this), 1000);
  },

  clearControlTimers: function ()
  {
    if (this.hideControlTimer)
      window.clearTimeout(this.hideControlTimer);

    if (this.controlProgressTimer)
      window.clearInterval(this.controlProgressTimer);

    this.hideControlTimer = null;
    this.controlProgressTimer = null;
  },

  resetProgress: function ()
  {
    var fill = this.videoWithControls.getElementsByClassName("fill")[0];
    fill.style.right = "100%";
    this.moveProgressCursor("0%");
    this.durationLabel.innerHTML = "--:--";
    this.positionLabel.innerHTML = "--:--";
  },

  updateProgress: function ()
  {
    if (!this.player) { return Promise.resolve(); }
    var ti = this.player.getTimeInfo();
    if (!ti) return Promise.resolve(null);
    return ti.then(function(timeInfo) {
      this.updateProgressWithTimeInfo(timeInfo);
    }.bind(this));
  },

  updateProgressWithTimeInfo: function (timeInfo)
  {
    if (timeInfo === null) {
      this.position = null;
      this.seekRange = null;
      return this.resetProgress();
    }
    this.isLive = timeInfo.isLive;
    this.position = timeInfo.position;
    this.seekRange = timeInfo.seekRange;
    var duration = timeInfo.seekRange[1] - timeInfo.seekRange[0];
    if (this.position >= 0) {
      var pos = (this.position - this.seekRange[0]) * 100 / duration;
      if (pos < 0) pos = 0;
      var fill = this.videoWithControls.getElementsByClassName("fill")[0];
      fill.style.right = "" + (100 - pos) + "%";

      /* do not move cursor when user is seeking */
      if (!this.userSeeking)
        this.moveProgressCursor(pos + "%");

      if (timeInfo.isLive) {
        this.positionLabel.innerHTML = this.timeToLabel(this.seekRange[0]);
        this.durationLabel.innerHTML = this.timeToLabel(this.position);
      } else {
        this.positionLabel.innerHTML = this.durationToLabel(this.position);
        this.durationLabel.innerHTML = this.durationToLabel(this.seekRange[1]);
      }
    }
  },

  onControlPause: function ()
  {
    if (!this.player) { return; }
    this.resetControlTimers();
    this.pauseButton.style.display = "none";
    this.playButton.style.display = "block";
    this.player.pause();
  },

  onControlPlay: function ()
  {
    if (!this.player) { return; }
    this.resetControlTimers();
    this.pauseButton.style.display = "block";
    this.playButton.style.display = "none";
    this.player.play();
  },

  onControlTracks: async function ()
  {
    this.resetControlTimers();
    if (this.tracksPanel.style.display === "block") {
      this.tracksPanel.style.display = "none";
      this.player.applyTracks();
      return;
    }

    if (!this.player) { return; }

    var tracks = await this.player.getTracks();
    this.displayTracks(tracks);
  },

  setupFullscreen: function() {
    var prefixedFullscreen;
    var iosFullscreen = false;
    var userAgent = window.navigator.userAgent;

    if (this.videoWithControls.requestFullscreen) {
      prefixedFullscreen = '';
    } else if (this.videoWithControls.mozRequestFullScreen) {
      prefixedFullscreen = 'moz';
    } else if (this.videoWithControls.webkitRequestFullScreen) {
      prefixedFullscreen = 'webkit';
    } else if (this.videoWithControls.msRequestFullscreen) {
      prefixedFullscreen = 'ms';
    } else if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i)) {
      iosFullscreen = true;
      this.volumeBar.style.display = 'none';
    }

    if (prefixedFullscreen !== undefined) {
      var fullscreenElement;
      var requestFullscreen;
      if (prefixedFullscreen === '') {
        fullscreenElement = 'fullscreenElement';
        requestFullscreen = 'requestFullscreen';
      } else if (prefixedFullscreen === 'moz') {
        fullscreenElement = 'mozFullScreenElement';
        requestFullscreen = 'mozRequestFullScreen';
      } else if (prefixedFullscreen === 'webkit') {
        fullscreenElement = 'webkitFullscreenElement';
        requestFullscreen = 'webkitRequestFullScreen';
      } else if (prefixedFullscreen === 'ms') {
        fullscreenElement = 'mozFullscreenElement';
        requestFullscreen = 'msRequestFullscreen';
      }
      this.isInFullScreen = function() { return (document[fullscreenElement] && document[fullscreenElement] !== null); }
      this.requestFullscreen = function() {
        this.videoWithControls[requestFullscreen]();
      }.bind(this);
      this.exitFullscreen = function() {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
      document.addEventListener(prefixedFullscreen + 'fullscreenchange',function (e) {
        this.onFullscreenChanged(this.isInFullScreen())
      }.bind(this));
     /* } else if (iosFullscreen) {
      this.isInFullScreen = function() { return (document.webkitIsFullScreen == true); }
      this.requestFullscreen = function() {
        this.videoElement.webkitEnterFullscreen();
      }.bind(this);
      this.videoElement.addEventListener('webkitbeginfullscreen',function (e) {
        var fullscreen = this.isInFullScreen();
        console.log('webkitbeginfullscreen ' + fullscreen);
      }.bind(this));
      this.videoElement.addEventListener('webkitendfullscreen',function (e) {
        var fullscreen = this.isInFullScreen();
        console.log('webkitendfullscreen ' + fullscreen);
        // automatically paused out of fullscreen, no way to play automatically
        // this.player.play();
      }.bind(this)); */
    } else {
      this.isInFullScreen = function() {
        return document.body.classList.contains('veygo-full-window');
      }.bind(this);
      this.requestFullscreen = function() {
        document.body.classList.add('veygo-full-window');
        this.videoWithControls.classList.add('veygo-fullscreen');
        this.onFullscreenChanged(true);
      }.bind(this);
      this.exitFullscreen = function() {
        document.body.classList.remove('veygo-full-window');
        this.videoWithControls.classList.remove('veygo-fullscreen');
        this.onFullscreenChanged(false);
      }.bind(this);
    }
  },

  onFullscreenChanged: function (isFullscreen) {
    var fullscreenBtn = this.videoWithControls.getElementsByClassName("bt-fullscreen")[0];
    var fullscreenExitBtn = this.videoWithControls.getElementsByClassName("bt-fullscreen-exit")[0];
    if (isFullscreen) {
      fullscreenBtn.style.display = "none";
      fullscreenExitBtn.style.display = "block";
    } else {
      fullscreenExitBtn.style.display = "none";
      fullscreenBtn.style.display = "block";
    }
  },

  onControlFullscreen: function () {
    this.resetControlTimers();
    var isInFullScreen = this.isInFullScreen();

    if (!isInFullScreen) {
      this.requestFullscreen();
    } else {
      this.exitFullscreen();
    }
  },

  displayTracks: async function (tracks)
  {
    const videoRepTracks = this.videoWithControls.getElementsByClassName("video-representations")[0];
    while (videoRepTracks.firstChild) {
      videoRepTracks.removeChild(videoRepTracks.firstChild);
    }

    const restrictions = await this.player.getAbrRestrictions();

    const videol = tracks.video.length;
    for (var i = 0; i < videol; ++i) {
      const t = tracks.video[i];
      if (!t["is-active"]) continue;

      const representations = t.representations;

      // streams with no manifest provides no representation list
      if (representations !== undefined) {
        const representationsl = representations.length;
        for (let i = 0; i < representationsl; ++i) {
          var r = representations[i];
          var li = document.createElement("li");
          const desc = (r.playbackQuality)
            ? r.playbackQuality
            : (r.scanType === 'progressive')
                ? `${r.height}p`
                : ((r.scanType === 'interlaced')
                  ? `${r.height}i`
                  : `${r.width}x${r.height}`);
          li.innerHTML = desc;
          li.classList.add('representation');
          li.classList.add(`representation${r.id}`);
          li.representation = r;
          li.addEventListener("click", this.onClickRepresentation.bind(this, r));
          if (r.playbackQuality === 'auto' && 'default' === restrictions.playbackQuality) {
            li.classList.add('restricted');
          } else if (restrictions.playbackQuality && r.playbackQuality === restrictions.playbackQuality) {
            li.classList.add('restricted');
          } else if (restrictions.min_height && (r.height >= restrictions.min_height) && (r.height <= restrictions.max_height)) {
            li.classList.add('restricted');
          }
          if (this.currentVideoRepresentationId === r.id) {
            li.classList.add("enabled");
          }
          videoRepTracks.appendChild(li)
        }
      }
    }
    const videoTracks = this.videoWithControls.getElementsByClassName("video-tracks")[0];
    videoTracks.style.display = (videol === 0) ? 'none' : 'block';

    while (this.audioTracksList.firstChild) {
      this.audioTracksList.removeChild(this.audioTracksList.firstChild);
    }
    var audiol = tracks.audio.length;
    for (var i = 0; i < audiol; ++i) {
      var t = tracks.audio[i];
      var li = document.createElement("li");
      li.innerHTML = t.language || t.name;
      li.track = t;
      if (t["is-active"])
        li.classList.add("enabled");
      this.audioTracksList.appendChild(li)
    }

    while (this.textTracksList.firstChild) {
      this.textTracksList.removeChild(this.textTracksList.firstChild);
    }
    var textl = tracks.text.length;
    for (var i = 0; i < textl; ++i) {
      var t = tracks.text[i];
      var li = document.createElement("li");
      li.innerHTML = t.language || t.name;
      li.track = t;
      if (t["is-active"])
        li.classList.add("enabled");
      this.textTracksList.appendChild(li)
    }
    this.tracksPanel.style.display = "block";
  },

  onTrack: async function (e)
  {
    if (!e.target.matches("li"))
      return;

    var li = e.target;
    let tracks;
    if (li.representation) return;
    if (li.classList.contains("enabled")) {
      li.classList.remove("enabled");
      this.player.toggleTrack(li.track, false);
      tracks = await this.player.applyTracks();
    } else {
      li.classList.add("enabled");
      this.player.toggleTrack(li.track, true);
      tracks = await this.player.applyTracks();
    }

    this.displayTracks(tracks);
  },

  onClickRepresentation: async function(representation) {
    const restriction = await this.player.getAbrRestrictions();

    for (let repDiv of this.videoWithControls.getElementsByClassName('representation')) {
      repDiv.classList.remove('restricted');
    }

    if (representation.playbackQuality) {
      this.player.setAbrRestrictions({ playbackQuality: representation.playbackQuality });
      const newId = `representation${representation.id}`;
      this.videoWithControls.getElementsByClassName(newId)[0].classList.add('restricted');
    } else if (restriction.min_height && (representation.height === restriction.min_height)) {
      this.player.setAbrRestrictions({});
    } else {
      this.player.setAbrRestrictions({
        min_height: representation.height,
        max_height: representation.height,
      });
      const newId = `representation${representation.id}`;
      this.videoWithControls.getElementsByClassName(newId)[0].classList.add('restricted');
    }
  },

  updateCursor: function ()
  {
    var realPosition = this.userSeekingPosition * 100 / this.progress.offsetWidth;
    this.moveProgressCursor(realPosition + "%");
  },

  getSeekingPosition: function (touch) {
    var userSeekingPosition = (touch.clientX - this.progress.getBoundingClientRect().left);
    if (userSeekingPosition > this.progress.offsetWidth)
      userSeekingPosition = this.progress.offsetWidth;
    if (userSeekingPosition < 0)
      userSeekingPosition = 0;
    return userSeekingPosition;
  },

  updateSeekingPosition: function (seekingPositionPx)
  {
    this.userSeekingPosition = seekingPositionPx;
  },

  onControlSeekStart: function (e)
  {
    if (this.userSeeking)
      return;

    this.userSeeking = true;
    this.userSeekingTimer = window.setInterval(this.updateCursor.bind(this), 30);

    var seekingPositionPx = this.getSeekingPosition(e);
    this.updateSeekingPosition(seekingPositionPx);
  },

  onControlSeekMove: function (e)
  {
    if (!this.seekRange) return;
    var seekingPositionPx = this.getSeekingPosition(e);
    var duration = this.seekRange[1] - this.seekRange[0];
    var position = this.seekRange[0] + seekingPositionPx * duration / this.progress.offsetWidth;

    this.player.getThumbnail(position).then(function(thumbnail) {
      this.onControlSeekMoveWithThumbnail(seekingPositionPx, position, thumbnail || { height: 0 });
    }.bind(this));
  },

  onControlSeekMoveWithThumbnail: function (seekingPositionPx, position, thumbnail)
    {
    this.thumbnailContainer.style.display = "block";

    var videoControllerRect = this.progress.parentNode;
    // Adjust left variable for positioning thumbnail with regards to its viewport
    var left = ( this.progress.getBoundingClientRect().left - this.videoContainerRect.getBoundingClientRect().left);
    left += seekingPositionPx;
    // Take into account thumbnail control
    var ctrlWidth = parseInt(window.getComputedStyle(this.thumbnailElem).width);
    if (!isNaN(ctrlWidth)) {
      left -= ctrlWidth / 2;
    }

    var scale = (this.videoContainerRect.offsetHeight * maxPercentageThumbnailScreen)/thumbnail.height;
    if (scale > maximumScale) {
      scale = maximumScale;
    }

    // Set thumbnail control position
    this.thumbnailContainer.style.left = left + "px";
    this.thumbnailContainer.style.display = "";
    this.thumbnailContainer.style.bottom += Math.round(videoControllerRect.offsetHeight + bottomMarginThumbnail ) + "px";
    this.thumbnailContainer.style.height = Math.round(thumbnail.height) + "px";

    this.thumbnailElem.style.height = thumbnail.height + "px";
    if (thumbnail.url) {
      var backgroundStyle = "url('" + thumbnail.url + "') " + (thumbnail.x > 0 ? "-" + thumbnail.x : "0") +
           "px " + (thumbnail.y > 0 ? "-" + thumbnail.y : "0") + "px";
      this.thumbnailElem.style.background = backgroundStyle;
      this.thumbnailElem.style.transform = "scale(" + scale + "," + scale + ")";
      this.thumbnailElem.style.width = thumbnail.width + "px";
    }
    if (this.thumbnailTimeLabel) {
      var label = (this.isLive ? this.timeToLabel : this.durationToLabel).call(this, position);
      this.thumbnailTimeLabel.textContent = label;
    }

    if (!this.userSeeking)
      return;

    this.resetControlTimers();
    this.updateSeekingPosition(seekingPositionPx);
  },

  onControlSeekOut: function (e)
  {
    this.thumbnailContainer.style.display = "none";
  },

  onControlSeekUp: function (e)
  {
    if (!this.userSeeking)
      return;

    this.resetControlTimers();
    e.stopPropagation();
    window.clearInterval(this.userSeekingTimer);

    if (e.touches && e.touches.length == 1) {
      var seekingPositionPx = this.getSeekingPosition(e.touches.item(0));
      this.updateSeekingPosition(seekingPositionPx);
    }
    this.updateCursor();

    this.userSeeking = false;

    if (!this.seekRange)
      return;

    var duration = this.seekRange[1] - this.seekRange[0];
    var position = this.seekRange[0] + this.userSeekingPosition * duration / this.progress.offsetWidth;
    this.player.seekTo(position);
  },

  onControlStop: function (e)
  {
    if (this.delegate.castProxy.isCasting()) {
      this.delegate.castProxy.forceDisconnect();
    }
    this.player.freeze();
  },

  onControlVolume: function()
  {
    this.player.setVolume({ muted: false, volume: parseFloat(this.volumeBar.value) });
  },

  onToggleVolume: function()
  {
    this.player.setVolume({ muted: !this.volumeIsMuted });
  },

  onCastClick_: function()
  {
    if (this.delegate.castProxy.isCasting()) {
      this.delegate.castProxy.suggestDisconnect();
    } else {
      this.castButton.disabled = true;
      // Disable the load/unload buttons, to prevent the users from trying to load
      // an asset while the cast proxy is connecting.
      // That can lead to strange, erratic behavior.
      this.delegate.castProxy.cast().then(function() {
        this.castButton.disabled = false;
        // Success!
      }.bind(this), function(error) {
        this.castButton.disabled = false;
        if (error.code != "cast_canceled_by_user") {
        //  this.onError_(error);
        }
      }.bind(this));
    }
  },
  onCastStatusChange: function()
  {
    var canCast = this.delegate.castProxy.canCast();
    var isCasting = this.delegate.castProxy.isCasting();

    if (this.notifyCastStatus_) this.notifyCastStatus_(isCasting);
    this.castButton.style.display = canCast ? "inherit" : "none";
    this.castButton.setAttribute('data-toggle', 'tooltip');
    this.castButton.setAttribute('title', isCasting ? "cast_connected" : "cast");
    this.castButton.style.color =
        isCasting ? "blue" : "inherit";
    this.castReceiverName_.style.display =
        isCasting ? "inherit" : "none";
    this.castReceiverName_.textContent =
        isCasting ? "Casting to " + this.delegate.castProxy.receiverName() : "";
    if (this.delegate.castProxy.isCasting()) {
      this.control.classList.add("casting");
    } else {
      this.control.classList.remove("casting");
    }
  },
  onPlayerPlayingEvent: function(event)
  {
//    console.log("got event " + event.name + ": position=" + event.position
//                + ", error=" + event.error + ", bitrate=" + event.bitrate
//                 + ", speed=" + event.speed);
    if (event.speed) {
      this.pauseButton.style.display = "block";
      this.playButton.style.display = "none";
    } else if (event.speed === 0.0) {
      this.pauseButton.style.display = "none";
      this.playButton.style.display = "block";
    }
  }
}
