// eslint-disable-next-line import/no-extraneous-dependencies
import 'source-map-support/register';
import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Lib } from '../lib';
import { DynamoDBPutItemIntegration } from '../lib/DynamoDBPutItemIntegration';

class AppStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const lib = new Lib(this, 'my-lib');

    const role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    lib.table.grantWriteData(role);

    const integration = new DynamoDBPutItemIntegration({
      table: lib.table,
      role,
    });

    const httpApi = new RestApi(this, 'RestApi');

    httpApi.root.addMethod('POST', integration);
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
