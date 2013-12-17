/*global PerformanceTestingHelper, CAMERA_MODE_TYPE*/

define(function(require) {
  'use strict';

  var HudView = require('views/hud');
  var ViewfinderView = require('views/viewfinder');
  var ControlsView = require('views/controls');
  var filmstrip = require('views/filmstrip');
  var FocusRing = require('views/focusring');
  var soundEffect = require('soundeffect');
  var lockscreen = require('lockscreen');
  var broadcast = require('broadcast');
  var find = require('utils/find');
  var camera = require('camera');
  var dcf = require('dcf');

  var controllers = {
    hud: require('controllers/hud'),
    controls: require('controllers/controls'),
    viewfinder: require('controllers/viewfinder')
  };

  return function() {
    var body = document.body;

    // View Instances
    var hud = new HudView();
    var controls = new ControlsView(find('.js-controls'));
    var viewfinder = new ViewfinderView(find('.js-viewfinder'));
    var focusRing = new FocusRing();

    // Wire Up Views
    controllers.hud(hud, viewfinder, controls);
    controllers.controls(controls, viewfinder);
    controllers.viewfinder(viewfinder, filmstrip);

    // Inject stuff into Dom
    hud.appendTo(body);
    focusRing.appendTo(body);

    /**
     * Misc Crap
     */

    var focusTimeout;
    camera.state.on('change:focusState', function(value) {
      focusRing.setState(value);
      clearTimeout(focusTimeout);

      if (value === 'fail') {
        focusTimeout = setTimeout(function() {
          focusRing.setState(null);
        }, 1000);
      }
    });

    // This needs to be global so that
    // the filmstrip module can see it.
    window.ViewfinderView = viewfinder;

    PerformanceTestingHelper.dispatch('initialising-camera-preview');

    // Set the initial capture
    // mode (defaults to 'camera').
    camera.setCaptureMode(camera._captureMode || CAMERA_MODE_TYPE.CAMERA);

    // Prevent the phone
    // from going to sleep.
    lockscreen.disableTimeout();

    // Load the stream
    setupCamera();

    // This must be tidied, but the
    // important thing is it's out
    // of camera.js
    window.LazyL10n.get(function() {
      camera.checkStorageSpace();

      camera.overlayCloseButton
        .addEventListener('click', camera.cancelPick.bind(camera));
      camera.storageSettingButton
        .addEventListener('click', camera.storageSettingPressed.bind(camera));

      // TODO: Reimplement this in controls controller
      if (!navigator.mozCameras) {
        camera.state.set('captureButtonEnabled', false);
        return;
      }

      // TODO: Reimplement this in controls controller
      if (camera._secureMode) {
        camera.state.set('galleryButtonEnabled', false);
      }

      soundEffect.init();

      if ('mozSettings' in navigator) {
        camera.getPreferredSizes();
      }

      camera._storageState = STORAGE_STATE_TYPE.INIT;
      camera._pictureStorage = navigator.getDeviceStorage('pictures');
      camera._videoStorage = navigator.getDeviceStorage('videos'),

      camera._pictureStorage
        .addEventListener('change', camera.deviceStorageChangeHandler.bind(camera));

      camera.state.set('initialized', true);

      dcf.init();
      PerformanceTestingHelper.dispatch('startup-path-done');
    });

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    /**
     * Manages switching to
     * and from the Camera app.
     */
    function onVisibilityChange() {
      if (document.hidden) {
        teardownCamera();
      } else {
        setupCamera();
      }
    }

    function onBeforeUnload() {
      window.clearTimeout(camera._timeoutId);
      delete camera._timeoutId;
      viewfinder.setPreviewStream(null);
    }

    function setupCamera() {
      camera.loadStreamInto(viewfinder.el, onStreamLoaded);

      function onStreamLoaded(stream) {
        PerformanceTestingHelper.dispatch('camera-preview-loaded');
        if (!camera._pendingPick) {
          setTimeout(camera.initPositionUpdate.bind(camera), PROMPT_DELAY);
        }
      }
    }

    function teardownCamera() {
      camera.cancelPositionUpdate();
      camera.cancelPick();

      try {
        var recording = camera.state.get('recording');
        if (recording) {
          camera.stopRecording();
        }

        viewfinder.stopPreview();
        camera.state.set('previewActive', false);
        viewfinder.setPreviewStream(null);
      } catch (ex) {
        console.error('error while stopping preview', ex.message);
      } finally {
        camera.release();
      }

      // If the lockscreen is locked
      // then forget everything when closing camera
      if (camera._secureMode) {
        filmstrip.clear();
      }
    }

    // The screen wakelock should be on
    // at all times except when the
    // filmstrip preview is shown.
    broadcast.on('filmstripItemPreview', function() {
      lockscreen.enableTimeout();
    });

    // When the filmstrip preview is hidden
    // we can enable the  again.
    broadcast.on('filmstripPreviewHide', function() {
      lockscreen.disableTimeout();
    });
  };
});
