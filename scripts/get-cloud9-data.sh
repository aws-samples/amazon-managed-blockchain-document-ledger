#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

SECURITY_GROUP_NAME=$(curl -s http://169.254.169.254/latest/meta-data/security-groups)
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --group-name $SECURITY_GROUP_NAME --query SecurityGroups[*].GroupId --output text)


echo "Exporting Cloud9 data"
mkdir -p cdk.out/data
echo "{\"instanceId\": \"$INSTANCE_ID\", \"securityGroupId\": \"$SECURITY_GROUP_ID\"}" > cdk.out/data/cloud9.json


echo "Cloud9 data export completed successfully"
