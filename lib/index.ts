import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface LibProps {
  // Define construct properties here
}

export class Lib extends Construct {

  constructor(scope: Construct, id: string, props: LibProps = {}) {
    super(scope, id);

    // Define construct contents here

    // example resource
    // const queue = new sqs.Queue(this, 'LibQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
