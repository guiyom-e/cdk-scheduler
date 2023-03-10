![logo](https://user-images.githubusercontent.com/46320048/176927746-950cfa05-0ed6-4d8a-8cf6-3334cf9e117e.png)

> 💡 AWS EventBridge has now a built-in scheduler (precise-to-the-minute): https://docs.aws.amazon.com/eventbridge/latest/userguide/scheduler.html. It is preferable to use it if it fit your needs!

# cdk-scheduler - CDK construct for serverless scheduling

> `cdk-scheduler`, a CDK construct to schedule events precisely and serverless ⏱

This construct enables to trigger an event at a given time on a serverless architecture.

You should use cdk-scheduler if you need to trigger an event at a precise time (down to the second) on your AWS application. If you want to compare options, check out [our article on different serverless scheduling solutions](https://dev.to/kumo/a-serverless-solution-to-just-in-time-scheduling-3cn6).

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
- `id` : The id/name of the scheduler (a `string`)

### Write messages to the scheduler

Grant access to write a new message to the scheduler to the service(s) that will write to it. For example an API Integration or a lambda function :

```ts
myScheduler.schedulerTable.grantWriteData(newMessageLambda);
```

Messages can be posted to the scheduler by inserting a new row into the `myScheduler.schedulerTable` dynamoDB table. Parameters needed are:

- The **name of the table** to insert to : `myScheduler.schedulerTable.tableName`
- The **partition key** to use in this table : `myScheduler.partitionKeyValue`
- The **sort key** to use must be like "`[timestamp]#[id]`"
  - _For example : "`1653052252606#some-random-id`" to schedule the event the `2022-05-20` at `13:10 UTC`_)
- The **payload** must be a mapping with any content

An example to create a new message from a lambda (with the appropriate values passed in the environment of the lambda) :

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

The events can be consumed from the SQS Queue accessible at `myScheduler.schedulingQueue`.
An example to trigger some lambda integration from the SQS :

```ts
const eventSource = new SqsEventSource(myScheduler.schedulingQueue);
triggeredEventHandler.addEventSource(eventSource);
```

### Overview of the architecture

![cdk-scheduler architecture diagram: dynamoDB with scheduled event linked to a lambda scheduled every 15 minutes publishes on an SQS with delay](../docs/images/Architecture%20Scheduler.jpg)

## Payload format

For cdk-scheduler to function properly the elements added to DynamoDB must have the following attributes:

| Attribute | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pk`      | string | The primary key is always the same. Its value is the attribute `partitionKey` available in the construct instance                                                                                                                                                                                                                                                                            |
| `sk`      | string | The secondary key should start with the timestamp (13-digit millisecond format) at which you wish to publish the event. You can concatenate with a unique id to be sure you do not have duplicates if you separate them with a `#`. For instance: ✅ `1649434680000#d66727f2-9df7-41b7-b2f8-211eb5581640` is a correct secondary key. ❌ `20220422-16:47:00:00Z00#66727f2-9df7-41b7-b2f8-211eb5581640` will never be read. |
| `payload` | map    | This is an object, without format constraints. This payload will be sent in the event once it's published. Use this to detail the action you want to execute a the scheduled time                                                                                                                                                                                                             |
