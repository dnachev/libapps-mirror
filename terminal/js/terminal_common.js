// Copyright 2020 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Common code for terminal and it settings page.
 */

import {ContainerId, TerminalActiveTracker} from './terminal_active_tracker.js';

// The value of an entry is true if it is a web font from fonts.google.com,
// otherwise it is a local font. Note that the UI shows the fonts in the same
// order as the entries'.
//
// @type {!Map<string, boolean>}
export const SUPPORTED_FONT_FAMILIES = new Map([
  // The first font is the default font. It must be a local font.
  ['Noto Sans Mono', false],
  ['Cousine', false],
  ['Roboto Mono', true],
  ['Inconsolata', true],
  ['Source Code Pro', true],
]);
export const DEFAULT_FONT_FAMILY = SUPPORTED_FONT_FAMILIES.keys().next().value;
export const SUPPORTED_FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20];
export const SUPPORTED_LINE_HEIGHT_PADDINGS = [-2, -1.5, -1, -0.5, 0, 0.5, 1,
  1.5, 2, 3, 4, 5];

// Numeric chrome version (e.g. 78). `null` if fail to detect.
export const CHROME_VERSION = (function() {
  const matches = navigator.userAgent.match(/Chrome\/(\d+)/);
  if (matches) {
    return parseInt(matches[1], 10);
  }
  return null;
})();

/** @type {!Array<string>} */
export const DEFAULT_ANSI_COLORS = [
  '#3C4043',
  '#F28B82',
  '#137356',
  '#E37400',
  '#8AB4F8',
  '#EE5FFA',
  '#03BFC8',
  '#FFFFFF',
  '#9AA0A6',
  '#F6AEA9',
  '#87FFC5',
  '#FDD663',
  '#AECBFA',
  '#F4B5FB',
  '#80F9F9',
  '#F8F9FA',
];
export const DEFAULT_BACKGROUND_COLOR = '#202124';
export const DEFAULT_BACKGROUND_SIZE = '100% 100%';
export const DEFAULT_FOREGROUND_COLOR = '#FFFFFF';
export const DEFAULT_CURSOR_COLOR = '#669DF680';
export const DEFAULT_FONT_SIZE = 13;
export const DEFAULT_SCREEN_PADDING_SIZE = 8;
export const DEFAULT_THEME = 'dark';

export const DEFAULT_VM_NAME = 'termina';
export const DEFAULT_CONTAINER_NAME = 'penguin';

const TMUX_PARAM_NAME = 'tmux';

/**
 * Convert a font family to a CSS string.
 *
 * @param {string} fontFamily one of the font in SUPPORTED_FONT_FAMILIES.
 * @return {string}
 */
export function fontFamilyToCSS(fontFamily) {
  if (fontFamily === DEFAULT_FONT_FAMILY) {
    return `'${fontFamily}', 'Powerline For ${fontFamily}'`;
  }
  return `'${fontFamily}', 'Powerline For ${fontFamily}', ` +
      `'${DEFAULT_FONT_FAMILY}'`;
}

/**
 * Normalize a css font family string and return one of the font family in
 * SUPPORTED_FONT_FAMILIES.
 *
 * @param {string} cssFontFamily The css font family string.
 * @return {string} The normalized font.
 */
export function normalizeCSSFontFamily(cssFontFamily) {
  for (let fontFamily of cssFontFamily.split(',')) {
    // The regex can never fail, so it is safe to just use the result.
    fontFamily = fontFamily.match(/^\s*['"]?(.*?)['"]?\s*$/)[1];
    if (SUPPORTED_FONT_FAMILIES.has(fontFamily)) {
      return fontFamily;
    }
  }
  return DEFAULT_FONT_FAMILY;
}

/**
 * Define prefs for terminal which are not used by hterm, or that have a
 * different default.
 *
 * @param {!lib.PreferenceManager} prefs The preference manager.
 */
export function definePrefs(prefs) {
  // Set terminal default overrides from hterm.
  prefs.definePreference('audible-bell-sound', '');
  prefs.definePreference('background-color', DEFAULT_BACKGROUND_COLOR);
  prefs.definePreference('background-size', DEFAULT_BACKGROUND_SIZE);
  prefs.definePreference('cursor-color', DEFAULT_CURSOR_COLOR);
  prefs.definePreference('color-palette-overrides', DEFAULT_ANSI_COLORS);
  prefs.definePreference('font-family', fontFamilyToCSS(DEFAULT_FONT_FAMILY));
  prefs.definePreference('font-size', DEFAULT_FONT_SIZE);
  prefs.definePreference('foreground-color', DEFAULT_FOREGROUND_COLOR);
  prefs.definePreference('pass-alt-number', false);
  prefs.definePreference('pass-ctrl-number', false);
  prefs.definePreference('pass-ctrl-tab', true);
  prefs.definePreference('screen-padding-size', DEFAULT_SCREEN_PADDING_SIZE);
  prefs.definePreference('theme', DEFAULT_THEME);
  prefs.definePreference('theme-variations', {});
}

/**
 * Make sure preference values are valid.
 *
 * @param {!lib.PreferenceManager} prefs The preference manager.
 */
export function normalizePrefsInPlace(prefs) {

  prefs.set('font-family', fontFamilyToCSS(normalizeCSSFontFamily(
      /** @type {string} */(prefs.get('font-family')))));

  if (!SUPPORTED_FONT_SIZES.includes(prefs.get('font-size'))) {
    prefs.set('font-size', DEFAULT_FONT_SIZE);
  }

  // Remove alpha from background-color.
  const backgroundColor = lib.colors.normalizeCSS(
      /** @type {string} */(prefs.get('background-color')));
  if (!backgroundColor) {
    // The color value is invalid.
    prefs.reset('background-color');
  } else {
    // Store uppercase hex to help detect when a value is set to default.
    const rgb = lib.colors.setAlpha(backgroundColor, 1);
    prefs.set('background-color', lib.colors.rgbToHex(rgb).toUpperCase());
  }
}

/**
 * Load a web font into a document object.
 *
 * @param {!Document} document The document to load the web font into.
 * @param {string} fontFamily The font family to load.
 * @param {?string=} link_id The id for the <link> element. Existing element
 *     with the same id will be removed first. If this is not specified, a
 *     default value will be used.
 * @return {!Promise<boolean>} Reject if cannot load the font. Otherwise, it
 *     resolves to a boolean indicating whether the font is a web font or not.
 */
export function loadWebFont(document, fontFamily, link_id) {
  return new Promise((resolve, reject) => {
    link_id = link_id || 'terminal:web-font-link';
    if (!SUPPORTED_FONT_FAMILIES.get(fontFamily)) {
      // Not a web font.
      resolve(false);
      return;
    }

    const head = document.querySelector('head');
    let link = head.querySelector(`#${CSS.escape(link_id)}`);
    if (link) {
      link.remove();
    }
    link = document.createElement('link');
    link.id = link_id;
    link.href = `https://fonts.googleapis.com/css2?family=` +
        `${encodeURIComponent(fontFamily)}&display=swap`;
    link.rel = 'stylesheet';
    link.addEventListener('load', async () => {
      // 'X' is the character of which hterm measures the size. For the font
      // size, the default one is used because it probably does not matter.
      const fonts = await document.fonts.load(
          `${DEFAULT_FONT_SIZE}px "${fontFamily}"`, 'X');
      if (fonts.length === 0) {
        reject(new Error('Unable to load fonts'));
      } else {
        resolve(true);
      }
    });
    link.addEventListener('error',
        () => reject(new Error('Unable to load css')));
    head.appendChild(link);
  });
}

/**
 * Load local Powerline web fonts.
 *
 * @param {!Document} document The document to load into.
 */
export function loadPowerlineWebFonts(document) {
  const style = document.createElement('style');
  style.textContent = Array.from(SUPPORTED_FONT_FAMILIES.keys()).map((f) => `
      @font-face {
        font-family: 'Powerline For ${f}';
        src: url('../fonts/PowerlineFor${f.replace(/\s/g, '')}.woff2')
             format('woff2');
        font-weight: normal bold;
        unicode-range:
            U+2693,U+26A1,U+2699,U+270E,U+2714,U+2718,U+273C,U+279C,U+27A6,
            U+2B06-2B07,U+E0A0-E0D4;
      }
  `).join('');
  document.head.appendChild(style);
}

// Cache the url at the first opportunity. The url normally should not change,
// so this is being defensive.
const ORIGINAL_URL = new URL(document.location.href);

/**
 * @typedef {{
 *   windowChannelName: (string|undefined),
 *   driverChannelName: string,
 * }}
 */
export let TmuxLaunchInfo;

/**
 * `hasCwd` indicates whether there is a cwd argument in `args`. The
 * `containerId` should be canonicalized such that empty container id is
 * converted to one with the default vm name and container name.
 *
 * @typedef {{
 *   args: !Array<string>,
 *   containerId: !ContainerId,
 *   hasCwd: boolean,
 * }}
 */
export let VshLaunchInfo;

/**
 * Only one of the top level properties should exist.
 *
 * @typedef {{
 *   tmux: (!TmuxLaunchInfo|undefined),
 *   vsh: (!VshLaunchInfo|undefined),
 *   crosh: (!Object|undefined),
 *   ssh: (!Object|undefined),
 * }}
 */
export let TerminalLaunchInfo;

/**
 * @param {{
 *   windowChannelName: string,
 *   driverChannelName: string,
 * }} obj
 * @return {string}
 */
export function composeTmuxUrl({windowChannelName, driverChannelName}) {
  const url = new URL(ORIGINAL_URL.origin);
  url.pathname = '/html/terminal.html';

  const paramValue = JSON.stringify({windowChannelName, driverChannelName});
  url.search = `?${TMUX_PARAM_NAME}=${paramValue}`;

  return url.toString();
}

/**
 * Resolves to true if tmux integration is enabled via chrome://flags.
 *
 * @type {!Promise<boolean>}
 */
export const getTmuxIntegrationEnabled = new Promise((resolve) => {
  const getOSInfo = chrome.terminalPrivate?.getOSInfo;
  if (!getOSInfo) {
    resolve(false);
    return;
  }
  getOSInfo((info) => resolve(info.tmux_integration));
});

/**
 * This figures out and returns the terminal launch info for the current tab.
 *
 * @param {!TerminalActiveTracker} activeTracker The global active tracker.
 * @param {boolean} isTmuxIntegrationEnabled
 * @param {!URL=} url The url of the tab. This is for testing.
 *     Normal user should just use the default value.
 * @return {!TerminalLaunchInfo}
 */
export function getTerminalLaunchInfo(activeTracker, isTmuxIntegrationEnabled,
    url = ORIGINAL_URL) {
  if (url.host === 'crosh') {
    return {crosh: {}};
  }

  if (url.pathname === '/html/terminal_ssh.html' ||
      // TODO(crbug.com/1283153): Remove this when we stop redirecting this
      // path to terminal_ssh.html in TerminalSource.
      url.pathname === '/html/nassh.html') {
    return {ssh: {}};
  }

  const urlParams = url.searchParams;
  const parentTerminalInfo = activeTracker.parentTerminal?.terminalInfo;

  if (isTmuxIntegrationEnabled) {
    if (urlParams.has(TMUX_PARAM_NAME)) {
      return {tmux: /** @type {!TmuxLaunchInfo} */(JSON.parse(
          /** @type {string} */(urlParams.get(TMUX_PARAM_NAME))))};
    }

    const urlParamsAreEmpty = urlParams[Symbol.iterator]().next().done;

    if (urlParamsAreEmpty && parentTerminalInfo?.tmuxDriverChannel) {
      return {tmux: {
        driverChannelName: /** @type {string} */(
            parentTerminalInfo.tmuxDriverChannel),
      }};
    }
  }

  const args = urlParams.getAll('args[]');
  const outputArgs = [];
  let containerId = {};
  let inputArgsHasCwd = false;
  let outputArgsHasCwd = false;

  for (const arg of args) {
    if (arg.startsWith('--vm_name=')) {
      const value = arg.split('=', 2)[1];
      if (value) {
        containerId.vmName = value;
      }
      continue;
    }
    if (arg.startsWith('--target_container=')) {
      const value = arg.split('=', 2)[1];
      if (value) {
        containerId.containerName = value;
      }
      continue;
    }

    if (arg.startsWith('--cwd=')) {
      inputArgsHasCwd = outputArgsHasCwd = true;
    }
    outputArgs.push(arg);
  }

  // Parent container id or the default container id.
  const parentContainerId = parentTerminalInfo?.containerId || {
    vmName: DEFAULT_VM_NAME,
    containerName: DEFAULT_CONTAINER_NAME,
  };

  // Follow parent containerId only if it is not already specified in `args`.
  if (Object.keys(containerId).length === 0) {
    containerId = parentContainerId;
  }

  if (containerId.vmName) {
    outputArgs.push(`--vm_name=${containerId.vmName}`);
  }
  if (containerId.containerName) {
    outputArgs.push(`--target_container=${containerId.containerName}`);
  }

  const parentTerminalId = parentTerminalInfo?.terminalId;
  if (!inputArgsHasCwd &&
      parentTerminalId &&
      // It only makes sense to follow parent's CWD if the container id is the
      // same.
      containerId.vmName === parentContainerId.vmName &&
      containerId.containerName === parentContainerId.containerName) {
    outputArgs.push(`--cwd=terminal_id:${parentTerminalId}`);
    outputArgsHasCwd = true;
  }

  return {
    vsh: {
      args: outputArgs,
      containerId,
      hasCwd: outputArgsHasCwd,
    },
  };
}

/**
 * Create a title of the form <>@container:~ or <>@vm:~.
 *
 * @param {!ContainerId} containerId
 * @return {string}
 */
export function composeTitle(containerId) {
  let suffix = (containerId.containerName || containerId.vmName || '');
  suffix += ':~';
  return '<>@' + suffix;
}

/**
 * @param {!ContainerId} containerId The "canonicalized" container id. See type
 *     TerminalLaunchInfo.
 * @return {string}
 */
export function getInitialTitleCacheKey(containerId) {
  return 'cachedInitialTitle-' + JSON.stringify(
      containerId,
      // This is to make sure the order of the properties. This seems to be
      // documented in the ES5 standard.
      ['containerName', 'vmName'],
  );
}

/**
 * Set up a title handler. For vsh, it sets a proper document title before the
 * terminal is ready, and caches title for other terminals to use.
 *
 * @param {!TerminalLaunchInfo=} launchInfo This is for testing. Normal users
 *     should not specify it.
 * @return {!Promise<(function()|undefined)>} return a function to stop the
 *     handler for vsh. This is mainly for testing.
 */
export async function setUpTitleHandler(launchInfo) {
  const tracker = await TerminalActiveTracker.get();
  if (!launchInfo) {
    launchInfo = getTerminalLaunchInfo(tracker,
        await getTmuxIntegrationEnabled);
  }

  if (launchInfo.crosh) {
    document.title = 'crosh';
    return;
  }

  if (launchInfo.tmux) {
    document.title = '[tmux]';
    return;
  }

  if (launchInfo.ssh) {
    document.title = 'SSH';
    return;
  }

  const {hasCwd, containerId} = launchInfo.vsh;

  const key = getInitialTitleCacheKey(containerId);

  if (tracker.parentTerminal) {
    document.title = tracker.parentTerminal.title;
  } else {
    let title = window.localStorage.getItem(key);
    // Special title composing logic for non-default vm.
    if (title === null &&
        (containerId.vmName !== DEFAULT_VM_NAME ||
         containerId.containerName !== DEFAULT_CONTAINER_NAME)) {
      title = composeTitle(containerId);
    }
    if (title !== null) {
      document.title = title;
    }
  }

  let isFirstTitle = true;
  const observer = new MutationObserver(function(mutations, observer) {
    if (isFirstTitle && !hasCwd) {
      window.localStorage.setItem(key, mutations[0].target.textContent);
    }
    isFirstTitle = false;
    tracker.maybeUpdateWindowActiveTerminal();
  });
  observer.observe(document.querySelector('title'), {childList: true});
  return () => observer.disconnect();
}

/**
 * Re-dispatch an event on the element.
 *
 * @param {!HTMLElement} element
 * @param {!Event} event
 */
export function redispatchEvent(element, event) {
    element.dispatchEvent(new event.constructor(event.type, event));
}
