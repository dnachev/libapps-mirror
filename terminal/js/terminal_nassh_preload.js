/**
 * @fileoverview Code to be run before loading nassh js files.
 *
 * @suppress {lintChecks}
 */

// Polyfill `getManifest()` so that nassh is happy.
if (chrome && chrome.runtime && !chrome.runtime.getManifest) {
  chrome.runtime.getManifest = () => {
    return /** @type {!chrome.runtime.Manifest} */ ({
      'name': 'SSH',
      'version': '',
      'icons': {'192': '/images/dev/crostini-192.png'},
    });
  };
}
