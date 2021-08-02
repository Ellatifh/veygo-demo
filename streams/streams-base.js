(function() {
  app.addStreamSamples({
    streams: [
      {
        name: 'Sintel [DASH, mp4a, wvtt|ml]',
        uri: 'https://storage.googleapis.com/shaka-demo-assets/sintel-mp4-wvtt/dash.mpd',
        type: 'dash'
      },
      {
        name: 'Sintel [HLS, mp4a, vtt|ml|badsync]',
        uri: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        type: 'hls'
      },
      {
        name: 'Big Buck Bunny Thumbnails [DASH, thumb]',
        uri: 'http://dash.edgesuite.net/akamai/bbb_30fps/bbb_with_multiple_tiled_thumbnails.mpd',
        type: 'dash'
      },
      {
        name: 'BBC adaptive bitrate test [DASH]',
        uri: 'http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-events.mpd',
        type: 'dash'
      },
      {
        name: 'Angel One [DASH_WV, mp4a|ml]',
        uri: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
        scheme: 'widevine',
        'widevine.license_server': 'https://cwip-shaka-proxy.appspot.com/no_auth',
        type: 'dash'
      },
      {
        name: 'Livesim SegmentTemplate [DASH, live, mp4a]',
        uri: 'https://livesim.dashif.org/livesim/testpic_2s/Manifest.mpd',
        type: 'dash',
        content_type: 'video_live',
      },
      {
        name: 'Livesim SegmentTemplate with 30s updates [DASH, live, mp4a]',
        uri: 'https://livesim.dashif.org/livesim/mup_30/testpic_2s/Manifest.mpd',
        type: 'dash',
        content_type: 'video_live',
      },
      {
        name: 'Livesim SegmentTimeline [DASH, live, mp4a]',
        uri: 'https://livesim.dashif.org/livesim/segtimeline_1/testpic_2s/Manifest.mpd',
        type: 'dash',
        content_type: 'video_live',
      },
    ],
  });
})();
