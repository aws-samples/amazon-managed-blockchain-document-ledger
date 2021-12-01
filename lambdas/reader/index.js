// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

module.paths.push('/opt/nodejs');

const query = require('query');

exports.handler = async (event, context, callback) => {
  try {
    const documentId = event.pathParameters ? event.pathParameters.document_id : undefined;
    let functionName;
    switch (event.httpMethod) {
      case 'GET':
        functionName = documentId ? 'get' : 'getAll';
        break;
      default:
        throw new Error('Malformed request body');
    }
    const item = { id: documentId, document: event.body };
    const args = [JSON.stringify(item)];
    const result = await query(functionName, args);
    const response = { statusCode: 200, body: result };
    callback(null, response);
  } catch (error) {
    console.error(error);
    callback(error.message || error);
  }
};
