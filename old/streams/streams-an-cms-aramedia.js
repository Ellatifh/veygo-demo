(function() {

// https://myaramedia.tv/

// https://beemix-web-aramedia-preprod.labs-2.tucano.red
// tester@alpha.com / Alpha.001

const openApiHost = 'proxies.aramedia-production.eu-west-2.tuc.red';
const openApiUrl = `https://${openApiHost}/`;
const realms = {
  '': {
    format: 'HLS_FP',
    drms: ['fairplay'],
  },
  'd9wix4wrIbradIWogu4tEw3phiCOf2e7': {
    format: 'DASH_WV',
    drms: ['widevine'],
  }
};

// const icHost = 'dub-tctr-live.test.ott.irdeto.com';
const icHost = 'vir-lctr.live.ott.irdeto.com';
const icAccountId = 'alpha';
const icApplicationId = '?';

const fairplayCertificateUrl = `https://${icHost}/licenseServer/streaming/v1/${icAccountId}/getcertificate?applicationId=${icApplicationId}`;
// could have query parameters contentId & keyId, packager skd format skd://{uuid}
// const fairplayLicenseUrl = `https://${icHost}/licenseServer/streaming/v1/${icAccountId}/getckc`;
// const fairplayLicenseUrl = 'https://vir-lctr.live.ott.irdeto.com/licenseServer/streaming/v1/cmbrazil/getckc?contentId=container-production-1797';
const fairplayLicenseUrl = `https://vir-lctr.live.ott.irdeto.com/licenseServer/streaming/v1/${icAccountId}/getckc`;
// could have query parameters contentId
const playreadyLicenseUrl = `https://${icHost}/licenseServer/playready/v1/${icAccountId}/license`;

// 7a e1 6e 3b e5 ab 8d 4d  86 da 3a 4b e4 17 ba ac
// getVodLicense const widevineLicenseUrl = `https://${icHost}/licenseServer/widevine/v1/${icAccountId}/license?contentId=3b6ee17a-abe5-4d8d-86da-3a4be417baac`;
// each revert const widevineLicenseUrl = `https://${icHost}/licenseServer/widevine/v1/${icAccountId}/license?contentId=3b6ee17a-abe5-4d8d-da86-acba17e44b3a`;
// const widevineLicenseUrl = `https://${icHost}/licenseServer/widevine/v1/${icAccountId}/license?contentId=7ae16e3b-e5ab-8d4d-86da-3a4be417baac`;
const widevineLicenseUrl = `https://${icHost}/licenseServer/widevine/v1/${icAccountId}/license?contentId=3b6ee17a-abe5-4d8d-da86-3a4be417baac`;

// await vip.Player.probeDrmSupport() ?
// sample app addStreamSamples do not work async for now...
const ua = navigator.userAgent.toLowerCase();
let drmId = 'widevine';
if (ua.indexOf('safari') !== -1) {
  // crios: chrome for iOS
  if ((ua.indexOf('chrome') > -1) || (ua.indexOf('crios') > -1)) {
    drmId = 'widevine';
  } else if (/ipad|iphone|ipod/.test(ua)) {
    drmId = 'fairplay';
  } else {
    drmId = 'fairplay';
  }
}
// drmId = 'widevine';
// drmId = 'fairplay';
const realmId = Object.keys(realms).find(realmId => (realms[realmId].drms.includes(drmId)));
const forceEnabled = false;

const email = 'tester@alpha.com';
const password = 'Alpha.001';
const deviceId = '123456';

const domains = {
  [ openApiHost ]: {
    // origins: [ '' ]
  },
};

// this token need to be refreshed (loginDevice with offline tplayDevAuthToken, or channelStream)
const realmStates = Object.keys(realms).reduce((acc, id) => {
  acc[id] = {
    id,
    config: realms[id],
    customerAuthToken: null,
    deviceAuthToken: null,
    profileToken: null,
  };
  return acc;
}, {});

function parseQuery(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

async function getAsset(stream) {
  const { idAsset, idChannel, realmId } = stream;
  const languageId = 'spa';
  const idAudioLang = 'spa'; // 'mul'
  const idSubtitleLang = 'non'; // 'mul'
  const steps = {
    'init': {
      next: (stream, stepResults) => stream.idChannel ? 'proxy/channelStream' : 'proxy/testAsset',
    },
    'proxy/testAsset': {
      query: stream => ({ languageId, idAsset }),
      next: (stream, stepResults) => stepResults.testAsset.result.alreadyBuy ? 'proxy/readAsset' : 'proxy/buyAsset',
    },
    'proxy/buyAsset': {
      query: stream => ({ idAsset, price: '0.00', packageId: '', purchasePin: '' }),
      next: 'proxy/readAsset',
    },
    'proxy/readAsset': {
      query: stream => ({ idAsset, idAudioLang, idSubtitleLang }),
      next: 'proxy/getVodLicense',
    },
    'proxy/getVodLicense': {
      query: stream => ({ idAsset, idAudioLang, idSubtitleLang, asUrl: true }),
    },
    'proxy/channelStream': {
      query: stream => ({ languageId, idChannel }),
      next: (stream, stepResults) => stepResults.channelStream.result.url.indexOf('.mpd') !== -1 ? 'proxy/askLicenseWV' : 'proxy/askLicenseFP',
    },
    'proxy/askLicenseWV': {
      query: stream => ({ idChannel, asUrl: true }),
    },
    'proxy/askLicenseFP': {
      query: stream => ({ idChannel, asUrl: true }),
    },
  };
  const realmState = realmStates[realmId];

  return getAuthToken(realmState)
  .then((realmState) => {
    function nextStep(state, stepResults) {
      const stateDesc = steps[state];
      if (stateDesc.query) {
        const dataJson = stateDesc.query(stream);
        return postApi(realmState, state, dataJson)
          .then((responseJson) => {
            //if (responseJson.error.code !== -1604) // asset already available (bought)
            if (responseJson.error)
              throw new Error(`customerAuthToken needs update ? ${JSON.stringify(responseJson)}`);
            const shortState = state.replace(/.*\//, '');
            stepResults[shortState] = responseJson;
            const nextState = stateDesc.next;
            if (nextState === undefined) return stepResults;
            return nextStep((typeof nextState === 'function') ?
                nextState(stream, stepResults) :
                nextState,
              stepResults);
          });
      }
      const nextState = stateDesc.next;
      if (nextState === undefined) return stepResults;
      return nextStep((typeof nextState === 'function') ?
          nextState(stream, stepResults) :
          nextState,
        stepResults);
    }
      return nextStep('init', {});
  }).then(stepResults => {
    const uri = (stepResults.readAsset || stepResults.channelStream).result.url;
    const returnedStream = {
      name: stream.name,
      uri,
      type: stream.type,
      content_type: stream.idAsset ? 'vod' : 'video_live',
    };
    const licenseRequest = stepResults.getVodLicense ||
      stepResults.askLicenseWV ||
      stepResults.askLicenseFP;
    if (licenseRequest.result.url) {
      // returnedStream['fairplay.license_server'] = licenseRequest.result.url;
      if (stream.type === 'hls') {
        returnedStream['fairplay.auth_method'] = 'irdeto';
        returnedStream['fairplay.certificate_uri'] = fairplayCertificateUrl; // licenseRequest.result.licParam.serverCertificateURL;
        returnedStream['fairplay.license_server'] = licenseRequest.result.url;
        returnedStream['fairplay.license_request_headers'] = {
          'Authorization': `Bearer ${licenseRequest.result.licParam.sessionToken}`,
        };
      } else if (stream.type === 'dash') {
        // licenseRequest.result.newAuthToken: tucano token
        returnedStream['widevine.license_server'] = widevineLicenseUrl;
        const licParams = new URLSearchParams(licenseRequest.result.licParam);
        const sessionToken = licParams.get('sessionToken');
        returnedStream['widevine.license_request_headers'] = {
          'Authorization': `Bearer ${sessionToken}`,
        };
        returnedStream['playready.license_server'] = playreadyLicenseUrl;
        returnedStream['playready.license_request_headers'] = {
          'Authorization': `Bearer ${sessionToken}`,
        };
      } else {
        console.error('stream type unsupported')
      }
    }
    return returnedStream;
  });
}


async function getApi(realmState, resource) {
  let channelStreamUri = `${openApiUrl}${resource}`;
  if (window.rewriteProxy && domains[openApiHost]) {
    channelStreamUri = rewriteProxy(new URL(channelStreamUri), domains[openApiHost]);
  }
  const response = await fetch(channelStreamUri, {
    method: 'GET',
    headers: {
      'X-AN-WebService-IdentityKey': realmState.id,
      'X-AN-WebService-CustomerAuthToken': realmState.customerAuthToken,
    },
  });
  return response.json();
}

async function postApi(realmState, resource, data) {
  let channelStreamUri = `${openApiUrl}${resource}`;
  if (window.rewriteProxy && domains[openApiHost]) {
    channelStreamUri = rewriteProxy(new URL(channelStreamUri), domains[openApiHost]);
  }
  const response = await fetch(channelStreamUri, {
    method: 'POST',
    headers: {
      'X-AN-WebService-IdentityKey': realmState.id,
      'X-AN-WebService-CustomerAuthToken': realmState.customerAuthToken,
      'Content-type': 'application/x-www-form-urlencoded',
    },
    body: Object.entries(data).map(([k, v]) => `${k}=${v}`).join('&'),
  });
  return response.json();
}

async function getAuthToken(realmState) {
  if (realmState.customerAuthToken !== null) {
    return Promise.resolve(realmState);
  }
  let channelStreamUri = `${openApiUrl}proxy/login`;
  if (window.rewriteProxy && domains[openApiHost]) {
    channelStreamUri = rewriteProxy(new URL(channelStreamUri), domains[openApiHost]);
  }
  const response = await fetch(channelStreamUri, {
    method: 'POST',
    headers: {
      'X-AN-WebService-IdentityKey': realmState.id,
      'Content-type': 'application/x-www-form-urlencoded',
    },
    body: `email=${email}&password=${password}&deviceId=${deviceId}`,
  });
  const responseJson = await response.json();
  if (responseJson.error) throw new Error(`login failed ? ${JSON.stringify(responseJson)}`);
  const { deviceAuthToken: fnDeviceAuthToken, newAuthToken } = responseJson.result;
  realmState.customerAuthToken = newAuthToken;
  realmState.deviceAuthToken = fnDeviceAuthToken;
  const profilesResponse = await getApi(realmState, 'crm/profile');
  const { profiles } = profilesResponse.result;
  const profileTokenResponse = await postApi(
    realmState,
    'crm/profile/active',
    { idProfile: profiles[0].id },
  );
  realmState.profileToken = profileTokenResponse.result.profileToken;
  return realmState;
}

app.addStreamSamples({
  domains: domains,
  streams: [
    {
      idChannel: 55,
      irdeto: true,
    },
  ].map(s => (Object.assign({
    name: s.name || (s.idAsset ? `idAsset:${s.idAsset}` : `idChannel:${s.idChannel}`),
    idAsset: s.idAsset,
    idChannel: s.idChannel,
    type: realms[realmId].format.indexOf('DASH') === 0 ? 'dash': 'hls',
    tags: (s.tags || [])
      .concat([realms[realmId].format, s.idChannel ? 'live' : 'VOD'])
      .concat(['aramedia', 'irdeto', 'an-cms-aramedia']),
    forceEnabled,
    realmId,
  }, realms[realmId].drms.reduce((acc, drm) => {
    acc[`${drm}.license_server`] = '';
    return acc;
  }, {})))),
  authorize: getAsset,
});
})();
