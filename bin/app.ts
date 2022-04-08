// eslint-disable-next-line import/no-extraneous-dependencies
import 'source-map-support/register';
import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Lib } from '../lib';
import { DynamoDBPutItemIntegration } from '../lib/DynamoDBPutItemIntegration';

/** Integration of the scheduling library */
class AppStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const schedulerLib = new Lib(this, 'scheduler-lib');

    const dynamoDbApiIntegrationRole = new Role(
      this,
      'DynamoDbApiIntegrationRole',
      {
        assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
      },
    );

    schedulerLib.schedulerTable.grantWriteData(dynamoDbApiIntegrationRole);

    const integration = new DynamoDBPutItemIntegration({
      table: schedulerLib.schedulerTable,
      dynamoDbApiIntegrationRole,
    });

    const httpApi = new RestApi(this, 'RestApi');

    httpApi.root.addMethod('POST', integration);
  }
}

const app = new App();
new AppStack(app, 'AppStack');
