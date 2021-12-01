#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export LEDGER_STACK="LedgerStack"

export NETWORK_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NetworkId`].OutputValue' --output text)
export MEMBER_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberId`].OutputValue' --output text)
export NODE_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NodeId`].OutputValue' --output text)


export ORDERER_ENDPOINT=$(aws managedblockchain get-network --network-id $NETWORK_ID --query 'Network.FrameworkAttributes.Fabric.OrderingServiceEndpoint' --output text)
export PEER_ENDPOINT=$(aws managedblockchain get-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --query 'Node.FrameworkAttributes.Fabric.PeerEndpoint' --output text)

export CHANNEL_NAME="documents"
export FABRIC_TOOLS_IMAGE="hyperledger/fabric-tools:1.2.0"


export CHAINCODE_VERSION="${1-v1}"
export CHAINCODE_NAME="documents"
echo "Installing chaincode $CHAINCODE_NAME $CHAINCODE_VERSION"
export CHAINCODE_DIR="$HOME/chaincode/$CHAINCODE_NAME"
cp -R "chaincode" "$HOME/"
docker run -v "$HOME:/opt/home" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/home/managedblockchain-tls-chain.pem" \
    -e "CORE_PEER_MSPCONFIGPATH=/opt/home/fabric-admin-certs" \
    -e "CORE_PEER_ADDRESS=$PEER_ENDPOINT" \
    -e "CORE_PEER_LOCALMSPID=$MEMBER_ID" \
    $FABRIC_TOOLS_IMAGE peer chaincode install -l node -n $CHAINCODE_NAME -v $CHAINCODE_VERSION -p "/opt/home/chaincode/$CHAINCODE_NAME"


if [[ $CHAINCODE_VERSION == "v1" ]]; then
  echo "Instantiating chaincode $CHAINCODE_NAME $CHAINCODE_VERSION"
  export CHAINCODE_COMMAND="instantiate"
else
  echo "Upgrading chaincode $CHAINCODE_NAME to $CHAINCODE_VERSION"
  export CHAINCODE_COMMAND="upgrade"
fi
docker run -v "$HOME:/opt/home" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/home/managedblockchain-tls-chain.pem" \
    -e "CORE_PEER_MSPCONFIGPATH=/opt/home/fabric-admin-certs" \
    -e "CORE_PEER_ADDRESS=$PEER_ENDPOINT" \
    -e "CORE_PEER_LOCALMSPID=$MEMBER_ID" \
    $FABRIC_TOOLS_IMAGE peer chaincode $CHAINCODE_COMMAND -o $ORDERER_ENDPOINT -C $CHANNEL_NAME -n $CHAINCODE_NAME -v $CHAINCODE_VERSION -c '{"Args":["init"]}' --cafile /opt/home/managedblockchain-tls-chain.pem --tls


echo "Chaincode configuration completed successfully"
