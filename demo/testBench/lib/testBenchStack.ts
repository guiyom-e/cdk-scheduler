import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Scheduler } from 'cdk-scheduler';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class TestBenchStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const scheduler = new Scheduler(this, 'TestBenchScheduler');

    const sendMessagesHandler = new NodejsFunction(this, 'SendMessagesLambda', {
      entry: `${__dirname}/../resources/functions/sendMessages/index.ts`,
      environment: {
        SCHEDULER_PK: scheduler.partitionKeyValue,
        SCHEDULER_TABLE_NAME: scheduler.schedulerTable.tableName,
        SCHEDULER_REGION: this.region,
      },
    });

    // You can access the Table used in the scheduler with
    // the `schedulerTable` property.
    // Use it to grant to the service that appends new messages
    // to the scheduler the write access to the table
    scheduler.schedulerTable.grantWriteData(sendMessagesHandler);

    // Define a lambda function which consumes the events when they are
    // triggered by the scheduler
    const receiveEventsHandler = new NodejsFunction(
      this,
      'ReceiveEventsLambda',
      {
        entry: `${__dirname}/../resources/functions/receiveEvents/index.ts`,
        environment: {
          SCHEDULER_PK: scheduler.partitionKeyValue,
          SCHEDULER_TABLE_NAME: scheduler.schedulerTable.tableName,
          SCHEDULER_REGION: this.region,
        },
      },
    );

    // You can access the output SQS of the scheduler with
    // the `schedulingQueue` property.
    // Create the event source as such ...
    const eventSource = new SqsEventSource(scheduler.schedulingQueue);

    // ... and bind your consumer to this source
    receiveEventsHandler.addEventSource(eventSource);
  }
}
