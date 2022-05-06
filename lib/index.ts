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
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';

// Must be an integer between 1 and 14 minutes
export const CRON_DELAY_IN_MINUTES = 14;

export interface LibProps {
  /** Whether to allow duplicates in SQS events, that may appear in case of errors.
   * It is not recommended to activate this option, unless the receiver is idempotent.
   *
   * When `allowDuplication` option is deactivated (default), a FIFO SQS is provisioned.
   * When `allowDuplication` option is activated, a standard SQS is provisioned, which is cheaper than a FIFO queue.
   *
   * @default false
   * */
  allowDuplication?: boolean;
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
    {
      allowDuplication = false,
      disableNearFutureScheduling = false,
    }: LibProps = {
      allowDuplication: false,
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
      ...(allowDuplication
        ? {}
        : { fifo: true, contentBasedDeduplication: true }),
    });

    this.extractHandler = new NodejsFunction(this, 'ExtractHandler', {
      entry: 'lib/extract.ts',
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
        entry: 'lib/handleNearFuture.ts',
        retryAttempts: 2,
        environment: {
          TABLE_NAME: this.schedulerTable.tableName,
          QUEUE_URL: this.schedulingQueue.queueUrl,
        },
      });

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
