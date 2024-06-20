// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as path from 'path';

import * as constructs from 'constructs';
import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as r53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';


import networkData from '../cdk.out/data/network.json';
import memberData from '../cdk.out/data/member.json';
import nodeData from '../cdk.out/data/node.json';
import cloud9Data from '../cdk.out/data/cloud9.json';

export class InterfaceStack extends cdk.Stack {

  constructor(scope: constructs.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    const domainName = `api.${process.env.LEDGER_DOMAIN_NAME}`;
    const domainZone = new r53.PublicHostedZone(this, 'HostedZone', {zoneName: domainName});
    const baseZone = r53.PublicHostedZone.fromHostedZoneAttributes(this, 'BaseZone', {
      hostedZoneId: cdk.Fn.importValue('DocumentLedgerHostedZoneId'),
      zoneName: process.env.LEDGER_DOMAIN_NAME || '',
    });
    new r53.NsRecord(this, 'DelegationRecord', {
      zone: baseZone,
      recordName: 'api',
      values: domainZone.hostedZoneNameServers || [],
    });

    const validation = cm.CertificateValidation.fromDns(domainZone);
    const certificate = new cm.Certificate(this, 'Certificate', {domainName, validation});

    const apiVpc = new ec2.Vpc(this, 'ApiVpc', {
      subnetConfiguration: [{name: 'Lambdas', subnetType: ec2.SubnetType.PRIVATE_ISOLATED}],
    });

    const apiReaderTokenArn = cdk.Fn.importValue('DocumentLedgerApiReaderTokenArn');
    const apiWriterTokenArn = cdk.Fn.importValue('DocumentLedgerApiWriterTokenArn');
    const apiReaderToken = secretsmanager.Secret.fromSecretAttributes(this, 'ApiReaderToken', {secretCompleteArn: apiReaderTokenArn});
    const apiWriterToken = secretsmanager.Secret.fromSecretAttributes(this, 'ApiWriterToken', {secretCompleteArn: apiWriterTokenArn});

    const adminPrivateKeyArn = cdk.Fn.importValue('DocumentLedgerAdminPrivateKeyArn');
    const adminSignedCertArn = cdk.Fn.importValue('DocumentLedgerAdminSignedCertArn');
    const adminPrivateKey = secretsmanager.Secret.fromSecretAttributes(this, 'AdminPrivateKey', {secretCompleteArn: adminPrivateKeyArn});
    const adminSignedCert = secretsmanager.Secret.fromSecretAttributes(this, 'AdminSignedCert', {secretCompleteArn: adminSignedCertArn});

    const api = new apigateway.RestApi(this, 'Api', {domainName: {domainName, certificate, securityPolicy: apigateway.SecurityPolicy.TLS_1_2}});

    new r53.ARecord(this, 'ApiDomainRecord', {
      zone: domainZone,
      target: r53.RecordTarget.fromAlias(new r53Targets.ApiGateway(api)),
    });

    const authorizerFunction = new lambda.Function(this, 'ApiAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.AssetCode.fromAsset(path.join(__dirname, '../lambdas/authorizer')),
      handler: 'index.handler',
      environment: {
        BASE_METHOD_ARN: `arn:aws:execute-api:${region}:${account}:${api.restApiId}`,
        READER_SECRET_ARN: apiReaderTokenArn,
        WRITER_SECRET_ARN: apiWriterTokenArn,
      },
    });

    apiReaderToken.grantRead(authorizerFunction);
    apiWriterToken.grantRead(authorizerFunction);

    const apiLambdaLayer = new lambda.LayerVersion(this, 'ApiLambdaLayer', {
      compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/layer')),
    });

    const readerFunction = new lambda.Function(this, 'ApiReaderFunction', {
      vpc: apiVpc,
      vpcSubnets: {subnets: apiVpc.isolatedSubnets},
      memorySize: 256,
      timeout: cdk.Duration.seconds(10.0),
      runtime: lambda.Runtime.NODEJS_16_X,
      layers: [apiLambdaLayer],
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/reader')),
      handler: 'index.handler',
      environment: {
        PRIVATE_KEY_ARN: adminPrivateKeyArn,
        SIGNED_CERT_ARN: adminSignedCertArn,
        MEMBER_ID: memberData.Id,
        ORDERER_ENDPOINT: networkData.FrameworkAttributes.Fabric.OrderingServiceEndpoint,
        CA_ENDPOINT: memberData.FrameworkAttributes.Fabric.CaEndpoint,
        PEER_ENDPOINT: nodeData.FrameworkAttributes.Fabric.PeerEndpoint,
        CHANNEL_NAME: 'documents',
        CHAINCODE_NAME: 'documents',
      },
    });

    const writerFunction = new lambda.Function(this, 'ApiWriterFunction', {
      vpc: apiVpc,
      vpcSubnets: {subnets: apiVpc.isolatedSubnets},
      memorySize: 256,
      timeout: cdk.Duration.seconds(10.0),
      runtime: lambda.Runtime.NODEJS_16_X,
      layers: [apiLambdaLayer],
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/writer')),
      handler: 'index.handler',
      environment: {
        PRIVATE_KEY_ARN: adminPrivateKeyArn,
        SIGNED_CERT_ARN: adminSignedCertArn,
        MEMBER_ID: memberData.Id,
        ORDERER_ENDPOINT: networkData.FrameworkAttributes.Fabric.OrderingServiceEndpoint,
        CA_ENDPOINT: memberData.FrameworkAttributes.Fabric.CaEndpoint,
        PEER_ENDPOINT: nodeData.FrameworkAttributes.Fabric.PeerEndpoint,
        CHANNEL_NAME: 'documents',
        CHAINCODE_NAME: 'documents',
      },
    });

    adminPrivateKey.grantRead(readerFunction);
    adminPrivateKey.grantRead(writerFunction);
    adminSignedCert.grantRead(readerFunction);
    adminSignedCert.grantRead(writerFunction);

    const secretsManagerVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
      vpc: apiVpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });
    secretsManagerVpcEndpoint.connections.allowDefaultPortFrom(readerFunction);
    secretsManagerVpcEndpoint.connections.allowDefaultPortFrom(writerFunction);

    const ledgerPortRange = ec2.Port.tcpRange(30001, 30004);
    const ledgerVpcEndpointName = networkData.VpcEndpointServiceName.replace(`com.amazonaws.${region}.`, '')
    const apiVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'LedgerEndpoint', {
      vpc: apiVpc,
      service: new ec2.InterfaceVpcEndpointAwsService(ledgerVpcEndpointName),
      open: false,
    });
    apiVpcEndpoint.connections.allowFrom(readerFunction, ledgerPortRange);
    apiVpcEndpoint.connections.allowFrom(writerFunction, ledgerPortRange);

    const authorizer = new apigateway.TokenAuthorizer(this, 'TokenAuthorizer', {handler: authorizerFunction});
    const reader = new apigateway.LambdaIntegration(readerFunction);
    const writer = new apigateway.LambdaIntegration(writerFunction);
    const documents = api.root.addResource('documents');
    documents.addMethod('GET', reader, {authorizer});
    documents.addMethod('POST', writer, {authorizer});
    const document = documents.addResource('{document_id}');
    document.addMethod('GET', reader, {authorizer});
    document.addMethod('PUT', writer, {authorizer});
    document.addMethod('DELETE', writer, {authorizer});

    const cloud9SecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'Cloud9SecurityGroup', cloud9Data.securityGroupId);
    const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {isDefault: true});
    const defaultVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'DefaultVpcEndpoint', {
      vpc: defaultVpc,
      service: new ec2.InterfaceVpcEndpointAwsService(ledgerVpcEndpointName),
      open: false,
    });
    defaultVpcEndpoint.connections.allowFrom(cloud9SecurityGroup, ledgerPortRange);

    new cdk.CfnOutput(this, 'DefaultVpcEndpointSecurityGroup', {
      value: defaultVpcEndpoint.connections.securityGroups[0].securityGroupId,
      exportName: 'DocumentLedgerDefaultVpcEndpointSecurityGroup',
      description: 'Security group associated with the VPC endpoint used to connect to the ledger',
    });

    new cdk.CfnOutput(this, 'ApiEndpointUrl', {
      value: `https://${domainName}`,
      description: 'API Gateway endpoint URL',
    });

  }

}
