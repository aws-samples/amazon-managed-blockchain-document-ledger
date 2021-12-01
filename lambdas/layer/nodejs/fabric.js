// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require('aws-sdk');
const fabricClient = require('fabric-client');

const config = require('./config');

const getSecret = async (secretId) => {
  const sm = new aws.SecretsManager();
  const secret = await sm.getSecretValue({ SecretId: secretId }).promise();
  return secret.SecretString;
};

async function getClient() {
  const client = fabricClient.loadFromConfig(config.connectionProfile);

  const privateKeyPEM = await getSecret(config.privateKeyArn);
  const signedCertPEM = await getSecret(config.signedCertArn);

  const userData = {
    username: 'admin',
    mspid: config.memberId,
    cryptoContent: { privateKeyPEM, signedCertPEM },
    skipPersistence: true,
  };
  const user = await client.createUser(userData);
  client.setUserContext(user, true);

  return client;
}

module.exports = { getClient };
