/*global requirejs*/

'use strict';

requirejs.config({ baseUrl: 'js' });

require([
  'activity',
  'controllers/app',
  'js/config.js',
  '/shared/js/async_storage.js',
  '/shared/js/blobview.js',
  '/shared/js/performance_testing_helper.js',
  '/shared/js/media/jpeg_metadata_parser.js',
  '/shared/js/media/get_video_rotation.js',
  '/shared/js/media/video_player.js',
  '/shared/js/media/media_frame.js',
  '/shared/js/gesture_detector.js',
  '/shared/js/lazy_l10n.js',
  'panzoom',
  'confirm',
  'constants'
], function(activity, boot) {

  // The activity module
  // will boot the app
  // after it has made
  // some changes.
  activity.check(boot);
});
