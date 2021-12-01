// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const fabric = require('./fabric');
const config = require('./config');

async function invoke(fcn, args) {
  const request = {
    chainId: config.channelName,
    chaincodeId: config.chaincodeName,
    fcn,
    args,
  };

  let errorMessage = null;
  let transactionId = null;

  try {
    const client = await fabric.getClient();
    const channel = client.getChannel(config.channelName);

    transactionId = client.newTransactionID();
    request.txId = transactionId;
    request.targets = channel.getPeers();

    const proposalResults = await channel.sendTransactionProposal(request).catch((err) => {
      throw err;
    });

    const [proposalResponses, proposal] = proposalResults;

    let successful = true;
    for (let i = 0; i < proposalResponses.length; i += 1) {
      if (!(proposalResponses[i].response && proposalResponses[i].response.status === 200)) {
        successful = false;
        break;
      }
    }

    if (successful) {
      const promises = [];
      const eventHubs = channel.getChannelEventHubsForOrg();
      eventHubs.forEach((eh) => {
        const invokeEventPromise = new Promise((resolve, reject) => {
          const eventTimeout = setTimeout(() => { eh.disconnect(); }, 10000);
          eh.registerTxEvent(transactionId.getTransactionID(), (tx, code) => {
            clearTimeout(eventTimeout);
            if (code !== 'VALID') {
              const message = `Invoke chaincode transaction was invalid with code of ${code}`;
              return reject(new Error(message));
            }
            const message = 'Invoke chaincode transaction was valid';
            return resolve(message);
          }, (err) => {
            clearTimeout(eventTimeout);
            reject(err);
          },
          { unregister: true, disconnect: true });
          eh.connect();
        });
        promises.push(invokeEventPromise);
      });

      const ordererRequest = { txId: transactionId, proposalResponses, proposal };
      promises.push(channel.sendTransaction(ordererRequest));
      const ordererResponses = await Promise.all(promises);
      const ordererResponse = ordererResponses.pop();
      if (ordererResponse.status !== 'SUCCESS') {
        errorMessage = `Failed to order the transaction with code of ${ordererResponse.status}`;
      }
    } else {
      errorMessage = `Failed to send proposal and receive all good responses with code of ${proposalResponses[0].status}`;
    }
  } catch (error) {
    errorMessage = error.toString();
  }

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const txId = transactionId.getTransactionID();
  console.info(`Successfully invoked ${request.fcn} on chaincode ${request.chaincodeId} for transaction ${txId}`);
  return { transactionId: txId };
}

module.exports = invoke;
