#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export FOUNDATION_STACK="FoundationStack"
export INTERFACE_STACK="InterfaceStack"

export API_ENDPOINT_URL=$(aws cloudformation describe-stacks --stack-name $INTERFACE_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpointUrl`].OutputValue' --output text)
export API_DOCUMENTS_URL="${API_ENDPOINT_URL}/documents"

export API_READER_TOKEN_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiReaderTokenArn`].OutputValue' --output text)
export API_READER_TOKEN=$(aws secretsmanager get-secret-value --secret-id $API_READER_TOKEN_ARN --query 'SecretString' --output text)


echo "Getting all documents from ledger"
curl -X GET --header "Authorization:$API_READER_TOKEN" "$API_DOCUMENTS_URL"
echo
