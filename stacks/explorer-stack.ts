// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as os from 'os';

import * as constructs from 'constructs';
import * as cdk from 'aws-cdk-lib'
import * as cm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import cloud9Data from '../cdk.out/data/cloud9.json';

export class ExplorerStack extends cdk.Stack {

  constructor(scope: constructs.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    const availabilityZones =  cdk.Stack.of(this).availabilityZones;

    const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {isDefault: true});

    const databaseSubnets = [
      new ec2.Subnet(this, 'DatabaseSubnet0', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.160.0/20',
        availabilityZone: availabilityZones[0],
      }),
      new ec2.Subnet(this, 'DatabaseSubnet1', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.176.0/20',
        availabilityZone: availabilityZones[1],
      }),
      new ec2.Subnet(this, 'DatabaseSubnet2', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.192.0/20',
        availabilityZone: availabilityZones[3],
      }),
    ];

    const databaseUsername = 'explorer';
    const databasePasswordSecret = secretsmanager.Secret.fromSecretAttributes(this, 'DatabasePassword', {
      secretCompleteArn: cdk.Fn.importValue('DocumentLedgerExplorerDatabasePasswordArn'),
    });

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({version: rds.PostgresEngineVersion.VER_14_1}),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
      vpc: defaultVpc,
      vpcSubnets: {subnets: databaseSubnets},
      publiclyAccessible: false,
      credentials: rds.Credentials.fromPassword(databaseUsername, databasePasswordSecret.secretValue),
    });

    const cloud9SecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'Cloud9SecurityGroup', cloud9Data.securityGroupId);
    database.connections.allowDefaultPortFrom(cloud9SecurityGroup);

    const imageDirectory = `${os.homedir()}/explorer`;
    const imageAsset = new ecrAssets.DockerImageAsset(this, 'Image', {directory: imageDirectory});
    const image = ecs.ContainerImage.fromDockerImageAsset(imageAsset);

    const domainName = `explorer.${process.env.LEDGER_DOMAIN_NAME}`;
    const domainZone = new r53.PublicHostedZone(this, 'HostedZone', {zoneName: domainName});
    const baseZone = r53.PublicHostedZone.fromHostedZoneAttributes(this, 'BaseZone', {
      hostedZoneId: cdk.Fn.importValue('DocumentLedgerHostedZoneId'),
      zoneName: process.env.LEDGER_DOMAIN_NAME || '',
    });
    new r53.NsRecord(this, 'DelegationRecord', {
      zone: baseZone,
      recordName: 'explorer',
      values: domainZone.hostedZoneNameServers || [],
    });

    const validation = cm.CertificateValidation.fromDns(domainZone);
    const certificate = new cm.Certificate(this, 'Certificate', {domainName, validation});

    const serviceSubnets = [
      new ec2.Subnet(this, 'ServiceSubnet0', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.208.0/20',
        availabilityZone: availabilityZones[0],
      }),
      new ec2.Subnet(this, 'ServiceSubnet1', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.224.0/20',
        availabilityZone: availabilityZones[1],
      }),
      new ec2.Subnet(this, 'ServiceSubnet2', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.240.0/20',
        availabilityZone: availabilityZones[2],
      }),
    ];

    const cluster = new ecs.Cluster(this, 'Cluster', {vpc: defaultVpc});

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      certificate,
      domainName,
      domainZone,
      protocol: elb.ApplicationProtocol.HTTPS,
      redirectHTTP: true,
      taskSubnets: {subnets: serviceSubnets},
      taskImageOptions: {
        image,
        containerPort: 8080,
        environment: {
          DATABASE_HOST: database.instanceEndpoint.hostname,
          DATABASE_USERNAME: databaseUsername,
          DATABASE_PASSWD: databasePasswordSecret.secretValue.toString(),
          LOG_LEVEL_APP: 'debug',
          LOG_LEVEL_DB: 'debug',
          LOG_LEVEL_CONSOLE: 'debug',
          LOG_CONSOLE_STDOUT: 'true',
          DISCOVERY_AS_LOCALHOST: 'false',
        },
      },
    });

    database.connections.allowDefaultPortFrom(service.service);

    const ledgerPortRange = ec2.Port.tcpRange(30001, 30004);
    const ledgerSecurityGroupId = cdk.Fn.importValue('DocumentLedgerDefaultVpcEndpointSecurityGroup');
    const ledgerSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'DefaultVpcEndpointSecurityGroup', ledgerSecurityGroupId);
    ledgerSecurityGroup.connections.allowFrom(service.service, ledgerPortRange);

    const cloudWatchLogsVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'CloudWatchLogsEndpoint', {
      vpc: defaultVpc,
      subnets: {subnets: serviceSubnets},
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    });
    cloudWatchLogsVpcEndpoint.connections.allowDefaultPortFrom(cluster);

    const ecrVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'EcrEndpoint', {
      vpc: defaultVpc,
      subnets: {subnets: serviceSubnets},
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
    });
    ecrVpcEndpoint.connections.allowDefaultPortFrom(cluster);

    const ecrDockerVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'EcrDockerEndpoint', {
      vpc: defaultVpc,
      subnets: {subnets: serviceSubnets},
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    });
    ecrDockerVpcEndpoint.connections.allowDefaultPortFrom(cluster);

    new ec2.GatewayVpcEndpoint(this, 'S3Endpoint', {
      vpc: defaultVpc,
      subnets: [{subnets: serviceSubnets}],
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    new cdk.CfnOutput(this, 'ExplorerImageUri', {
      value: imageAsset.imageUri,
      description: 'Explorer Docker image URI',
    });

    new cdk.CfnOutput(this, 'DatabaseHostname', {
      value: database.instanceEndpoint.hostname,
      description: 'Database hostname',
    });

    new cdk.CfnOutput(this, 'ExplorerUrl', {
      value: `https://${domainName}`,
      description: 'Explorer user interface URL',
    });

  }

}
