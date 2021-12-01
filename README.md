# Managed Blockchain Document Ledger

Code to deploy a complete Amazon Managed Blockchain solution that can write and
read documents to Hyperledger Fabric via API Gateway and Lambda interfaces, plus
Hyperledger Explorer for visualizing the blockchain network and its contents.


## Architecture

![Architecture Diagram](docs/architecture.png?raw=true "Architecture Diagram")


## Prerequisites

All the deployment steps below should be executed in a Cloud9 instance. See
[Getting started with AWS Cloud9](https://aws.amazon.com/cloud9/getting-started/)
for instructions on how to set one up. It is recommended to use an instance type of
`m5.large` for this instance, otherwise leave defaults can be left as-is.

Once the instance is created, open the IDE, and enter the following commands
in the terminal.

```bash
git clone https://github.com/aws-samples/amazon-managed-blockchain-document-ledger
cd amazon-managed-blockchain-document-ledger
```


## Deployment

### Initial Setup

```bash
export LEDGER_DOMAIN_NAME="ledger.example.com"
scripts/install-prerequisites.sh
scripts/get-cloud9-data.sh
```

### Foundation

```bash
cdk deploy FoundationStack
scripts/get-nameservers.sh
```

### Hyperledger Components

```bash
cdk deploy LedgerStack
scripts/get-ledger-data.sh
```

### Interface Components

```bash
scripts/configure-lambdas.sh
cdk deploy InterfaceStack
```

During the above phase, if a custom DNS hostname is being used, the deployment will wait
while verification is conducted. For this to occur, DNS delegation must be completed to
the `api` and `explorer` subdomains. Run `scripts/get-nameservers.sh` to view the
nameservers to delegate to for each domain.


### Hyperledger Configuration

```bash
scripts/configure-ledger.sh
scripts/configure-chaincode.sh
```

### Hyperledger Explorer

```bash
scripts/configure-explorer.sh
cdk deploy ExplorerStack
scripts/initialize-explorer.sh
```

Now click on Preview button in Cloud 9 IDE, and select Preview Running Application,
then pop out into new browser tab with icon in upper-right of preview panel.


## Testing

```bash
tests/get-documents.sh
tests/get-document.sh id
tests/post-document.sh path/to/document/file
tests/put-document.sh id path/to/document/file
tests/delete-document.sh id
```

If successful, the above returns a JSON document with a `documentId` unique
to this record (can be used to fetch it using the reader Lambda) and the
`transactionId` that stored the document on the blockchain.


## References

*  [Amazon Managed Blockchain](https://aws.amazon.com/managed-blockchain/)
*  [Hyperledger Fabric](https://hyperledger-fabric.readthedocs.io/)
*  [Smart Contracts](https://hyperledger-fabric.readthedocs.io/en/release-2.1/smartcontract/smartcontract.html)
*  [Fabric Chaincode Node](https://hyperledger.github.io/fabric-chaincode-node/)
*  [Node.js Fabric SDK](https://hyperledger.github.io/fabric-sdk-node/release-1.4/index.html)
*  [CouchDB Query Selectors](https://docs.couchdb.org/en/stable/api/database/find.html#find-selectors)


## Contributing

Pull requests are welcomed. Please review the [Contributing Guidelines](CONTRIBUTING.md)
and the [Code of Conduct](CODE_OF_CONDUCT.md).


## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.


## Authors

*  Jud Neer (judneer@amazon.com)


## License

This project is licensed under the MIT-0 License. See the [LICENSE](LICENSE) file for details.
