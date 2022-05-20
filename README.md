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

### Understand how the Scheduler works

`cdk-scheduler` is powered by SQS feature to delay events up to 15 minutes.

A lambda is scheduled to query a DynamoDB Table every 15 minutes, it pushes every events scheduled in the next 15 minutes to SQS with a delay corresponding the desired publication date.

### Import and initialize Scheduler

Import the scheduler with :

```ts
import { Scheduler } from 'cdk-scheduler';
```

Then instantiate the scheduler :

```ts
const myScheduler = new Scheduler(app, id);
```

- `app` : Your CDK app (a `Construct`)
- `id` : The id/name of your scheduler (a `string`)

### Write messages to the scheduler

Grant access to write a new message to the scheduler to the service(s) that will write to it. For example an API Integration or a lambda function :

```ts
myScheduler.schedulerTable.grantWriteData(newMessageLambda);
```

Then you can post new messages to the scheduler by inset a new row into the `myScheduler.schedulerTable` dynamoDB table. The parameters you need to do so are the following :

- The **name of the table** to insert to is `myScheduler.schedulerTable.tableName`
- The **partition key** to use in this table is `myScheduler.partitionKeyValue`
- The **sort key** to use must be like "`${timestamp}#${id}`"
  - _For example : "`1653052252606#some-random-id`" to schedule the event the `2022-05-20` at `13:10 UTC`_)
- The **payload** can be anything you want to put in your message

For example you could use the following snippet to create a new message from a lambda (with the good values passed in the environment of the lambda) :

```ts
const dynamo = new DynamoDB({
  region: process.env.SCHEDULER_REGION,
});

dynamo.putItem({
  TableName: process.env.SCHEDULER_TABLE_NAME,
  Item: foo, //See last part for the payload format
});
```

### Consume messages from the scheduler

Finally to consume the events when the scheduler outputs them you need to consume events from the SQS Queue accessible at `myScheduler.schedulingQueue`.
For example to trigger some lambda integration you could do :

```ts
const eventSource = new SqsEventSource(myScheduler.schedulingQueue);
triggeredEventHandler.addEventSource(eventSource);
```

### Overview of the architecture

![architecture: dynamoDB with scheduled event / lambda scheduled every 15 minutes / publishes to SQS with delay](./docs/images/Architecture%20Scheduler.jpg)

## Usage examples with CDK - Typescript

You can check out the full implementations :

1. [Connecting directly the scheduler to an API Gateway](./demo/apiGatewayIntegration/)
2. [Connecting the Scheduler to a lambda](./demo/lambdaIntegration/)

## Payload format

For the scheduler to function properly the elements added to DynamoDB must have the following attributes:

| Attribute | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pk`      | string | The primary key is always the same. Its value is the attribute `partitionKey` available in the construct instance                                                                                                                                                                                                                                                                            |
| `sk`      | string | The secondary key should start with the timestamp at which you wish to publish the event. You can concatenate with a unique id to be sure you do not have duplicates if you separate them with a `#`. For instance: ✅ `1649434680000#d66727f2-9df7-41b7-b2f8-211eb5581640` is a correct secondary key. ❌ `20220422-16:47:00:00Z00#66727f2-9df7-41b7-b2f8-211eb5581640` will never be read. |
| `payload` | map    | This an object, to the format of your need. This payload will be sent in the event once it's published. Use this to detail the action you want to execute a the scheduled time                                                                                                                                                                                                               |
