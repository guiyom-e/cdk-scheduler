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

    const logsWidget = new cloudwatch.LogQueryWidget({
      title: 'Received scheduled messages - Logs',
      width: 18,
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
    });
    logsWidget.position(0, 0);

    const eventsCount = new cloudwatch.LogQueryWidget({
      title: 'Number of received scheduled messages per hour',
      width: 6,
      logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
      view: cloudwatch.LogQueryVisualizationType.BAR,
      queryLines: [
        'fields @timestamp, @message',
        'sort @timestamp desc',
        'filter @message like "[FOR_DASHBOARD]"',
        `parse @message ${parsingRegex}`,
        'stats count(*) by bin(1h)',
      ],
    });
    logsWidget.position(18, 0);

    const delays = new cloudwatch.LogQueryWidget({
      title: 'Difference between set and real publication timestamp (ms)',
      width: 18,
      logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
      view: cloudwatch.LogQueryVisualizationType.LINE,
      queryLines: [
        'fields @timestamp, @message',
        'sort @timestamp desc',
        'filter @message like "[FOR_DASHBOARD]"',
        `parse @message ${parsingRegex}`,
        'stats avg(diff), min(diff), max(diff) by bin(1min)',
      ],
    });
    delays.position(0, 6);

    const averageDelay = new cloudwatch.LogQueryWidget({
      title:
        'Average difference between set and real publication timestamp (ms)',
      width: 6,
      logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
      view: cloudwatch.LogQueryVisualizationType.BAR,
      queryLines: [
        'fields @timestamp, @message',
        'sort @timestamp desc',
        'filter @message like "[FOR_DASHBOARD]"',
        `parse @message ${parsingRegex}`,
        'stats avg(diff) by bin(1h)',
      ],
    });
    averageDelay.position(18, 6);

    const delaysExtractHandler = new cloudwatch.LogQueryWidget({
      title:
        'Difference between set and real publication timestamp (ms) [ExtractHandler]',
      width: 12,
      logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
      view: cloudwatch.LogQueryVisualizationType.LINE,
      queryLines: [
        'fields @timestamp, @message',
        'sort @timestamp desc',
        'filter @message like "[FOR_DASHBOARD]"',
        `parse @message ${parsingRegex}`,
        'filter source = "extract"',
        'stats avg(diff), min(diff), max(diff) by bin(1min)',
      ],
    });
    delaysExtractHandler.position(0, 12);

    const delaysNearFutureHandler = new cloudwatch.LogQueryWidget({
      title:
        'Difference between set and real publication timestamp (ms) [NearFutureHandler]',
      width: 12,
      logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
      view: cloudwatch.LogQueryVisualizationType.LINE,
      queryLines: [
        'fields @timestamp, @message',
        'sort @timestamp desc',
        'filter @message like "[FOR_DASHBOARD]"',
        `parse @message ${parsingRegex}`,
        'filter source = "handleNearFuture"',
        'stats avg(diff), min(diff), max(diff) by bin(1min)',
      ],
    });
    delaysNearFutureHandler.position(12, 12);

    const multipleReceptions = new cloudwatch.LogQueryWidget({
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
    });
    multipleReceptions.position(0, 18);

    const multipleReceptionsExtractHandler = new cloudwatch.LogQueryWidget({
      title: 'Multiple receptions (ExtractHandler)',
      width: 12,
      logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
      view: cloudwatch.LogQueryVisualizationType.BAR,
      queryLines: [
        'fields @timestamp, @message',
        'sort @timestamp desc',
        'filter @message like "[FOR_DASHBOARD]"',
        `parse @message ${parsingRegex}`,
        'filter source = "extract"',
        'stats count(*) as countReception by uniqueId',
        'filter countReception > 1',
      ],
    });
    multipleReceptionsExtractHandler.position(0, 24);

    const multipleReceptionsNearFutureHandler = new cloudwatch.LogQueryWidget({
      title: 'Multiple receptions (NearFutureHandler)',
      width: 12,
      logGroupNames: [receiveEventsHandler.logGroup.logGroupName],
      view: cloudwatch.LogQueryVisualizationType.BAR,
      queryLines: [
        'fields @timestamp, @message',
        'sort @timestamp desc',
        'filter @message like "[FOR_DASHBOARD]"',
        `parse @message ${parsingRegex}`,
        'filter source = "handleNearFuture"',
        'stats count(*) as countReception by uniqueId',
        'filter countReception > 1',
      ],
    });
    multipleReceptionsNearFutureHandler.position(12, 24);

    dashboard.addWidgets(
      logsWidget,
      eventsCount,
      delays,
      averageDelay,
      delaysExtractHandler,
      delaysNearFutureHandler,
      multipleReceptions,
      multipleReceptionsExtractHandler,
      multipleReceptionsNearFutureHandler,
    );
  }
}
