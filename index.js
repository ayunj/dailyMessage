const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const functions = require('@google-cloud/functions-framework');
const { helloHttp } = require('./src/handlers/helloHttp');

functions.http('helloHttp', helloHttp);

