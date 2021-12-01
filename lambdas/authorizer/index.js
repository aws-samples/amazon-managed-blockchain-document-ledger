// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require('aws-sdk');

const baseMethodArn = process.env.BASE_METHOD_ARN;

const readerSecretArn = process.env.READER_SECRET_ARN;
const writerSecretArn = process.env.WRITER_SECRET_ARN;

const readerPolicy = {
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'execute-api:Invoke',
        Resource: [
          `${baseMethodArn}/*/GET/documents`,
          `${baseMethodArn}/*/GET/documents/*`,
        ],
      },
    ],
  },
};

const writerPolicy = {
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'execute-api:Invoke',
        Resource: [
          `${baseMethodArn}/*/POST/documents`,
          `${baseMethodArn}/*/PUT/documents/*`,
          `${baseMethodArn}/*/DELETE/documents/*`,
        ],
      },
    ],
  },
};

const getSecrets = async () => {
  const sm = new aws.SecretsManager();
  const readerSecret = await sm.getSecretValue({ SecretId: readerSecretArn }).promise();
  const writerSecret = await sm.getSecretValue({ SecretId: writerSecretArn }).promise();
  return [readerSecret.SecretString, writerSecret.SecretString];
};

exports.handler = async (event, context, callback) => {
  const [readerToken, writerToken] = await getSecrets();
  switch (event.authorizationToken) {
    case readerToken: callback(null, readerPolicy); break;
    case writerToken: callback(null, writerPolicy); break;
    default: callback('Unauthorized'); break;
  }
};
