import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export class Lib extends Construct {
  /** DynamoDB table used to store scheduled events */
  public schedulerTable: Table;

  /** Queue with scheduled events planned to occur in 0 to 15 minutes */
  private schedulingQueue: Queue;

  /** Lambda to extract scheduled events from the SchedulerTable and put them in tne SchedulingQueue */
  private extractHandler: NodejsFunction;

  /** Delay of the CRON to trigger the extract lambda. Must be an integer between 1 and 14 minutes. */
  private cronDelayInMinutes = 14;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.schedulerTable = new Table(this, 'SchedulerTable', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    this.schedulingQueue = new Queue(this, 'SchedulingQueue', {
      visibilityTimeout: Duration.seconds(300),
    });

    this.extractHandler = new NodejsFunction(this, 'ExtractHandler', {
      entry: 'lib/extract.js',
      events: [],
    });

    this.schedulerTable.grantReadWriteData(this.extractHandler);
    this.schedulingQueue.grantSendMessages(this.extractHandler);

    new Rule(this, 'ScheduleTrigger', {
      schedule: Schedule.rate(Duration.minutes(this.cronDelayInMinutes)),
      targets: [
        new LambdaFunction(this.extractHandler, {
          event: RuleTargetInput.fromObject({
            tableName: this.schedulerTable.tableName,
            queueUrl: this.schedulingQueue.queueUrl,
            cronDelayInMinutes: this.cronDelayInMinutes,
          }),
        }),
      ],
    });
  }
}
