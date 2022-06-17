// eslint-disable-next-line import/no-extraneous-dependencies
import 'source-map-support/register';
import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  JsonSchemaType,
  JsonSchemaVersion,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Scheduler } from 'cdk-scheduler';
import { DynamoDBPutItemIntegration } from './DynamoDBPutItemIntegration';

/** Integration of the scheduling library */
class ApiGatewayIntegrationStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const schedulerLib = new Scheduler(this, 'scheduler-lib', {});

    // Integration example to add a scheduled event with a REST API
    const dynamoDbApiIntegrationRole = new Role(
      this,
      'DynamoDbApiIntegrationRole',
      { assumedBy: new ServicePrincipal('apigateway.amazonaws.com') },
    );

    schedulerLib.schedulerTable.grantWriteData(dynamoDbApiIntegrationRole);

    const integration = new DynamoDBPutItemIntegration({
      partitionKey: schedulerLib.partitionKeyValue,
      table: schedulerLib.schedulerTable,
      role: dynamoDbApiIntegrationRole,
    });

    const restApi = new RestApi(this, 'RestApi');

    const addScheduledEventModel = restApi.addModel('AddScheduledEventModel', {
      contentType: 'application/json',
      modelName: 'AddScheduledEventModel',
      schema: {
        schema: JsonSchemaVersion.DRAFT4,
        type: JsonSchemaType.OBJECT,
        properties: {
          publicationTimestamp: { type: JsonSchemaType.NUMBER },
          id: { type: JsonSchemaType.STRING },
          payload: { type: JsonSchemaType.OBJECT },
        },
        required: ['publicationTimestamp'],
        additionalProperties: false,
      },
    });

    restApi.root.addMethod('POST', integration, {
      methodResponses: [{ statusCode: '200' }],
      requestModels: {
        'application/json': addScheduledEventModel,
      },
      requestValidatorOptions: {
        validateRequestBody: true,
        validateRequestParameters: true,
      },
      // authorizer: new RequestAuthorizer(stack, 'MyAuthorizer', {}),
    });

    // Integration example to listen to a scheduled event with a Lambda function
    const triggeredLambda = new Function(this, 'TriggeredFunction', {
      handler: 'index.main',
      code: Code.fromInline(
        'exports.main=(event)=>console.log(`Scheduled event received at ${new Date().toISOString()}:`,event);',
      ),
      runtime: Runtime.NODEJS_14_X,
    });
    const eventSource = new SqsEventSource(schedulerLib.schedulingQueue);
    triggeredLambda.addEventSource(eventSource);
  }
}

const app = new App();
new ApiGatewayIntegrationStack(app, 'ApiGatewayIntegrationStack');
