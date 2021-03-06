(function() {

// const openApiHost = 'thema-develop.beemix-web.green.labs.rd.alphanetworks.tv';

// UAT
/*  const openApiHost = 'proxies.thema-uat.eu-west-1.alphanetworks.tv';
const realms = {
  'edmolyeuwitceriryabOsEecsyandak3': {
    format: 'HLS_FP',
    drms: ['fairplay'],
  },
//  'TeredVeipimKonotBugNevOmgapyoid0': {
  'OjMyer8TwewmokMijlonVoockipyuaj0': {
    format: 'DASH_WV',
    drms: ['widevine'],
  }
};

const email = 'veygo@alpha.com';
const password = 'Alpha.001';
const deviceId = '123456';
*/

// prod
const openApiHost = 'proxies.thema-production.eu-west-2.tuc.red';
const realms = {
  '8wlSpEMeGabOned945EtupRO3Hlt0vlS': {
    format: 'DASH_WV',
    drms: ['widevine'],
  },
  'qlprica6rufRlphagEThastespi79swl': {
    format: 'HLS_FP',
    drms: ['fairplay'],
  }
}

const email = 'tester@alpha.com';
const password = 'Alpha.001';
const deviceId = '1744df27-0df0-4000-8c1a-c605a458ce00';


const openApiUrl = `https://${openApiHost}/`;

// const icHost = 'dub-tctr-live.test.ott.irdeto.com';
const icHost = 'thema.stage.ott.irdeto.com';
const icAccountId = 'thema';
const icApplicationId = 'live';

const fairplayCertificateUrl = `https://${icHost}/licenseServer/streaming/v1/${icAccountId}/getcertificate?applicationId=${icApplicationId}`;
// could have query parameters contentId & keyId, packager skd format skd://{uuid}
// const fairplayLicenseUrl = `https://${icHost}/licenseServer/streaming/v1/${icAccountId}/getckc`;
// const fairplayLicenseUrl = 'https://vir-lctr.live.ott.irdeto.com/licenseServer/streaming/v1/cmbrazil/getckc?contentId=container-production-1797';
const fairplayLicenseUrl = 'https://vir-lctr.live.ott.irdeto.com/licenseServer/streaming/v1/cmbrazil/getckc';
// could have query parameters contentId
const playreadyLicenseUrl = `https://${icHost}/licenseServer/playready/v1/${icAccountId}/license`;
const widevineLicenseUrl = `https://${icHost}/licenseServer/widevine/v1/${icAccountId}/license`;

// await vip.Player.probeDrmSupport() ?
// sample app addStreamSamples do not work async for now...
const ua = navigator.userAgent.toLowerCase();
let drmId = 'widevine';
if (ua.indexOf('safari') !== -1) {
  // crios: chrome for iOS
  if ((ua.indexOf('chrome') > -1) ||??(ua.indexOf('crios') > -1)) {
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

const domains = {
/*  [ openApiHost ]: {
     origins: [ '' ]
  },*/
/*  [ 'thema.live.ott.irdeto.com' ]: {
    // origins: [ '' ]
  },*/
   'hlsplusdafrique-i.akamaihd.net': {
    zone: 'france',
  }
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

async function getAsset(stream, realmState) {
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
  return Promise.resolve(realmState)
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
      if (licenseRequest.result.licParam) {
        licenseRequest.result.licParam = (typeof licenseRequest.result.licParam === 'object')
          ? licenseRequest.result.licParam
          : parseQuery(licenseRequest.result.licParam);
      }
      // returnedStream['fairplay.license_server'] = licenseRequest.result.url;
      if (stream.type === 'hls') {
        returnedStream['fairplay.auth_method'] = 'irdeto';
        returnedStream['fairplay.certificate_uri'] = fairplayCertificateUrl; // licenseRequest.result.licParam.serverCertificateURL;
        returnedStream['fairplay.license_server'] = licenseRequest.result.url;
        returnedStream['fairplay.license_request_headers'] = {
          'Authorization': `Bearer ${licenseRequest.result.licParam.sessionToken}`,
        };
      } else if (stream.type === 'dash') {
        returnedStream['widevine.license_server'] = licenseRequest.result.url;
        // returnedStream['widevine.license_server'] = widevineLicenseUrl;
        returnedStream['widevine.license_request_headers'] = {
          'Authorization': `Bearer ${licenseRequest.result.licParam.sessionToken}`,
        };
        returnedStream['playready.license_server'] = playreadyLicenseUrl;
        returnedStream['playready.license_request_headers'] = {
          'Authorization': `Bearer ${licenseRequest.result.licParam.sessionToken}`,
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
  if (realmState.customerAuthToken !== null)??{
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
  const { deviceAuthToken, newAuthToken } = responseJson.result;
  realmState.customerAuthToken = newAuthToken;
  realmState.deviceAuthToken = deviceAuthToken;
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
      idAsset: 64011,
    },
    {
      idChannel: 1,
      name: 'Nollywood',
    },
    {
      idChannel: 4,
      name: 'Trace Gospel',
    },
  ].map(s => (Object.assign({
    name: s.name ||??(s.idAsset ? `idAsset:${s.idAsset}` : `idChannel:${s.idChannel}`),
    idAsset: s.idAsset,
    idChannel: s.idChannel,
    type: realms[realmId].format.indexOf('DASH') === 0 ? 'dash': 'hls',
    tags: (s.tags ||??[])
      .concat([realms[realmId].format, s.idChannel ? 'live' : 'VOD'])
      .concat(['thema', 'irdeto', 'an-cms-thema']),
    forceEnabled,
    realmId,
  }, realms[realmId].drms.reduce((acc, drm) => {
    acc[`${drm}.license_server`] = '';
    return acc;
  }, {})))),
  authorize: async (stream, authorizeContext) => {
    const realmState = realmStates[realmId];
    await getAuthToken(realmState, authorizeContext);
    return getAsset(stream, realmState);
  },
});
})();
