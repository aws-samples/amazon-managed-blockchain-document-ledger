#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export LEDGER_DOMAIN_NAME="$1"


scripts/install-prerequisites.sh
scripts/get-cloud9-data.sh

cdk deploy --require-approval never FoundationStack
scripts/get-nameservers.sh
echo "Press any key to continue"
read -rsn 1

cdk deploy --require-approval never LedgerStack
scripts/get-ledger-data.sh

scripts/configure-lambdas.sh
cdk deploy --require-approval never InterfaceStack

scripts/configure-ledger.sh
scripts/configure-chaincode.sh

scripts/configure-explorer.sh
cdk deploy --require-approval never ExplorerStack
scripts/initialize-explorer.sh
scripts/get-explorer-data.sh


echo "Document ledger deployment complete"
