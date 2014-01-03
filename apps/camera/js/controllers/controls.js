define(function(require, exports, module) {
/*jshint laxbreak:true*/

'use strict';

/**
 * Locals
 */

var proto = ControlsController.prototype;

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new ControlsController(app);
};

function ControlsController(app) {
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.activity = app.activity;
  this.camera = app.camera;
  this.app = app;

  // Bind context
  this.onCameraModeChange = this.onCameraModeChange.bind(this);
  this.onVideoTimeUpdate = this.onVideoTimeUpdate.bind(this);
  this.onSwitchButtonClick = this.onSwitchButtonClick.bind(this);
  this.onCaptureButtonClick = this.onCaptureButtonClick.bind(this);
  this.onCancelButtonClick = this.onCancelButtonClick.bind(this);
  this.onGalleryButtonClick = this.onGalleryButtonClick.bind(this);

  this.bindEvents();
  this.setup();
}

proto.bindEvents = function() {
  var controls = this.controls;
  var camera = this.camera;

  // Bind events
  camera.on('captureModeChange', this.onCameraModeChange);
  camera.on('videoTimeUpdate', this.onVideoTimeUpdate);
  camera.on('preparingToTakePicture', controls.disableButtons);
  camera.on('previewResumed', controls.enableButtons);
  camera.on('focusFailed', controls.enableButtons);

  // Respond to events that
  // happen in the controls UI.
  controls.on('click:switch', this.onSwitchButtonClick);
  controls.on('click:capture', this.onCaptureButtonClick);
  controls.on('click:cancel', this.onCancelButtonClick);
  controls.on('click:gallery', this.onGalleryButtonClick);

  camera.state.on('change:recording', function(e) {
    controls.set('recording', e.value);
  });
};

proto.setup = function() {
  var activity = this.activity;
  var controls = this.controls;
  var mode = this.camera.getMode();
  var isCancellable = activity.active;
  var showCamera = !activity.active || activity.allowedTypes.image;
  var showVideo = !activity.active || activity.allowedTypes.video;
  var isSwitchable = showVideo && showCamera;

  // The gallery button should not
  // be shown if an activity is pending
  // or the application is in 'secure mode'.
  var showGallery = !activity.active
    && !this.app.inSecureMode;

  controls.set('mode', mode);
  controls.set('gallery', showGallery);
  controls.set('cancel', isCancellable);
  controls.set('switchable', isSwitchable);
};

proto.onCameraModeChange = function(mode) {
  this.controls.set('mode', mode);
};

proto.onVideoTimeUpdate = function(value) {
  this.controls.setVideoTimer(value);
};

/**
 * Fades the viewfinder out,
 * changes the camera capture
 * mode. Then fades the viewfinder
 * back in.
 *
 * @api private
 */
proto.onSwitchButtonClick = function() {
  var controls = this.controls;
  var viewfinder = this.viewfinder;
  var camera = this.camera;

  camera.toggleMode();
  controls.disableButtons();
  viewfinder.fadeOut(onFadeOut);

  function onFadeOut() {
    camera.loadStreamInto(viewfinder.el, onStreamLoaded);
  }

  function onStreamLoaded() {
    controls.enableButtons();
    viewfinder.fadeIn();
  }
};

/**
 * Cancel the current activity
 * when the cancel button is
 * pressed.
 *
 * This means the device will
 * navigate back to the app
 * that initiated the activity.
 *
 * @api private
 */
proto.onCancelButtonClick = function() {
  this.activity.cancel();
};

/**
 * Open the gallery app
 * when the gallery button
 * is pressed.
 *
 * @api private
 */
proto.onGalleryButtonClick = function() {
  var MozActivity = window.MozActivity;

  // Can't launch the gallery if the lockscreen is locked.
  // The button shouldn't even be visible in this case, but
  // let's be really sure here.
  if (this.camera._secureMode) {
    return;
  }

  // Launch the gallery with an activity
  this.mozActivity = new MozActivity({
    name: 'browse',
    data: { type: 'photos' }
  });
};

/**
 * Capture when the capture
 * button is pressed.
 *
 * @api private
 */
proto.onCaptureButtonClick = function() {
  this.camera.capture();
};

});