/*
Name: Ethereum Blockchain syncer
Version: .0.0.1
This file will start syncing the blockchain from the node address you provide in the conf.json file.
Please read the README in the root directory that explains the parameters of this code
*/
require( '../db.js' );
var etherUnits = require("../lib/etherUnits.js");
var BigNumber = require('bignumber.js');


var fs = require('fs');
var Web3 = require('web3');


var mongoose        = require( 'mongoose' );
var Block           = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );

/**
  //Just listen for latest blocks and sync from the start of the app.
**/
var listenBlocks = function(config) {
    var newBlocks = web3.eth.filter("latest");
    newBlocks.watch(function (error,blockHashOrNumber) {
    if(error) {
        console.log('Error: ' + error);
    } else if (blockHashOrNumber == null) {
        console.log('Warning: null block hash');
    } else {
      console.log('Found new block: ' + blockHashOrNumber);
      if(web3.isConnected()) {
        web3.eth.getBlock(blockHashOrNumber, true, function(error,blockData) {
          if(error) {
            console.log('Warning: error on getting block with hash/number: ' +   blockHashOrNumber + ': ' + error);
          }else if(blockData == null) {
            console.log('Warning: null block data received from the block with hash/number: ' + blockHashOrNumber);
          }else{
            updatedEndBlock(config,blockData.number);
            writeBlockToDB(config, blockData);
            writeTransactionsToDB(config, blockData);
          }
        });
      }else{
        console.log('Error: Web3 connection time out trying to get block ' + blockHashOrNumber + ' retrying connection now');
        listenBlocks(config);
      }
    }
  });
}
/**
  If full sync is checked this function will start syncing the block chain from lastSynced param see README
**/
var syncChain = function(config, web3, blockHashOrNumber) {
  if(blockHashOrNumber == undefined) {
    blockHashOrNumber = config.endBlock
  }
  if(web3.isConnected()) {
    web3.eth.getBlock(blockHashOrNumber, true, function(error, blockData) {
      if(error) {
        console.log('Warning: error on getting block with hash/number: ' +   blockHashOrNumber + ': ' + error);
        //
        syncChain(config, web3, blockHashOrNumber);
      }else if(blockData == null) {
        console.log('Warning: null block data received from the block with hash/number: ' + blockHashOrNumber + ' Retrying in 5 seconds');

       }else{
        if(config.lastSynced === 0){
          console.log('No last full sync record found, start from block: latest');
          writeBlockToDB(config, blockData);
          writeTransactionsToDB(config, blockData);
          var lastSync = blockData.number;
          updateLastSynced(config, lastSync);
        }else{
          console.log('Found last full sync record: ' + config.lastSynced);
          writeBlockToDB(config, blockData);
          writeTransactionsToDB(config, blockData);
          var lastSync = config.lastSynced - 1;
          updateLastSynced(config, lastSync);
        }
      }
    });
  }else{
    console.log('Error: Web3 connection time out trying to get block ' + blockHashOrNumber + ' retrying connection now');
    syncChain(config, web3, blockHashOrNumber);
  }
};
/**
  Write the whole block object to DB
**/
var writeBlockToDB = function(config, blockData) {
  return new Block(blockData).save( function( err, block, count ){
    if ( typeof err !== 'undefined' && err ) {
        if (err.code == 11000) {
            if(!('quiet' in config && config.quiet === true)) {
              console.log('Skip: Duplicate key ' +  blockData.number.toString() + ': ' + err);
            }
        } else {
          console.log('Error: Aborted due to error on ' + 'block number ' + blockData.number.toString() + ': ' +  err);
          process.exit(9);
       }
    } else {
        if(!('quiet' in config && config.quiet === true)) {
          console.log('DB successfully written for block number ' + blockData.number.toString());
        }
    }
  });
}
/**
  Break transactions out of blocks and write to DB
**/
var writeTransactionsToDB = function(config, blockData) {
  var bulkOps = [];
  if (blockData.transactions.length > 0) {
    for (d in blockData.transactions) {
      var txData = blockData.transactions[d];
      txData.timestamp = blockData.timestamp;
      txData.value = etherUnits.toEther(new BigNumber(txData.value), 'wei');
      bulkOps.push(txData);
    }
    Transaction.collection.insert(bulkOps, function( err, tx ){
      if ( typeof err !== 'undefined' && err ) {
        if (err.code == 11000) {
          console.log('Skip: Duplicate key ' + err);
            } else {
               console.log('Error: Aborted due to error: ' + err);
               process.exit(9);
           }
        } else if(!('quiet' in config && config.quiet === true)) {
            console.log(blockData.transactions.length.toString() + ' transactions recorded for Block# ' + blockData.number.toString());
        }
    });
  }
}
var checkBlockDBExistsThenWrite = function(config, blockData) {
  Block.find({number: blockData.number}, function (err, b) {
      if (!b.length){
          writeBlockToDB(config, blockData);
          writeTransactionsToDB(config, blockData);
      }else if(!('quiet' in config && config.quiet === true)) {
          console.log('Block number: ' + blockData.number.toString() + ' already exists in DB.');
          listenBlocks(config);
      }
  });
};
var updatedEndBlock = function(config,lastBlock){
  var configFile = '../conf.json';
  var file = require(configFile);

  file.endBlock = lastBlock;

  fs.writeFile('conf.json', JSON.stringify(file, null, 2), function (err) {
    if (err) return console.log(err);
    //console.log('Wirting new Synced Block ' + lastBlock + ' to ' + configFile);
  });
};
/**
  Take the last block the grabber exited on and update the param 'end' in the config.JSON
**/
var updateLastSynced = function(config,lastSync){
  var configFile = '../conf.json';
  var file = require(configFile);

  file.lastSynced = lastSync;
  config.lastSynced = lastSync;

  fs.writeFile('conf.json', JSON.stringify(file, null, 2), function (err) {
    if (err) return console.log(err);
    //console.log('writing block ' + lastSync + ' to ' + configFile);

    if (config.lastSynced === config.startBlock){
      config.syncAll = false;
      file.syncAll  = false;
      fs.writeFile('conf.json', JSON.stringify(file, null, 2), function (err) {
        if (err) return console.log(err);
      });
    }else{
      syncChain(config, web3, config.lastSynced);
    }
  });
}
var patchBlocks = function(config, web3){
  if (config.startBlock < blockData.number){

  }
}
module.exports.syncChain = syncChain;
require('./config.js');
