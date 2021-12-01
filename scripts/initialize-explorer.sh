#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export FOUNDATION_STACK="FoundationStack"
export EXPLORER_STACK="ExplorerStack"

export EXPLORER_IMAGE=$(aws cloudformation describe-stacks --stack-name $EXPLORER_STACK --query 'Stacks[0].Outputs[?OutputKey==`ExplorerImageUri`].OutputValue' --output text)
export DB_HOSTNAME=$(aws cloudformation describe-stacks --stack-name $EXPLORER_STACK --query 'Stacks[0].Outputs[?OutputKey==`DatabaseHostname`].OutputValue' --output text)

export DB_PASSWORD_ARN=$(aws cloudformation describe-stacks --stack-name $FOUNDATION_STACK --query 'Stacks[0].Outputs[?OutputKey==`ExplorerDatabasePasswordArn`].OutputValue' --output text)
export DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $DB_PASSWORD_ARN --query 'SecretString' --output text)


echo "Setting up database schema"
docker run --rm --entrypoint /bin/cat "$EXPLORER_IMAGE" "/opt/explorer/app/persistence/fabric/postgreSQL/db/explorerpg.sql" > "$HOME/explorer/explorerpg.sql"
docker run --rm --entrypoint /bin/cat "$EXPLORER_IMAGE" "/opt/explorer/app/persistence/fabric/postgreSQL/db/updatepg.sql" > "$HOME/explorer/updatepg.sql"
export PGPASSWORD="$DB_PASSWORD"
psql -X -h $DB_HOSTNAME --username=explorer -v dbname=fabricexplorer -v user=explorer -v passwd=\'$DB_PASSWORD\' -f "$HOME/explorer/explorerpg.sql" postgres
psql -X -h $DB_HOSTNAME --username=explorer -v dbname=fabricexplorer -v user=explorer -v passwd=\'$DB_PASSWORD\' -f "$HOME/explorer/updatepg.sql" postgres


echo "Hyperledger Explorer initialized successfully"
