// Copyright 2020 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Tests for passing back exit status.
 */

import * as Process from '../js/process.js';
import * as SyscallEntry from '../js/syscall_entry.js';
import * as SyscallHandler from '../js/syscall_handler.js';
import * as WASI from '../js/wasi.js';

describe('exit.js', () => {

/**
 * A handler just to capture output.
 */
class TestSyscallHandler extends SyscallHandler.DirectWasiPreview1 {
  constructor(...args) {
    super(...args);
    this.stdout = '';
    this.stderr = '';
    this.td = new TextDecoder();
  }

  /** @override */
  handle_fd_write(fd, buf) {
    switch (fd) {
      case 1:
        this.stdout += this.td.decode(buf, {stream: true});
        return WASI.errno.ESUCCESS;

      case 2:
        this.stderr += this.td.decode(buf, {stream: true});
        return WASI.errno.ESUCCESS;
    }

    return WASI.errno.EINVAL;
  }
}

/**
 * Helper function to run the wasm module & return output.
 *
 * @param {!ArrayBuffer} prog The program to run.
 * @param {!Array<string>} argv The program arguments.
 * @return {!Object} The program results.
 */
async function run(prog, argv) {
  const handler = new TestSyscallHandler();
  const sys_handlers = [handler];
  const proc = new Process.Foreground({
    executable: prog,
    argv: ['exit.wasm', ...argv],
    sys_handlers: sys_handlers,
    sys_entries: [
      new SyscallEntry.WasiPreview1({sys_handlers}),
    ],
  });
  const ret = await proc.run();
  return {
    returncode: ret,
    stdout: handler.stdout,
    stderr: handler.stderr,
  };
}

/**
 * Load some common state that all tests in here want.
 */
before(async function() {
  // Fetch & read the body once to speed up the tests.
  this.prog = await fetch('exit.wasm')
    .then((response) => response.arrayBuffer());
});

describe('return', () => {
  for (const status of [0, 1, 126, 127, 255]) {
    it.skip(`${status}`, async function() {
      const result = await run(this.prog, ['ret', `${status}`]);
      assert.equal(result.returncode, status);
    });
  }
});

describe('exit', () => {
  for (const status of [0, 1, 126, 127, 255]) {
    it.skip(`${status}`, async function() {
      const result = await run(this.prog, ['exit', `${status}`]);
      assert.equal(result.returncode, status);
    });
  }
});

it.skip('abort', async function() {
  const result = await run(this.prog, ['abort']);
  assert.equal(result.returncode, 1);
});

});
