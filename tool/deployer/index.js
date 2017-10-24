const async = require('async');
const AWS = require('aws-sdk');

AWS.config.update({region: 'us-east-1'});

// Load credentials and set region from JSON file
// AWS.config.loadFromPath('./config.json');

// const userData = `
// #cloud-config
// apt_upgrade: true
// runcmd:
//  - timedatectl set-timezone America/New_York
//  - curl -sL https://deb.nodesource.com/setup_6.x | bash -
//  - apt-get install -y nodejs build-essential libkrb5-dev ntp python htop git s3cmd parallel
//  - curl -sL https://gist.githubusercontent.com/mattcollier/21b8b0a26a3c7cca7f8af2faabdb152a/raw/eb35ee78764946cdb37ac1fd75c0a2eae1a0dc7a/mongo.sh | bash -
//  - curl -sL https://gist.githubusercontent.com/mattcollier/f4eebff1937b37b585519c0944817553/raw/df7c37824e5262cd64b6b9310fb44421a51a9101/enable_mongo.sh | bash -
//  - curl -O https://gist.githubusercontent.com/mattcollier/55e976a4a196756682feb99daf41b5a0/raw/mongo-config.js
//  - sleep 5
//  - mongo mongo-config.js
//  - git clone https://github.com/digitalbazaar/bedrock-ledger-test.git
//  - cd bedrock-ledger-test
//  - npm install
//  `;
const userData = `
#cloud-config
runcmd:
 - git clone https://github.com/digitalbazaar/bedrock-examples.git
 - cd bedrock-examples/angular-aws-ec2
 - git checkout basicMaterial
 - npm install
 - node ./lib/index.js optimize
# - node ./lib/index.js --minify true >/dev/null 2>&1
 - node ./lib/index.js --minify true
 `;

// Create EC2 service object
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});
const elb = new AWS.ELBv2({apiVersion: '2015-12-01'});

const ec2Params = {
  // ImageId: 'ami-cd0f5cb6', // amazon default ubuntu 16.04
  ImageId: 'ami-69cb0913', // node, mongo base
  InstanceType: 't2.small',
  KeyName: 'aws-personal',
  IamInstanceProfile: {
    Arn: 'arn:aws:iam::526237877329:instance-profile/bedrock-ledger-node'
  },
  MinCount: 1,
  MaxCount: 1,
  // a security group designed for VPC access only
  SecurityGroupIds: ['sg-5e65112c'],
  SubnetId: 'subnet-60c3b105',
  UserData: Buffer.from(userData).toString('base64')
};

let instanceId;
const TargetGroupArn = 'arn:aws:elasticloadbalancing:us-east-1:526237877329:' +
  'targetgroup/secure-backend/2205344806e1d7a7';
async.auto({
  ec2: callback => ec2.runInstances(ec2Params, callback),
  tag: ['ec2', (results, callback) => {
    instanceId = results.ec2.Instances[0].InstanceId;
    console.log("Created instance", instanceId);
    // Add tags to the instance
    const params = {Resources: [instanceId], Tags: [{
      Key: 'Name',
      Value: 'Primary'
    }]};
    ec2.createTags(params, err => {
      console.log("Tagging instance", err ? "failure" : "success");
      callback(err);
    });
  }],
  instanceOk: ['ec2', (results, callback) => {
    const params = {
      InstanceIds: [instanceId]
    };
    console.log('Waiting for instance to come online...');
    ec2.waitFor('instanceStatusOk', params, (err, data) => {
      if(err) {
        return callback(err);
      }
      console.log('Instance Ready:', JSON.stringify(data, null, 2));
      callback();
    });
  }],
  target: ['instanceOk', (results, callback) => {
    const params = {
      TargetGroupArn,
      Targets: [{Id: instanceId}]
    };
    elb.registerTargets(params, callback);
  }],
  targetInService: ['target', (results, callback) => {
    const params = {
      TargetGroupArn,
      Targets: [{Id: instanceId}]
    };
    console.log('Waiting for target to come online...');
    elb.waitFor('targetInService', params, (err, data) => {
      if(err) {
        return callback(err);
      }
      console.log('Target Online:', JSON.stringify(data, null, 2));
      callback();
    });
  }]
}, err => {
  if(err) {
    console.error(err);
    return;
  }
  console.log('Success.');
});
