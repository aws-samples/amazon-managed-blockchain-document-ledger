#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export DOCUMENT_ID="$1"

export FOUNDATION_STACK="FoundationStack"
export INTERFACE_STACK="InterfaceStack"

export API_ENDPOINT_URL=$(aws cloudformation describe-stacks --stack-name $INTERFACE_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpointUrl`].OutputValue' --output text)
export API_DOCUMENT_URL="${API_ENDPOINT_URL}/documents/$DOCUMENT_ID"

export API_READER_TOKEN_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiReaderTokenArn`].OutputValue' --output text)
export API_READER_TOKEN=$(aws secretsmanager get-secret-value --secret-id $API_READER_TOKEN_ARN --query 'SecretString' --output text)


echo "Getting document $DOCUMENT_ID from ledger"
curl -X GET --header "Authorization:$API_READER_TOKEN" "$API_DOCUMENT_URL"
echo
