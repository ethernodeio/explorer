var fs = require('fs');
var Web3 = require('web3');
require( './sync.js' );

/**
  Start config for node connection and sync
**/
var config = {};
var web3 = new Web3(new Web3.providers.HttpProvider('http://' + config.nodeAddr + ':' + config.gethPort.toString()));
// set the default NODE address to localhost if it's not provided
if (!('nodeAddr' in config) || !(config.nodeAddr)) {
    config.nodeAddr = 'localhost'; // default
}
// set the default geth port if it's not provided
if (!('gethPort' in config) || (typeof config.gethPort) !== 'number') {
    config.gethPort = 8545; // default
}
// set the default output directory if it's not provided
if (!('output' in config) || (typeof config.output) !== 'string') {
    config.output = '.'; // default this directory
}
//Look for config.json file if not
try {
    var configContents = fs.readFileSync('conf.json');
    config = JSON.parse(configContents);
    console.log('Explorer config found: Node:'+config.nodeAddr+' | Port:'+config.gethPort);
}
catch (error) {
    if (error.code === 'ENOENT') {
        console.log('No config file found. Using default configuration: Node:'+config.nodeAddr+' | Port:'+config.gethPort);
    }
    else {
        throw error;
        process.exit(1);
    }
}
/**
  Start config for chain sync
**/
var syncConfig = {};

//Look for sync.json file if not
try {
    var syncConfigFile = fs.readFileSync('tools/sync.json');
    syncConfig = JSON.parse(syncConfigFile);
    console.log('Blocks config found: Start Block:'+syncConfig.startBlock+' | End Block:'+syncConfig.endBlock+' | '+ 'Last Synced:'+syncConfig.lastSynced);
}
catch (error) {
    if (error.code === 'ENOENT') {
        console.log('No Blocks config file found. Using default configuration.');
    }
    else {
        throw error;
        process.exit(1);
    }
}
