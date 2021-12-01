#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export FOUNDATION_STACK="FoundationStack"

export HOSTED_ZONE_ID=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`HostedZoneId`].OutputValue' --output text)


echo
echo "Add the following nameservers to an NS record on the authoritative DNS for $LEDGER_DOMAIN_NAME:"
echo
NAME_SERVERS=$(aws route53 get-hosted-zone --id $HOSTED_ZONE_ID --query 'DelegationSet.NameServers' --output text)
for NAME_SERVER in $NAME_SERVERS; do
  echo "$NAME_SERVER."
done
echo
