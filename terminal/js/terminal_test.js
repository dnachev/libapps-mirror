// Copyright 2019 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Test framework setup when run inside the browser.
 */

// Utility functions for testing.
const test = {};

/**
 * Listens for the next change to the specified preference.
 *
 * @param {!lib.PreferenceManager} prefMgr
 * @param {string} prefName
 * @return {!Promise<void>} Promise which resolves when preference is changed.
 */
test.listenForPrefChange = function(prefMgr, prefName) {
  return new Promise((resolve) => {
    const observer = () => {
      resolve();
      prefMgr.removeObserver(prefName, observer);
    };
    prefMgr.addObserver(prefName, observer);
  });
};

// Setup the mocha framework.
// TODO(lxj@google.com): Move preference manager into a module such that it is
// no longer a global variable.
mocha.setup({ui: 'bdd', globals: [
  'PreferenceManager',
  'preferenceManager',
  'webFontPromises',
]});
mocha.checkLeaks();

// Add a global shortcut to the assert API.
const assert = chai.assert;

// Catch any random errors before the test runner runs.
let earlyError = null;
/**
 * Catch any errors.
 *
 * @param {*} args Whatever arguments are passed in.
 */
window.onerror = function(...args) {
  earlyError = Array.from(args);
};

/** Run the test framework once everything is finished. */
window.onload = async function() {
  hterm.defaultStorage = new lib.Storage.Memory();

  await lib.init();
  mocha.run();

  if (earlyError !== null) {
    assert.fail(`uncaught exception detected:\n${earlyError.join('\n')}\n`);
  }
};

/**
 * @suppress {constantProperty} Allow tests in all browsers.
 */
window.chrome = window.chrome || {};
