// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

module.paths.push('/opt/nodejs');

const uuid = require('uuid');

const invoke = require('invoke');

exports.handler = async (event, context, callback) => {
  try {
    let documentId = event.pathParameters ? event.pathParameters.document_id : undefined;
    let functionName;
    switch (event.httpMethod) {
      case 'POST':
        documentId = uuid.v4();
        functionName = 'put';
        break;
      case 'PUT':
        functionName = 'put';
        break;
      case 'DELETE':
        functionName = 'delete';
        break;
      default:
        throw new Error('Malformed request body');
    }
    const item = { id: documentId, document: event.body };
    const args = [JSON.stringify(item)];
    const result = await invoke(functionName, args);
    result.documentId = documentId;
    const response = { statusCode: 200, body: JSON.stringify(result) };
    callback(null, response);
  } catch (error) {
    console.error(error);
    callback(error.message || error);
  }
};
