#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export DOCUMENT_FILENAME="$1"

export DOCUMENT_CONTENT="$(cat "$DOCUMENT_FILENAME")"

export FOUNDATION_STACK="FoundationStack"
export INTERFACE_STACK="InterfaceStack"

export API_ENDPOINT_URL=$(aws cloudformation describe-stacks --stack-name $INTERFACE_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpointUrl`].OutputValue' --output text)
export API_DOCUMENTS_URL="${API_ENDPOINT_URL}/documents"

export API_WRITER_TOKEN_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiWriterTokenArn`].OutputValue' --output text)
export API_WRITER_TOKEN=$(aws secretsmanager get-secret-value --secret-id $API_WRITER_TOKEN_ARN --query 'SecretString' --output text)


echo "Writing content of $DOCUMENT_FILENAME to ledger"
curl -X POST --header "Authorization:$API_WRITER_TOKEN" --data "$DOCUMENT_CONTENT" "$API_DOCUMENTS_URL"
echo
