#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export DOCUMENT_ID="$1"

export FOUNDATION_STACK="FoundationStack"
export INTERFACE_STACK="InterfaceStack"

export API_ENDPOINT_URL=$(aws cloudformation describe-stacks --stack-name $INTERFACE_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpointUrl`].OutputValue' --output text)
export API_DOCUMENT_URL="${API_ENDPOINT_URL}/documents/$DOCUMENT_ID"

export API_WRITER_TOKEN_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiWriterTokenArn`].OutputValue' --output text)
export API_WRITER_TOKEN=$(aws secretsmanager get-secret-value --secret-id $API_WRITER_TOKEN_ARN --query 'SecretString' --output text)


echo "Marking document $DOCUMENT_ID as deleted"
curl -X DELETE --header "Authorization:$API_WRITER_TOKEN" "$API_DOCUMENT_URL"
echo
