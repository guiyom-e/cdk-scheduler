import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Scheduler } from 'cdk-scheduler';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { aws_cloudwatch as cloudwatch } from 'aws-cdk-lib';

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

    const dashboard = new cloudwatch.Dashboard(this, 'TestBenchDashboard', {
      dashboardName: 'TestBenchDashboard',
      end: 'end',
      periodOverride: cloudwatch.PeriodOverride.AUTO,
      start: 'start',
    });

    const parsingRegex =
      /.*Id:\s(?<testId>\d+).*UniqueId:\s(?<uniqueId>[a-zA-Z0-9#-_]+).*DiffMs:\s(?<diff>-?\d+).*Source:\s(?<source>\w+).*/;

    dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Received scheduled messages - Logs',
        width: 24,
        logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
        view: cloudwatch.LogQueryVisualizationType.TABLE,
        queryLines: [
          'fields @timestamp, @message',
          'sort @timestamp desc',
          'filter @message like "[FOR_DASHBOARD]"',
          `parse @message ${parsingRegex}`,
          'display testId, source, diff, @message',
          'limit 200',
        ],
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Difference between set and real publication timestamp (ms)',
        width: 24,
        logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
        view: cloudwatch.LogQueryVisualizationType.LINE,
        queryLines: [
          'fields @timestamp, @message',
          'sort @timestamp desc',
          'filter @message like "[FOR_DASHBOARD]"',
          `parse @message ${parsingRegex}`,
          'stats avg(diff), min(diff), max(diff) by bin(1min)',
        ],
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title:
          'Difference between set and real publication timestamp (ms), depending on handling lambda function (ExtractHandler or NearFutureHandler)',
        width: 24,
        logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
        view: cloudwatch.LogQueryVisualizationType.BAR,
        queryLines: [
          'fields @timestamp, @message',
          'sort @timestamp desc',
          'filter @message like "[FOR_DASHBOARD]"',
          `parse @message ${parsingRegex}`,
          'stats avg(diff), min(diff), max(diff) by source',
        ],
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Multiple receptions',
        width: 24,
        logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
        view: cloudwatch.LogQueryVisualizationType.BAR,
        queryLines: [
          'fields @timestamp, @message',
          'sort @timestamp desc',
          'filter @message like "[FOR_DASHBOARD]"',
          `parse @message ${parsingRegex}`,
          'stats count(*) as countReception by uniqueId',
          'filter countReception > 1',
        ],
      }),
    );
  }
}
