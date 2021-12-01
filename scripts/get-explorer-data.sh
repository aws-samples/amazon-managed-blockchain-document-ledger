#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export FOUNDATION_STACK="FoundationStack"
export EXPLORER_STACK="ExplorerStack"

export EXPLORER_URL=$(aws cloudformation describe-stacks --stack-name $EXPLORER_STACK --query 'Stacks[0].Outputs[?OutputKey==`ExplorerUrl`].OutputValue' --output text)

export EXPLORER_PASSWORD_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`ExplorerAdminPasswordArn`].OutputValue' --output text)
export EXPLORER_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $EXPLORER_PASSWORD_ARN --query 'SecretString' --output text)


echo "Hyperledger Explorer URL: $EXPLORER_URL"
echo "Hyperledger Login: admin // $EXPLORER_PASSWORD"
