const inspector = require('inspector');
const mkdirp = require('mkdirp');
const { join: joinPath } = require('path');
const { writeFileSync } = require('fs');

// Keep these values in sync with those inside `custody`.
const PROC_DIR = process.env.CUSTODY_PROC_DIR || '/usr/local/var/custody/services';
const STATEFILE_EXT = '.statefile';
const STATES = {
  RUNNING: 'RUNNING',
  FATAL: 'FATAL',
};

/**
 * Initializes a probe to report this process' state to `@custody/cli` as well as
 * `@custody/plugin-command-start-debugger`, if that is in use.
 *
 * See https://github.com/mixmaxhq/custody/wiki/custody-probe for architecture.
 *
 * @param {String} name - The name of the Supervisor program to which this Node process belongs.
 */
module.exports = function initializeProbe(name) {
  mkdirp.sync(PROC_DIR);

  // Synchronously update the state so that we can do so before the process (potentially) crashes.
  function updateState(state = STATES.RUNNING, description = '') {
    const statefile = `${name}${STATEFILE_EXT}`;
    const path = joinPath(PROC_DIR, statefile);
    writeFileSync(
      path,
      JSON.stringify({
        pid: process.pid,
        state,
        description,
        inspectorUrl: inspector.url(),
      })
    );
  }

  // Mark the process as running on startup.
  updateState();

  // Manually handle 'SIGUSR1' so that we can dynamically assign a port to the inspector, to allow
  // the user to debug multiple processes simultaneously.
  //
  // The user will still be able to manually invoke the debugger either by passing `--inspect` or by
  // themselves (vs. `@custody/plugin-command-start-debugger`) signalling the process with
  // 'SIGUSR1'. If they use the former technique, or set the `CUSTODY_CHOOSE_DEBUG_PORT_DYNAMICALLY`
  // environment variable to "false", they will be able to control the port.
  //
  // The one downside of dynamic port assignment is that `chrome://inspect` by default only monitors
  // 9222 and 9229 for new connections.
  process.on('SIGUSR1', () => {
    // Don't open the inspector if it's already open, either because we opened it or because the
    // process was started with `--inspect`.
    if (inspector.url()) return;

    // 0 means choose a port dynamically:
    // https://github.com/nodejs/node/issues/16872#issuecomment-345079160
    const chooseDebugPortDynamically =
      process.env.CUSTODY_CHOOSE_DEBUG_PORT_DYNAMICALLY !== 'false';
    inspector.open(chooseDebugPortDynamically ? 0 : process.debugPort);

    // Communicate the inspector URL to `@custody/plugin-command-start-debugger`.
    updateState();
  });

  process.on('uncaughtException', (err) => {
    updateState(STATES.FATAL, err.message);
  });
};
