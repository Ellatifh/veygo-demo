
function rewriteStream(stream, domains) {
  if (!domains) return stream;

  [
    'uri',
    'widevine.license_server',
    'fairplay.license_server',
    'fairplay.certificate_uri',
    'playready.license_server',
  ].forEach((tag) => {
    if (stream[tag]) {
      let thisUrl = new URL(stream[tag]);
      let domain = domains[thisUrl.hostname]
      if (domain) {
        stream = Object.assign({}, stream, {
          [tag]: rewriteProxy(thisUrl, domain),
        });
      }
    }
  });

  console.log('rewrite', stream)
  return stream;
}

function rewriteProxy(url, domain) {
  var zone = (domain.proxy && domain.proxy.zone) || 'any';
  var proto = url.protocol.slice(0, url.protocol.length - 1);
  var host = url.host;
  var originProto;
  var originHost;
  if (domain.origins) {
    var proxyUrl = new URL(domain.origins[0]);
    originProto = proxyUrl.protocol.slice(0, url.protocol.length - 1);
    originHost = proxyUrl.host;
  } else {
    originProto = 'https';
    originHost =  'any';
  }

  return `/proxy/${zone}/${originProto}/${originHost}/${proto}/${host}${url.pathname}${url.search}`;
  // return `http://localhost:3000/proxy/${zone}/${originProto}/${originHost}/${proto}/${host}${url.pathname}${url.search}`;
}
