#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export LEDGER_STACK="LedgerStack"

export NETWORK_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NetworkId`].OutputValue' --output text)
export MEMBER_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberId`].OutputValue' --output text)
export NODE_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NodeId`].OutputValue' --output text)


echo "Exporting ledger data"
mkdir -p cdk.out/data
aws managedblockchain get-network --network-id $NETWORK_ID --query 'Network' > cdk.out/data/network.json
aws managedblockchain get-member --network-id $NETWORK_ID --member-id $MEMBER_ID --query 'Member' > cdk.out/data/member.json
aws managedblockchain get-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --query 'Node' > cdk.out/data/node.json


echo "Downloading Amazon Managed Blockchain TLS certs"
export CA_CERT_FILE="$HOME/managedblockchain-tls-chain.pem"
aws s3 cp "s3://us-east-1.managedblockchain/etc/managedblockchain-tls-chain.pem" "$CA_CERT_FILE"


echo "Ledger data export completed successfully"
