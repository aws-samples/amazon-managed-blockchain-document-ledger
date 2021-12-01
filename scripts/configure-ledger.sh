#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export FOUNDATION_STACK="FoundationStack"
export LEDGER_STACK="LedgerStack"

export NETWORK_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NetworkId`].OutputValue' --output text)
export MEMBER_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberId`].OutputValue' --output text)
export NODE_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NodeId`].OutputValue' --output text)


echo "Turning on all Amazon Managed Blockchain logging"
aws managedblockchain update-member --network-id $NETWORK_ID --member-id $MEMBER_ID --log-publishing-configuration '{"Fabric":{"CaLogs":{"Cloudwatch":{"Enabled":true}}}}'
aws managedblockchain update-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --log-publishing-configuration '{"Fabric":{"ChaincodeLogs":{"Cloudwatch":{"Enabled":true}},"PeerLogs":{"Cloudwatch":{"Enabled":true}}}}'


echo "Setting up admin identity"
export CA_CERT_FILE="$HOME/managedblockchain-tls-chain.pem"
export CA_ENDPOINT=$(aws managedblockchain get-member --network-id $NETWORK_ID --member-id $MEMBER_ID --query 'Member.FrameworkAttributes.Fabric.CaEndpoint' --output text)
export ADMIN_PASSWORD_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`AdminPasswordArn`].OutputValue' --output text)
export ADMIN_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $ADMIN_PASSWORD_ARN --query 'SecretString' --output text)
export ENCODED_ADMIN_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$ADMIN_PASSWORD'''))")
export CA_ADMIN_FULL_URL="https://admin:$ENCODED_ADMIN_PASSWORD@$CA_ENDPOINT"
export FABRIC_CA_IMAGE="hyperledger/fabric-ca:1.4.9"
export ADMIN_CERTS_DIR="$HOME/fabric-admin-certs"
docker run -v "$HOME:$HOME" "$FABRIC_CA_IMAGE" fabric-ca-client enroll -u "$CA_ADMIN_FULL_URL" --tls.certfiles "$CA_CERT_FILE" -M "$ADMIN_CERTS_DIR"
sudo chown -R $USER: $ADMIN_CERTS_DIR
mkdir -p $ADMIN_CERTS_DIR/admincerts
cp $ADMIN_CERTS_DIR/signcerts/* $ADMIN_CERTS_DIR/admincerts/

echo "Writing admin certs to Secrets Manager"
export ADMIN_PRIVATE_KEY_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`AdminPrivateKeyArn`].OutputValue' --output text)
export ADMIN_SIGNED_CERT_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`AdminSignedCertArn`].OutputValue' --output text)
aws secretsmanager put-secret-value --secret-id $ADMIN_PRIVATE_KEY_ARN --secret-string "`cat $ADMIN_CERTS_DIR/keystore/*`"
aws secretsmanager put-secret-value --secret-id $ADMIN_SIGNED_CERT_ARN --secret-string "`cat $ADMIN_CERTS_DIR/signcerts/*`"


echo "Generating configtx channel configuration"
export CHANNEL_NAME="documents"
cp "fabric/configtx.yaml" "$HOME/"
sed -i "s|%MEMBER_ID%|$MEMBER_ID|g" "$HOME/configtx.yaml"
export FABRIC_TOOLS_IMAGE="hyperledger/fabric-tools:1.2.0"
docker run -v "$HOME:/opt/home" $FABRIC_TOOLS_IMAGE configtxgen -outputCreateChannelTx /opt/home/$CHANNEL_NAME.pb -profile OneOrgChannel -channelID $CHANNEL_NAME --configPath /opt/home/

echo "Waiting 3 minutes for configuration to settle before proceeding"
sleep 180.0

echo "Creating channel"
export ORDERER_ENDPOINT=$(aws managedblockchain get-network --network-id $NETWORK_ID --query 'Network.FrameworkAttributes.Fabric.OrderingServiceEndpoint' --output text)
export PEER_ENDPOINT=$(aws managedblockchain get-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --query 'Node.FrameworkAttributes.Fabric.PeerEndpoint' --output text)
docker run -v "$HOME:/opt/home" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/home/managedblockchain-tls-chain.pem" \
    -e "CORE_PEER_MSPCONFIGPATH=/opt/home/fabric-admin-certs" \
    -e "CORE_PEER_ADDRESS=$PEER_ENDPOINT" \
    -e "CORE_PEER_LOCALMSPID=$MEMBER_ID" \
    $FABRIC_TOOLS_IMAGE peer channel create -c $CHANNEL_NAME -f /opt/home/$CHANNEL_NAME.pb -o $ORDERER_ENDPOINT --cafile /opt/home/managedblockchain-tls-chain.pem --tls --timeout 900s

echo "Extracting channel block"
docker run -v "$HOME:/opt/home" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/home/managedblockchain-tls-chain.pem" \
    -e "CORE_PEER_MSPCONFIGPATH=/opt/home/fabric-admin-certs" \
    -e "CORE_PEER_ADDRESS=$PEER_ENDPOINT" \
    -e "CORE_PEER_LOCALMSPID=$MEMBER_ID" \
    $FABRIC_TOOLS_IMAGE peer channel fetch oldest /opt/home/$CHANNEL_NAME.block -c $CHANNEL_NAME -o $ORDERER_ENDPOINT --cafile /opt/home/managedblockchain-tls-chain.pem --tls

echo "Joining peer to channel"
docker run -v "$HOME:/opt/home" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/home/managedblockchain-tls-chain.pem" \
    -e "CORE_PEER_MSPCONFIGPATH=/opt/home/fabric-admin-certs" \
    -e "CORE_PEER_ADDRESS=$PEER_ENDPOINT" \
    -e "CORE_PEER_LOCALMSPID=$MEMBER_ID" \
    $FABRIC_TOOLS_IMAGE peer channel join -b /opt/home/$CHANNEL_NAME.block -o $ORDERER_ENDPOINT --cafile /opt/home/managedblockchain-tls-chain.pem --tls


echo "Ledger configuration completed successfully"
