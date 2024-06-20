#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


echo "Increasing Cloud9 storage"
export INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
export VOLUME_ID=$(aws ec2 describe-volumes --filters Name=attachment.instance-id,Values=$INSTANCE_ID --query Volumes[*].VolumeId --output text)
export VOLUME_SIZE=$(aws ec2 describe-volumes --volume-id $VOLUME_ID --query 'Volumes[*].Size' --output text)
if (( $VOLUME_SIZE < 50 )); then
  aws ec2 modify-volume --volume-id $VOLUME_ID --size 50
  sleep 10.0
  sudo growpart /dev/nvme0n1 1
  sudo xfs_growfs -d /
fi


echo "Installing OS packages"
sudo amazon-linux-extras enable postgresql14
sudo yum update && sudo yum install -y postgresql -y


echo "Installing latest CDK"
npm uninstall -g cdk
npm install -g aws-cdk


echo "Installing Node dependencies"
npm install


echo "Pulling Hyperledger tools docker images"
docker pull hyperledger/fabric-ca:1.4.9
docker pull hyperledger/fabric-tools:1.2.0


echo "Creating dummy CDK data files"
mkdir -p "cdk.out/data"
[[ ! -f "cdk.out/data/cloud9.json" ]] && echo '{"instanceId":"","securityGroupId":""}' > "cdk.out/data/cloud9.json"
[[ ! -f "cdk.out/data/network.json" ]] && echo '{"FrameworkAttributes":{"Fabric":{"OrderingServiceEndpoint":""}},"VpcEndpointServiceName":""}' > "cdk.out/data/network.json"
[[ ! -f "cdk.out/data/member.json" ]] && echo '{"Id":"","Name":"","FrameworkAttributes":{"Fabric":{"CaEndpoint":"","PeerEndpoint":""}}}' > "cdk.out/data/member.json"
[[ ! -f "cdk.out/data/node.json" ]] && echo '{"FrameworkAttributes":{"Fabric":{"PeerEndpoint":"","PeerEventEndpoint":""}}}' > "cdk.out/data/node.json"
mkdir -p "$HOME/explorer"
touch "$HOME/explorer/Dockerfile"

echo "Bootstrapping CDK"
cdk bootstrap


echo "Prerequisites successfully installed"
