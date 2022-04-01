import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LibProps {
  // Define construct properties here
}

export class Lib extends Construct {
  table: Table;
  constructor(scope: Construct, id: string, props: LibProps = {}) {
    super(scope, id);

    // Define construct contents here

    // example resource
    const queue = new Queue(this, 'LibQueue', {
      visibilityTimeout: Duration.seconds(300),
    });

    this.table = new Table(this, 'SchedulerTable', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const extractHandler = new NodejsFunction(this, 'ExtractHandler', {
      entry: 'lib/extract.ts',
      events: [],
    });

    const trigger = new Rule(this, 'ScheduleTrigger', {
      schedule: Schedule.rate(Duration.minutes(15)),
      targets: [new LambdaFunction(extractHandler)],
    });
  }
}
