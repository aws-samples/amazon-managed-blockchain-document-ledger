// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const connectionProfile = {
  version: '1.0',
  organizations: {
    Org1: {
      mspid: process.env.MEMBER_ID,
      certificateAuthorities: ['ca'],
      peers: ['peer'],
    },
  },
  certificateAuthorities: {
    ca: {
      url: `https://${process.env.CA_ENDPOINT}`,
      tlsCACerts: {path: '/opt/managedblockchain-tls-chain.pem'},
      caName: process.env.MEMBER_ID,
    },
  },
  orderers: {
    'orderer.com': {
      url: `grpcs://${process.env.ORDERER_ENDPOINT}`,
      grpcOptions: {'ssl-target-name-override': process.env.ORDERER_ENDPOINT.replace(/:.*$/, '')},
      tlsCACerts: {path: '/opt/managedblockchain-tls-chain.pem'},
    },
  },
  peers: {
    peer: {
      url: `grpcs://${process.env.PEER_ENDPOINT}`,
      grpcOptions: {'ssl-target-name-override': process.env.PEER_ENDPOINT.replace(/:.*$/, '')},
      tlsCACerts: {path: '/opt/managedblockchain-tls-chain.pem'},
    },
  },
  channels: {
    documents: {
      orderers: ['orderer.com'],
      peers: {
        peer: {endorsingPeer: true, chaincodeQuery: true, ledgerQuery: true},
      },
    },
  },
};

module.exports = {
  privateKeyArn: process.env.PRIVATE_KEY_ARN,
  signedCertArn: process.env.SIGNED_CERT_ARN,
  memberId: process.env.MEMBER_ID,
  channelName: process.env.CHANNEL_NAME,
  chaincodeName: process.env.CHAINCODE_NAME,
  connectionProfile,
};
