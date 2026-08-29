'use strict';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
if (portIndex >= 0 && args[portIndex + 1]) process.env.PORT = args[portIndex + 1];
require('./server');
