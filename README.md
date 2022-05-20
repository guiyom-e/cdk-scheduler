# cdk-scheduler

> A CDK construct to schedule events precisely ⏱

This construct enables you to trigger an event at a given time on a serverless architecture.

You should use cdk-scheduler if you need to trigger an event at a precise time (down to the second) on your AWS application.

## Install

To install with npm:

```
npm install cdk-scheduler
```

To install with yarn:

```
yarn add cdk-scheduler
```

## Usage

`cdk-scheduler` is powered by SQS feature to delay events up to 15 minutes. A lambda is scheduled to query a DynamoDB Table every 15 minutes, it pushes every events scheduled in the next 15 minutes to SQS with a delay corresponding the desired publication date.

![architecture: dynamoDB with scheduled event / lambda scheduled every 15 minutes / publishes to SQS with delay](./docs/images/Architecture%20Scheduler.jpg)

### Usage example with CDK - Typescript

You can check out the full implementation example in [app.ts](./bin/app.ts).

```ts
import { Scheduler } from 'cdk-scheduler';

class AppStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create Scheduler Construct
    const schedulerLib = new Scheduler(this, 'scheduler-lib');

    // Grant writing role to Dynamo DB to your service that will
    const dynamoDbApiIntegrationRole = new Role(
      this,
      'DynamoDbApiIntegrationRole',
      { assumedBy: new ServicePrincipal('apigateway.amazonaws.com') },
    );

    schedulerLib.schedulerTable.grantWriteData(dynamoDbApiIntegrationRole);

    // Add an integration tool such as Dynamo integration or Lambda
    const integration = new DynamoDBPutItemIntegration({
      partitionKey: schedulerLib.partitionKeyValue,
      table: schedulerLib.schedulerTable,
      role: dynamoDbApiIntegrationRole,
    });

    const restApi = new RestApi(this, 'RestApi');

    const addScheduledEventModel = restApi.addModel('AddScheduledEventModel', {
        ...
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
  }
}

const app = new App();
new AppStack(app, 'AppStack');
```

For the scheduler to function properly the elements added to DynamoDB must have the following attributes:

| Attribute | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pk`      | string | The primary key is always the same. Its value is the attribute `partitionKey` available in the construct instance                                                                                                                                                                                                                                                                            |
| `sk`      | string | The secondary key should start with the timestamp at which you wish to publish the event. You can concatenate with a unique id to be sure you do not have duplicates if you separate them with a `#`. For instance: ✅ `1649434680000#d66727f2-9df7-41b7-b2f8-211eb5581640` is a correct secondary key. ❌ `20220422-16:47:00:00Z00#66727f2-9df7-41b7-b2f8-211eb5581640` will never be read. |
| `payload` | map    | This is an object, without format contraints. This payload will be sent in the event once it's published. Use this to detail the action you want to execute a the scheduled time                                                                                                                                                                                                               |
