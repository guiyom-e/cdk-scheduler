import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { existsSync } from 'fs';

// Must be an integer between 1 and 14 minutes
export const CRON_DELAY_IN_MINUTES = 14;

// Allows to use precompiled function source when it exists
const findLambdaFilePath = (filename: string) => {
  if (existsSync(`${filename}.js`)) return `${filename}.js`;
  else return `${filename}.ts`;
};

export interface ILibProps {
  /** Whether to disable scheduling in the near future, i.e. within the next `CRON_DELAY_IN_MINUTES` minutes (14 minutes by default).
   * It is not recommended to activate this option, unless no event will be scheduled in the near future.
   *
   * When `disableNearFutureScheduling` option is activated, events scheduled within less than `CRON_DELAY_IN_MINUTES` minutes
   * before due date are not guaranteed to be scheduled properly.
   *
   */
  disableNearFutureScheduling?: boolean;
}

export class Scheduler extends Construct {
  /** DynamoDB table used to store scheduled events */
  public readonly schedulerTable: Table;

  /** Value of the DynamoDB partition key, used to store pending events */
  public readonly partitionKeyValue = 'scheduler';

  /** Queue with scheduled events planned to occur in 0 to 15 minutes */
  public readonly schedulingQueue: Queue;

  /** Lambda to extract scheduled events from the `schedulerTable` and put them in the `schedulingQueue` */
  private readonly extractHandler: NodejsFunction;

  /** Lambda to handle scheduled events in the near future (< cronDelayInMinutes) and put them in tne SchedulingQueue
   *
   * This resource is not provisioned if `disableNearFutureScheduling` option is false.
   */
  private readonly nearFutureHandler: NodejsFunction | undefined;

  /** Delay of the CRON to trigger the extract lambda. Must be an integer between 1 and 14 minutes. */
  private readonly cronDelayInMinutes = CRON_DELAY_IN_MINUTES;

  constructor(
    scope: Construct,
    id: string,
    { disableNearFutureScheduling = false }: ILibProps = {
      disableNearFutureScheduling: false,
    },
  ) {
    super(scope, id);

    this.schedulerTable = new Table(this, 'SchedulerTable', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: disableNearFutureScheduling
        ? undefined
        : StreamViewType.NEW_IMAGE,
    });

    this.schedulingQueue = new Queue(this, 'SchedulingQueue', {
      visibilityTimeout: Duration.seconds(300),
    });

    this.extractHandler = new NodejsFunction(this, 'ExtractHandler', {
      runtime: Runtime.NODEJS_16_X,
      entry: findLambdaFilePath(`${__dirname}/functions/extract/extract`),
      events: [],
      retryAttempts: 2,
      environment: {
        TABLE_NAME: this.schedulerTable.tableName,
        QUEUE_URL: this.schedulingQueue.queueUrl,
      },
    });

    this.schedulerTable.grantReadWriteData(this.extractHandler);
    this.schedulingQueue.grantSendMessages(this.extractHandler);

    if (!disableNearFutureScheduling) {
      this.nearFutureHandler = new NodejsFunction(this, 'NearFutureHandler', {
        runtime: Runtime.NODEJS_16_X,
        entry: findLambdaFilePath(
          `${__dirname}/functions/handleNearFuture/handleNearFuture`,
        ),
        retryAttempts: 2,
        environment: {
          TABLE_NAME: this.schedulerTable.tableName,
          QUEUE_URL: this.schedulingQueue.queueUrl,
        },
      });

      this.schedulerTable.grantReadWriteData(this.nearFutureHandler);
      this.schedulingQueue.grantSendMessages(this.nearFutureHandler);

      this.nearFutureHandler.addEventSource(
        new DynamoEventSource(this.schedulerTable, {
          startingPosition: StartingPosition.LATEST,
        }),
      );
    }

    new Rule(this, 'ScheduleTrigger', {
      schedule: Schedule.rate(Duration.minutes(this.cronDelayInMinutes)),
      targets: [
        new LambdaFunction(this.extractHandler, {
          event: RuleTargetInput.fromObject({
            tableName: this.schedulerTable.tableName,
            queueUrl: this.schedulingQueue.queueUrl,
            cronDelayInMinutes: this.cronDelayInMinutes,
            partitionKeyValue: this.partitionKeyValue,
          }),
        }),
      ],
    });
  }
}
