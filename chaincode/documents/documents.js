// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const shim = require('fabric-shim');

async function runQuery(stub, query) {
  const iterator = await stub.getQueryResult(query);
  const items = [];
  let result = {};
  while (!result.done) {
    result = await iterator.next(); // eslint-disable-line no-await-in-loop
    if (result.value) {
      const id = result.value.key;
      const document = result.value.value.toString('utf8');
      items.push({ id, document });
    }
  }
  return Buffer.from(JSON.stringify(items));
}

const Chaincode = class {
  async Init() {
    return shim.success();
  }

  async Invoke(stub) {
    const details = stub.getFunctionAndParameters();
    console.info(`Chaincode ${details.fcn} invoked: ${details.params}`);
    const method = this[details.fcn];
    if (!method) {
      throw new Error(`Chaincode function does not exist: ${details.fcn}`);
    }
    try {
      const item = JSON.parse(details.params);
      const response = await method(stub, item);
      return shim.success(response);
    } catch (err) {
      return shim.error(err);
    }
  }

  async getAll(stub) {
    const query = '{"selector": {}}';
    return runQuery(stub, query);
  }

  async get(stub, item) {
    const key = item.id;
    return stub.getState(key);
  }

  async put(stub, item) {
    const key = item.id;
    const buffer = Buffer.from(item.document);
    await stub.putState(key, buffer);
  }

  async delete(stub, item) {
    const key = item.id;
    await stub.deleteState(key);
  }
};

shim.start(new Chaincode());
