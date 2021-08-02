/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

 /**
  * Generate a unique id
  * @internal
  */
 function generateRandomUuid() {
     var d = new Date().getTime();
     if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
         d += performance.now(); //use high-precision timer if available
     }
     return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
         var r = (d + Math.random() * 16) % 16 | 0;
         d = Math.floor(d / 16);
         return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
     });
 };

// https://stackoverflow.com/posts/46171960/revisions
function toFixedTrunc(value, n) {
  const v = value.toString().split('.');
  if (n <= 0) return v[0];
  let f = v[1] || '';
  if (f.length > n) return `${v[0]}.${f.substr(0,n)}`;
  while (f.length < n) f += '0';
  return `${v[0]}.${f}`
}

window.onerror = function(errorMsg, file, lineNumber) {
  console.log(`window.onerror ${errorMsg} ${file}:${lineNumber}`);
};

class Application {

  // Application Constructor
  constructor()
  {
    this._vipReporter = null;
    // All sample stream from streams-*.js files
    this._streamsWithStates = [
    ];
    // All _custom auths from streams-*.js files
    this._customAuths = [
    ];
  }

  initialize() {
    this.bindEvents();
  }

  bindEvents()
  {
    if (window.cordova) {
      document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    } else {
      window.addEventListener('load', this.onDeviceReady.bind(this), false);
    }
  }

  refreshStreamDiv(assetContainer, streamWithState) {
    const { stream } = streamWithState;
    const assetDiv = document.createElement('a');
    assetDiv.classList.add('asset');
    assetContainer.appendChild(assetDiv);

    assetDiv.href = stream.uri; // mostly for copy/paste
    assetDiv.streamWithState = streamWithState;
    assetDiv.appendChild(document.createTextNode(stream.name));

    if (streamWithState.disableReasons) {
      if (!stream.forceEnabled) assetDiv.classList.add('disable');

      const disabledBtn = document.createElement('div');
      disabledBtn.classList.add('material-icons');
      disabledBtn.appendChild(document.createTextNode('error'));
      disabledBtn.setAttribute('data-toggle', 'tooltip');
      disabledBtn.setAttribute('title', streamWithState.disableReasons.join('/'));
      assetDiv.appendChild(disabledBtn);
    } else if (vip.Storage !== undefined) {
      // offline button
      const offlineBtn = document.createElement('div');
      offlineBtn.classList.add('offlineBtn');
      assetDiv.appendChild(offlineBtn);

      if (streamWithState.offlineDisableReasons) {
        offlineBtn.classList.add('material-icons');
        offlineBtn.appendChild(document.createTextNode('cloud_off'));

        offlineBtn.setAttribute('data-toggle', 'tooltip');
        offlineBtn.setAttribute('title', streamWithState.offlineDisableReasons.join('/'));
        offlineBtn.classList.add('disable');
      } else if (streamWithState.offline !== null) {
        const { offline } = streamWithState;
        if (offline.progress < 1) {
          const progressText = `${toFixedTrunc(100 * offline.progress, 2)}%`;
          offlineBtn.appendChild(document.createTextNode(progressText));
        } else {
          offlineBtn.classList.add('material-icons');
          offlineBtn.setAttribute('data-toggle', 'tooltip');
          offlineBtn.setAttribute('title', 'downloaded');
          offlineBtn.appendChild(document.createTextNode('cloud_done'));

          const removeBtn = document.createElement('div');
          removeBtn.classList.add('removeBtn');
          removeBtn.classList.add('material-icons');
          removeBtn.setAttribute('data-toggle', 'tooltip');
          removeBtn.setAttribute('title', 'action_remove');
          removeBtn.appendChild(document.createTextNode('clear'));
          assetDiv.appendChild(removeBtn);

          removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const { id } = stream;
            await this._offlineManager.remove({ id });
            streamWithState.offline = null;
            while (assetContainer.firstChild) {
                assetContainer.removeChild(assetContainer.firstChild);
            }
            this.refreshStreamDiv(assetContainer, streamWithState);
          });
        }
      } else {
        offlineBtn.classList.add('material-icons');
        offlineBtn.setAttribute('data-toggle', 'tooltip');
        offlineBtn.setAttribute('title', 'action_download');
        offlineBtn.appendChild(document.createTextNode('cloud_download'));
        offlineBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this._offlineManager.store(stream, {
            coverUri: 'https://covers.org/big',
            coverData: new ArrayBuffer(16),
          });
        });
      }
    }
    streamWithState.warnings.forEach(reason => {
      const disabledBtn = document.createElement('div');
      disabledBtn.classList.add('material-icons');
      disabledBtn.appendChild(document.createTextNode('warning'));
      disabledBtn.setAttribute('data-toggle', 'tooltip');
      disabledBtn.setAttribute('title', reason);
      assetDiv.appendChild(disabledBtn);
    });

    // assrt tags
    const tagContainer = document.createElement('div');
    stream.tags.forEach(t => {
      const e = document.createElement('span');
      e.classList.add('badge');
      e.classList.add('badge-info');
      e.appendChild(document.createTextNode(t));
      tagContainer.appendChild(e);
    })
    assetDiv.appendChild(tagContainer);
  }

  async onDeviceReady()
  {
    if (window.cordova && window.cordova.logger) {
      window.cordova.logger.__onDeviceReady();

      document.addEventListener("backbutton", (e) => {
        if (this.player.getSource()) {
          e.stopPropagation();
          this.player.freeze();
        }
      }, false);
    }

    this.receivedEvent('deviceready');

    this.videoWithControls = document.getElementById("player0");

    const assetListDiv = document.getElementById("assetList");
    assetListDiv.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        let targetElement = e.target;
        while (targetElement.streamWithState === undefined) {
          targetElement = targetElement.parentNode;
          if (targetElement === null) return;
        }
        this.doPlay(targetElement.streamWithState);
    });

    this.posterDiv = this.videoWithControls.getElementsByClassName('veygo-poster')[0];
    this.posterDiv.addEventListener('click', function(event) {
      this.player.play();
    }.bind(this));

    this.posterDiv.addEventListener("mousemove", () => this.controlsUi_.show());
    this.videoWithControls.addEventListener("mousemove", () => this.controlsUi_.show());

    this.autoplayUnmuteDiv = this.videoWithControls.getElementsByClassName('veygo-autoplay-unmute')[0];
    this.autoplayUnmuteDiv.addEventListener('click', function(event) {
      this.player.setVolume({muted: false});
      this.autoplayUnmuteDiv.style.display = 'none';
      this.posterDiv.style.display = 'none';
    }.bind(this));


    /* cookie/localStorage for tracking needs user agreement in most countries  (GDPR, ...)
     *
     * - you could just use fingerprinting https://github.com/Valve/fingerprintjs2
     * if you want to avoid using a cookie warning/localStorage
     *
     * - or you can use a deviceId you're already using from your authentification system
     */
    /*
    var deviceId = await localStorage.getItem('veygoSample.deviceId');
    if (deviceId === null) {
      deviceId = generateRandomUuid();
      localStorage.setItem('veygoSample.deviceId', deviceId);
    }
    */

    if (vip.Storage !== undefined) {
      const storage = new vip.Storage('veygo-sample-webplayer-medias');
      const downloadManager = new vip.DownloadManager(storage);
      this._offlineManager = new vip.OfflineManager(downloadManager, storage);
      const offlineList = await this._offlineManager.list();
      offlineList.forEach(record => {
        const {
          stream,
          startFrom,
          basicMetadata,
          appMetadata,
        } = record;
        const { id: streamId } = stream;
        const streamWithState = this.getStreamWithIdentifier(streamId);
        if (streamWithState) {
          streamWithState.offline = {
            record,
          };
        }
      });

      this._offlineManager.addEventListener('progress', (e) => {
        const {
          record: {
            stream,
            startFrom,
            basicMetadata,
            appMetadata,
          },
          progress,
        } = e;
        const { id: streamId } = stream;
        const streamWithState = this.getStreamWithIdentifier(streamId);
        if (streamWithState) {
          streamWithState.offline = {
            appMetadata,
            record: e.record,
            progress,
          };
          const assetContainer = document.getElementById(`assetContainer-${streamWithState.stream.id}`);
          while (assetContainer.firstChild) {
              assetContainer.removeChild(assetContainer.firstChild);
          }
          this.refreshStreamDiv(assetContainer, streamWithState);
        }
      });
    }

    const drmSupportByType = await vip.Player.probeDrmSupport();

    app._streamsWithStates.forEach((streamWithState, index) => {
      const { stream } = streamWithState;

      if (stream.id === undefined) {
    	  stream.id = `autogenid-${index}`;
      }
      
      let hasDrm = false;
      let drmSupport;
      ['fairplay', 'widevine', 'playready', 'verimatrix'].forEach(drm => {
        if (stream[`${drm}.license_server`] !== undefined || stream.scheme === drm) {
          hasDrm = true;
          if (drmSupportByType[drm]) {
            drmSupport = drmSupportByType[drm];
          }
        }
      });

      streamWithState.warnings = [];

      const support = vip.Player.probeSupport(streamWithState.stream);
      if (!support.canStream) {
        streamWithState.disableReasons = [ 'stream_type_not_supported' ];
      } else if (!support.persistentMediaFiles) {
        streamWithState.offlineDisableReasons = ['stream_type_offline_not_supported'];
      }
      if (hasDrm) {
        if (!drmSupport) {
          streamWithState.disableReasons = [ 'drm_not_supported' ];
        } else if (!drmSupport.persistentMediaFiles) {
          streamWithState.offlineDisableReasons = ['offline_not_supported_by_drm'];
        } else if (!drmSupport.persistentLicense) {
          streamWithState.warnings.push('offline_no_persistent_license');
        }
      }

      if (stream.content_type === vip.Stream.CONTENT_VIDEO_LIVE) {
        streamWithState.offlineDisableReasons = ['offline_not_supported_on_live'];
      }

      const li = document.createElement('div');
      li.classList.add('col-md-3');
      li.classList.add('col-sm-4');
      li.classList.add('col-6');
      const assetContainer = document.createElement('div');
      assetContainer.setAttribute('id', `assetContainer-${streamWithState.stream.id}`);
      assetContainer.setAttribute('tabIndex', 0); // focusable
      assetContainer.classList.add('assetContainer');
      assetContainer.streamWithState = streamWithState;
      li.appendChild(assetContainer);

      this.refreshStreamDiv(assetContainer, streamWithState);
      assetListDiv.appendChild(li);
    });

    this.scheme_toggle_selector = document.querySelector("#scheme");
    this.scheme_toggle_selector.addEventListener("change", this.customStreamSchemeChanged.bind(this), true);
    this.customStreamSchemeChanged();

    const customStreamAuthElement = document.getElementById('auth');
    customStreamAuthElement.addEventListener("change", this.customStreamAuthChanged.bind(this), true);
    app._customAuths.forEach(customStreamAuth => {
      var option = document.createElement("option");
      option.text = customStreamAuth.name;
      option.value = customStreamAuth.name;
      customStreamAuthElement.add(option);
    });

    this.customized_form = document.querySelector("#customized_submit");
    this.customized_form.addEventListener("click", this.customStreamSetSource.bind(this), true);

    this.controlsUi_ = new VeygoControls();
    this.controlsUi_.init(this.videoWithControls, this);

    this._vipReporter = new vip.Reporter({
      app_key: vipConfig.CONFIG_VIP_ANALYTICS_API_KEY,
      // device_id: await vip.Utils.getHash(deviceId),
      app: {
        name: `VeygoWebDemoPlayer`,
        major_version: `1.0.0-${window.vip.CONFIG_VIP_BUILD_ID}`,
      },
      // activate_veygo_analytics: true,
    });
    const userId = 'default'
    this._vipReporter.openSession(userId);

    const stopBtnElt = document.querySelector("#stop_btn");
    if (stopBtnElt) {
      stopBtnElt.addEventListener('click', () => {
        this.controlsUi_.hide();
        if (this.player) {
          this.player.freeze();
        }
      });
    }

    const closeBtnElt = document.querySelector("#close_btn");
    if (closeBtnElt) {
      closeBtnElt.addEventListener('click', () => {
        if (this.player) {
          this.player.destroy();
          delete this.player;
        }
        if (this._vipReporter) {
          this._vipReporter.closeSession();
        }
      });
    }

    this.player = this.getPlayer();
  }

  getPlayer() {
    if (this.player) { return this.player; }

    const videoElement = this.videoWithControls.getElementsByTagName('video')[0];

    const playerOptions = {};
    const player = new (vip.PlayerContent || vip.Player)(videoElement, this._vipReporter, playerOptions);

    this.localPlayer = player;

    // this._vipReporter.checkForApplicationUpdate();

    // override the player with a proxied player for chromecast
    var chromecastAppId = this.videoWithControls.getAttribute('chromecastAppId');
    if ((chromecastAppId !== null) && chromecastAppId.length !== 0 && (typeof vipExtCastProxy !== 'undefined')) {
      if (typeof cast === 'object') {
        this.castProxy = new vipExtCastProxy.CastProxy(
            videoElement, this.localPlayer, chromecastAppId);
        this.videoElement = this.castProxy.getVideo();
        var proxiedPlayer = this.castProxy.getPlayer();
        this.player = proxiedPlayer;
      } else {
        console.warn('Please have "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" preloaded for chromecast sender support');
      }
    }
    if (this.player === undefined) {
      this.player = this.localPlayer;
      this.videoElement = videoElement;
    }

    this.controlsUi_.registerPlayer(this.player);

    if (this._offlineManager !== undefined) {
        // Add offline support to player
        this.player.registerPlugin(this._offlineManager.getPlayerPlugin());
    }

    if (typeof vipExtBroadpeak !== 'undefined' && false) {
      const bpkPlugin = new (vipExtBroadpeak.BroadpeakPlugin)({
        // analytics_url: '',
        // domains: [],
        // active_on_bkteardown_urls: true,
        // loglevel: 1,
      });
      this.player.registerPlugin(bpkPlugin);
    }

    if ((typeof vipExtNielsen !== 'undefined') &&
      vipConfig.CONFIG_VIP_NIELSEN_WEB_APPID) {
      const nielsenPlugin = new (vipExtNielsen.NielsenPlugin)({
        appid: vipConfig.CONFIG_VIP_NIELSEN_WEB_APPID,
      });
      this.player.registerPlugin(nielsenPlugin);
    }

    if (this.castProxy) {
      this.castProxy.addEventListener(
        'caststatuschanged',
        this.controlsUi_.onCastStatusChange.bind(this.controlsUi_)
      );
    }

    this.player.addEventListener(
      'status', this.onPlayerStatus.bind(this), false);

    this.player.start();

    if (typeof statLoad !== 'undefined') statLoad(this.videoWithControls.parentNode, this.player);

    return this.player;
  }

  logUser(userId) {
    this._vipReporter.closeSession();
    this._vipReporter.openSession(userId);
  }

  onPlayerStatus (info)
  {
    console.log("vip-player status " + info.status);
    if (info.status === "initialized") {
      this.onPlayerInitialize();
      return;
    }

    if (info.status === "ready") {
      // do a manual auto-play
      this.player.play().catch(function(ex) {
        // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
        this.player.setVolume({muted: true});
        this.player.play();
        this.autoplayUnmuteDiv.style.display = 'block';
      }.bind(this));

      this.controlsUi_.show();
      return;
    }

    if (info.status === "playing") {
      this.posterDiv.style.display = 'none';
      return;
    }

    if (info.status === "ended") {
      return;
    }

    if (info.status === "error") {
      console.log("player error: " + JSON.stringify(info.what));
      return;
    }

    if (info.status === "buffering") {
      return;
    }
  }

  async onPlayerInitialize()
  {
    if (this.playerInitialized) return;


    this.authorizeContext = {};
    const verimatrixId = await this.player.getDrmProperty('verimatrix.id');
    if (verimatrixId) {
      this.authorizeContext.verimatrixId = verimatrixId;
    }

    await this.player.setup({
      // 'abr.initial_bandwidth_estimate': 3000000,
    });

    // you might want to use the window size, for the video only, not the fullscreen values
    // Tizen simulator advertise bad negative value here sometimes
    if (window.screen.width > 100) {
    	this.localPlayer.setMaxResolution(window.screen.width, window.screen.height);
    }
    const searchParams = new URL(document.location.href).searchParams;
    const autoplayOnLoad = searchParams.get("autoplayOnLoad");
    if (autoplayOnLoad) {
      let streamsWithStates = app._streamsWithStates.filter(streamsWithState => (
        (streamsWithState.stream.uri &&
        streamsWithState.stream.uri.indexOf(autoplayOnLoad) !== -1) ||
        (streamsWithState.stream.reference &&
        streamsWithState.stream.reference.indexOf(autoplayOnLoad) !== -1)
      ));
      if (streamsWithStates.length) {
        this.doPlay(streamsWithStates[0]);
      }
    }
    this.playerInitialized = true;
  }

  onPlayerEvent (info)
  {
    console.log("got event " + info.name + ": position=" + info.position
                + ", error=" + info.error + ", bitrate=" + info.bitrate);
  }

  doPlay(streamWithState) {
    this.player = this.getPlayer();
    const { stream } = streamWithState;
    console.log("setting stream ", stream);

    this.player.notifyStartStreamConfiguration(stream);
    var finalStreamPromise;
    if (streamWithState.authorize) {
      finalStreamPromise = streamWithState.authorize(stream, this.authorizeContext);
    } else {
      finalStreamPromise = Promise.resolve(stream);
    }

    finalStreamPromise
      .then((stream) => {
        this.appSetStream(stream, streamWithState.domains);
      });
  }

  appSetStream(stream, domains) {
    if (window.rewriteStream) stream = rewriteStream(stream, domains);
    if (this.castProxy) {
      this.castProxy.setAppData({'stream': stream});
    }
    // this.localPlayer.setDefaultBandwidthEstimate(3000000);
    const options = stream.options ? Object.assign({}, stream.options) : {};
    if (!options.streaming) { options.streaming = {}; }
    if (!options.abr) { options.abr = {}; }
    const searchParams = new URL(document.location.href).searchParams;
    const liveDelay = parseInt(searchParams.get("liveDelay"), 10);
    if (liveDelay) {
      options.streaming.liveDelay = liveDelay;
    }

    // probably setSource from click, we could deactvate it
    if (this.autoplayUnmuteDiv.style.display === 'block') {
      this.player.setVolume({muted: false});
      this.autoplayUnmuteDiv.style.display = 'none';
    }
    if (stream.media) {
      this.player.setMedium(stream.media, stream.fetcher, options);
    } else {
      this.player.setSource(stream, options);
    }
  }

  // Update DOM on a Received Event
  receivedEvent(id)
  {
  }

  addStreamSamples(infos) {
    const provider = infos.provider || 'generic';
    infos.streams.forEach((stream) => {
      if (stream.name === undefined) {
    	console.log('no name on stream', stream);
      }
      const m = stream.name.match(/(.*) \[(.*)\]/);
      // override stream id to avoid collision
      const streamId = stream.id ? `${provider}:${stream.id}` : stream.uri; // we could hash uri...
      const name = m ? m[1] : stream.name;
      const tags = m ? m[2].split(',').map(n => n.trim()) : stream.tags || [];
      app._streamsWithStates.push({
        provider,
        // edge still do not support ... notagtion
        stream: Object.assign(
          {},
          stream,
          {
            id: streamId,
            name,
            tags,
          }
        ),
        domains: infos.domains,
        authorize: infos.authorize || infos.streamPatch,
        offline: null,
      });
    });
    Object.entries(infos.customAuths || {}).forEach(([k, v]) => {
      app._customAuths.push({
        provider,
        name: `${provider}:${k}`,
        fields: v.fields,
        defaults: v.defaults,
        authorize: v.authorize,
        domains: infos.domains,
      })
    });

  }

  getStreamWithIdentifier(id) {
    return app._streamsWithStates.find(
      streamWithState => (streamWithState.stream.id === id)
    );
  }

  customStreamSchemeChanged()
  {
    Array.from(document.getElementsByClassName('schemes')[0].children).forEach(e => (e.style.display = 'none'))
    document.getElementsByClassName('schemes')
    const selectedScheme = document.getElementById('scheme').value;
    const selectedSchemeDiv = document.getElementById(selectedScheme);
    if (selectedSchemeDiv) {
      selectedSchemeDiv.style.display='block';
    }
  }

  customStreamAuthChanged(e) {
    const selectedCustomAuthName = document.getElementById('auth').value;
    const selectedCustomAuth = this._customAuths.find(ca => (ca.name === selectedCustomAuthName));

    const authParamsElement = document.getElementById('authParams');
    while (authParamsElement.firstChild) {
      authParamsElement.removeChild(authParamsElement.lastChild);
    }

    if (selectedCustomAuth === undefined) { return; }

    selectedCustomAuth.fields.forEach((field, i) => {
      const newField = document.createElement('div');
      newField.classList = ['customAuthField']
      newField.appendChild(document.createTextNode(`${field.id}:`));
      const input = document.createElement('input');
      input.classList = ['customAuthInputText'];
      input.id = field.id;
      input.type = 'text';
      input.name = field.id;
      newField.appendChild(input);

      // <input type="text" name="${field.id}">`;
      authParamsElement.appendChild(newField);
    });
    if (document.getElementById('uri').value.length === 0) {
      Object.entries(selectedCustomAuth.defaults).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (el) {
          el.value = v;
          if (k === 'scheme') {
            this.customStreamSchemeChanged();
          }
        }
      });
    }
  }

  async customStreamSetSource()
  {
    const customized_uri = document.getElementById('uri').value;
    const customized_scheme = document.getElementById('scheme').value;
    const customized_type = document.getElementById('type').value;
    const baseStream = {
      name: 'Customized Stream',
      type: customized_type,
      uri: customized_uri,
    };
    ['widevine.license_server', 'playready.license_server',
     'fairplay.license_server', 'fairplay.certificate_uri',
     'verimatrix.company', 'verimatrix.server'].map(paramName => {
       const { value } = document.getElementById(paramName);
       if (value.length) {
         baseStream[paramName] = value;
       }
     });

    const selectedCustomAuthName = document.getElementById('auth').value;
    const selectedCustomAuth = this._customAuths.find(ca => (ca.name === selectedCustomAuthName)) || {};

    const stream = selectedCustomAuth.authorize
      ? await selectedCustomAuth.authorize(baseStream, selectedCustomAuth.fields.reduce((acc, field) => {
        acc[field.id] = document.getElementById(field.id).value;
        return acc;
      }, {}))
      : baseStream;
    console.log('setting stream ', stream.uri);
    this.doPlay({ stream, domains: selectedCustomAuth.domains});
  }
}

let focus;
// samsung tizen tv simulator, remote basic device, cannot intercept power, source, menu, jewel/home, exit
// samsung tv device, can only grab ArrowLeft, ArrowUp, ArrowRight, ArrowDown, Enter, Back by default,
// register other with https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvinputdevice-api.html
// also see tizen.tvinputdevice.getSupportedKeys() https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html

const keyDataByKeycode = {
	13: {
		'id': 'enter',
		keyDown: (event) => {
			if (!document.activeElement) { return; }
			document.activeElement.click();
		}
	},
	37: {
		'id': 'left',
		keyDown: (event) => {
			if ((focus === undefined) || (focus === 0)) {
				focus = app._streamsWithStates.length - 1;
			} else {
				focus = focus - 1;
			}
			const streamWithState = app._streamsWithStates[focus];
			const assetContainer = document.getElementById(`assetContainer-${streamWithState.stream.id}`);
			assetContainer.focus();
		}
	},
	38: {
		'id': 'up'
	},
	39: {
		id: 'right',
		keyDown: (event) => {
			if (focus === undefined) {
				focus = 0;
			} else if (focus === app._streamsWithStates.length - 1) {
				focus = 0;
			} else {
				focus = focus + 1;
			}
			const streamWithState = app._streamsWithStates[focus];
			const assetContainer = document.getElementById(`assetContainer-${streamWithState.stream.id}`);
			assetContainer.focus();
		}
	},
	40: {
		'id': 'down'
	},
	48: {
		'id': '0'
	},
	49: {
		'id': '1'
	},
	189: {
		'id': '-'
	},
	10190: {
		'id': 'preChan'
	},
	403: {
		'id': 'aRed'
	},
	404: {
		'id': 'bGreen'
	},
	405: {
		'id': 'cYellow'
	},
	406: {
		'id': 'dBlue'
	},
	412: {
		'id': 'backward'
	},
	417: {
		'id': 'forward'
	},
	19: {
		'id': 'pause'
	},
	416: {
		'id': 'rec'
	},
	415: {
		'id': 'play'
	},
	413: {
		'id': 'stop'
	},
	427: {
		'id': 'p-'
	},
	428: {
		'id': 'p+'
	},
	447: {
		'id': 'vol-'
	},
	448: {
		'id': 'vol+'
	},
	449: {
		'id': 'mute'
	},
	457: {
		'id': 'info'
	},
	10009: {
		'id': 'back'
	},
	10073: {
		'id': 'channelList'
	},
	10225: {
		'id': 'search'
	},
	10135: {
		'id': 'tools'
	},
}
document.addEventListener('keydown', (keyDownEvent) => {
	const keyData = keyDataByKeycode[keyDownEvent.keyCode];
	// console.log(keyDownEvent, keyData);
	if (keyData && keyData.keyDown) {
		keyData.keyDown(keyDownEvent);
	}
});


window.app = new Application();
window.app.initialize();
