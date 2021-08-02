(function() {

const domains = {
};

app.addStreamSamples({
  provider: 'alphanetworks:boxbrazil',
  domains: domains,
  streams: [
    {
      name: 'BOX travel [TS, live, boxbrazil]',
      uri: 'https://live7.boxbrazil.tv.br/primary/travelbox.sdp/playlist.m3u8',
    },
    {
      name: 'globo.com aCBNSP [HLS, StreamManifest, radio, boxbrazil]',
      uri: 'https://medias.sgr.globo.com/hls/aCBNSP/aCBNSP.m3u8',
      type: 'hls',
    },
    {
      name: 'camara.gov.br TV1 [HLS, StreamManifest, radio, boxbrazil]',
      uri: 'https://stream3.camara.gov.br/tv1/manifest.m3u8',
      type: 'hls',
    },
  ],
});
})();
