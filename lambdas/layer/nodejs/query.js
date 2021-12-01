// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const fabric = require('./fabric');
const config = require('./config');

async function query(fcn, args = ['{}']) {
  const request = {
    chainId: config.channelName,
    chaincodeId: config.chaincodeName,
    fcn,
    args,
  };
  const client = await fabric.getClient();
  const channel = client.getChannel(config.channelName);
	  return channel.queryByChaincode(request).then((responses) => {
      let result = '';
      if (responses && responses.length == 1) {
        if (responses[0] instanceof Error) {
          throw responses[0];
        } else {
          result = responses[0].toString();
          console.info(`Query response: ${result}`);
        }
      }
      return result;
    }).catch((error) => {
      console.error(`Query failed: ${error}`);
      throw error;
    });
}

module.exports = query;
