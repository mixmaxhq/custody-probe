# custody-probe

`supervisorctl status` reports the state of each process controlled by Supervisor: running, stopped,
fatally crashed. However it does not display the state of _subprocesses_. This becomes a problem
when using Supervisor for local development of microservices, where the processes launched by
Supervisor are not the servers themselves but rather build processes, which in turn launch the servers.
The process tree might look something like this:

```
supervisord
  - gulp (using gulp-nodemon)
    - node
```

If `node` crashes, `gulp` will remain healthy, and so `supervisorctl status` will fool you into
thinking that all services are running when they're not.

If you're using [custody](https://github.com/mixmaxhq/custody) as a front-end to Supervisor, you
can fix this by adding a single line of code to your webserver:

```js
require('custody-probe')('app');
```

Now if the "app" webserver crashes, custody will report "app" in state "FATAL" and will only switch
back to "RUNNING" when the webserver comes back up.

custody-probe will also, by default, reconfigure certain aspects of Node to work better in a
multi-process environment; see [Configuration](#configuration) for more details and to disable these
modifications.

## Installation

```sh
npm install --dev custody-probe
```

## Usage

```js
if (process.env.NODE_ENV === 'development') {
  require('custody-probe')('NAME_OF_PROGRAM');
}
```

If you've installed this as a dev dependency (recommended) you'll need to restrict it to running
in your development environment, as shown using `process.env.NODE_ENV`.

The argument to custody-probe is the name of the Supervisor program to which this Node process
belongs. Find the name of the program in your `supervisord.conf` file like `[program:NAME_OF_PROGRAM]`.

(The program name is _usually_ what's shown in the `name` column of `supervisorctl status` and
`custody`, too, except if you have associated the program with a Supervisor group, in which case
the column will read `NAME_OF_GROUP:NAME_OF_PROGRAM`.)

We recommend you add the probe to only **1 (one) process** controlled by each program, since as of
v1.0.0 custody only has support for displaying one process' state (in addition to what Supervisor
reports normally). If you add the probe to more processes within the same program, the states will
overwrite each other.

## Configuration

### Communication with custody

By default, custody uses `/usr/local/var/custody` to store information and to enable probe->custody
communication. You can override this directory by specifying the `CUSTODY_PROC_DIR` environment variable.

### Process modifications

custody-probe will also, by default, reconfigure the following aspects of Node to work better in a
multi-process environment i.e. if you're using Supervisor to manage multiple microservices.

#### Debugger support

Users can start [the Node debugger] by starting a process with the `inspect` argument or `--inspect`
flag. If they can't or don't wish to restart a running process, they can start the debugger by
signalling the process with [`'SIGUSR1'`]. This method is particularly useful when using Supervisor,
because Supervisor controls process lifecycles.

However, Node will in this latter case always start the debugger on the same port. This prevents
users from debugging multiple processes simultaneously. To fix this, custody-probe overrides
`'SIGUSR1'` to start the debugger on a dynamic port.

The one downside of dynamic port assignment is that `chrome://inspect` by default only monitors
9222 and 9229 for new connections, though you can change this by clicking "Configure" next to
"Discover Network Targets".

If you wish to preserve the default port when sending `'SIGUSR1'`, you can set
the `CUSTODY_CHOOSE_DEBUG_PORT_DYNAMICALLY` environment variable to "false".

Users will be able to use a static port when using the `inspect` argument or `--inspect` flag,
regardless of the value of `CUSTODY_CHOOSE_DEBUG_PORT_DYNAMICALLY`.

## Contributing

We welcome bug reports and feature suggestions!

[the Node debugger]: https://nodejs.org/api/debugger.html
[`'SIGUSR1'`]: https://nodejs.org/api/process.html#process_signal_events
