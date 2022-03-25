#!/usr/bin/env node
// eslint-disable-next-line import/no-extraneous-dependencies
import 'source-map-support/register';
import { Stack, App } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Lib } from '../lib';

class AppStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new Lib(this, 'my-lib');
  }
}

const app = new App();
new AppStack(app, 'AppStack');

//   , {
//   /* If you don't specify 'env', this stack will be environment-agnostic.
//    * Account/Region-dependent features and context lookups will not work,
//    * but a single synthesized template can be deployed anywhere. */

//   /* Uncomment the next line to specialize this stack for the AWS Account
//    * and Region that are implied by the current CLI configuration. */
//   // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

//   /* Uncomment the next line if you know exactly what Account and Region you
//    * want to deploy the stack to. */
//   // env: { account: '123456789012', region: 'us-east-1' },

//   /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
// });
