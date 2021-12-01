#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


echo "WARNING: This will completely destroy the entire solution. Enter YES to continue."
read CONFIRMATION
if [[ $CONFIRATION != YES ]]; then
  exit
fi


echo "Deleting certificate validation records"
HOSTED_ZONES=$(aws route53 list-hosted-zones --query 'HostedZones[*].Id' --output text)
for ZONE_ID in $HOSTED_ZONES; do
  CNAME_RECORD_SET=$(aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID --query "ResourceRecordSets[?Type=='CNAME']|[0]")
  if [[ $CNAME_RECORD_SET != null ]]; then
    aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch "{\"Changes\": [{\"Action\": \"DELETE\", \"ResourceRecordSet\": $CNAME_RECORD_SET}]}"
  fi
done


echo "Deleting infrastructure stacks"
cdk destroy -f ExplorerStack
cdk destroy -f InterfaceStack
cdk destroy -f LedgerStack
cdk destroy -f FoundationStack


echo "Cleaning up temporary files"
rm -rf "$HOME/chaincode"
rm -rf "$HOME/configtx.yaml"
rm -rf "$HOME/documents.block"
rm -rf "$HOME/documents.pb"
rm -rf "$HOME/explorer"
rm -rf "$HOME/fabric-admin-certs"
rm -rf "$HOME/managedblockchain-tls-chain.pem"


echo "Reseting respository"
git clean -f -d -x


echo "Document ledger cleanup complete"
