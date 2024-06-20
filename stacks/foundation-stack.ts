// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as constructs from 'constructs';
import * as cdk from 'aws-cdk-lib'
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class FoundationStack extends cdk.Stack {

  constructor(scope: constructs.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    const tokenRequirements = {
      passwordLength: 32,
      requireEachIncludedType: true,
      excludeCharacters: '\'"/\\@&{}<>*|',
    };

    const passwordRequirements = {
      passwordLength: 32,
      requireEachIncludedType: true,
      excludeCharacters: '\'"/\\@&{}<>*|',
    };

    const databasePasswordRequirements = {
      passwordLength: 32,
      requireEachIncludedType: true,
      excludePunctuation: true,
    };

    const apiReaderToken = new secretsmanager.Secret(this, 'ApiReaderToken', {generateSecretString: tokenRequirements});
    const apiWriterToken = new secretsmanager.Secret(this, 'ApiWriterToken', {generateSecretString: tokenRequirements});

    const adminPasswordSecret = new secretsmanager.Secret(this, 'AdminPassword', {generateSecretString: passwordRequirements});

    const adminPrivateKeySecret = new secretsmanager.Secret(this, 'AdminPrivateKey');
    const adminSignedCertSecret = new secretsmanager.Secret(this, 'AdminSignedCert');

    const explorerAdminPassword = new secretsmanager.Secret(this, 'ExplorerAdminPassword', {generateSecretString: passwordRequirements})
    const explorerDatabasePassword = new secretsmanager.Secret(this, 'ExplorerDatabasePassword', {generateSecretString: databasePasswordRequirements})

    const domainName = process.env.LEDGER_DOMAIN_NAME || '';
    const domainZone = new r53.PublicHostedZone(this, 'HostedZone', {zoneName: domainName});

    new cdk.CfnOutput(this, 'ApiReaderTokenArn', {
      value: apiReaderToken.secretFullArn ? apiReaderToken.secretFullArn : apiReaderToken.secretArn,
      exportName: 'DocumentLedgerApiReaderTokenArn',
      description: 'Secret ARN for API reader token',
    });

    new cdk.CfnOutput(this, 'ApiWriterTokenArn', {
      value: apiWriterToken.secretFullArn || apiWriterToken.secretArn,
      exportName: 'DocumentLedgerApiWriterTokenArn',
      description: 'Secret ARN for API writer token',
    });

    new cdk.CfnOutput(this, 'AdminPasswordArn', {
      value: adminPasswordSecret.secretFullArn || adminPasswordSecret.secretArn,
      exportName: 'DocumentLedgerAdminPasswordArn',
      description: 'Secret ARN for ledger admin password',
    });

    new cdk.CfnOutput(this, 'AdminPrivateKeyArn', {
      value: adminPrivateKeySecret.secretFullArn || adminPrivateKeySecret.secretArn,
      exportName: 'DocumentLedgerAdminPrivateKeyArn',
      description: 'Secret ARN for ledger admin private key',
    });

    new cdk.CfnOutput(this, 'AdminSignedCertArn', {
      value: adminSignedCertSecret.secretFullArn || adminSignedCertSecret.secretArn,
      exportName: 'DocumentLedgerAdminSignedCertArn',
      description: 'Secret ARN for ledger admin signed certificate',
    });

    new cdk.CfnOutput(this, 'ExplorerAdminPasswordArn', {
      value: explorerAdminPassword.secretFullArn || explorerAdminPassword.secretArn,
      exportName: 'DocumentLedgerExplorerAdminPasswordArn',
      description: 'Secret ARN for explorer admin password',
    });

    new cdk.CfnOutput(this, 'ExplorerDatabasePasswordArn', {
      value: explorerDatabasePassword.secretFullArn || explorerDatabasePassword.secretArn,
      exportName: 'DocumentLedgerExplorerDatabasePasswordArn',
      description: 'Secret ARN for explorer database password',
    });

    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: domainZone.hostedZoneId,
      exportName: 'DocumentLedgerHostedZoneId',
      description: 'Hosted zone ID for the base domain',
    });

  }

}
