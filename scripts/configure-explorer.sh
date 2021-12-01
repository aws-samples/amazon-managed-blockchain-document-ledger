#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export FOUNDATION_STACK="FoundationStack"
export LEDGER_STACK="LedgerStack"

export NETWORK_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NetworkId`].OutputValue' --output text)
export MEMBER_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberId`].OutputValue' --output text)
export NODE_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NodeId`].OutputValue' --output text)

export MEMBER_NAME=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberName`].OutputValue' --output text)

export ORDERER_ENDPOINT=$(aws managedblockchain get-network --network-id $NETWORK_ID --query 'Network.FrameworkAttributes.Fabric.OrderingServiceEndpoint' --output text)
export CA_ENDPOINT=$(aws managedblockchain get-member --network-id $NETWORK_ID --member-id $MEMBER_ID --query 'Member.FrameworkAttributes.Fabric.CaEndpoint' --output text)
export PEER_ENDPOINT=$(aws managedblockchain get-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --query 'Node.FrameworkAttributes.Fabric.PeerEndpoint' --output text)


export ADMIN_PASSWORD_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`AdminPasswordArn`].OutputValue' --output text)
export ADMIN_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $ADMIN_PASSWORD_ARN --query 'SecretString' --output text)

export EXPLORER_PASSWORD_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`ExplorerAdminPasswordArn`].OutputValue' --output text)
export EXPLORER_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $EXPLORER_PASSWORD_ARN --query 'SecretString' --output text)


echo "Setting up connection to Hyperledger Fabric"
cp -R explorer "$HOME"
export CA_FILE="$HOME/managedblockchain-tls-chain.pem"
export EXPLORER_DIR="$HOME/explorer"
cp "$CA_FILE" "$EXPLORER_DIR"
export FABRIC_CONFIG="$EXPLORER_DIR/document-ledger.json"
files=( $HOME/fabric-admin-certs/keystore/* )
sed -i "s|%PRIVATE_KEY_FILENAME%|${files[0]}|g" $FABRIC_CONFIG
files=( $HOME/fabric-admin-certs/signcerts/* )
sed -i "s|%SIGNED_CERT_FILENAME%|${files[0]}|g" $FABRIC_CONFIG
sed -i "s|%CA_FILE%|$CA_FILE|g" $FABRIC_CONFIG
sed -i "s|%MEMBER_ID%|$MEMBER_ID|g" $FABRIC_CONFIG
sed -i "s|%ORDERER_ENDPOINT%|$ORDERER_ENDPOINT|g" $FABRIC_CONFIG
sed -i "s|%ORDERER_ENDPOINT_NO_PORT%|${ORDERER_ENDPOINT/:*/}|g" $FABRIC_CONFIG
sed -i "s|%CA_ENDPOINT%|$CA_ENDPOINT|g" $FABRIC_CONFIG
sed -i "s|%PEER_ENDPOINT%|$PEER_ENDPOINT|g" $FABRIC_CONFIG
sed -i "s|%PEER_ENDPOINT_NO_PORT%|${PEER_ENDPOINT/:*/}|g" $FABRIC_CONFIG
sed -i "s|%ADMIN_PASSWORD%|$ADMIN_PASSWORD|g" $FABRIC_CONFIG
sed -i "s|%EXPLORER_PASSWORD%|$EXPLORER_PASSWORD|g" $FABRIC_CONFIG


echo "Hyperledger Explorer configured successfully"
