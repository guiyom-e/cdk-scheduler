import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CRON_DELAY_IN_MINUTES, Lib } from '../lib/index';

test('SQS Queue Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  new Lib(stack, 'my-lib');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::SQS::Queue', {
    VisibilityTimeout: 300,
    FifoQueue: true,
    ContentBasedDeduplication: true,
  });
});

test('SQS Queue Created without deduplication', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  new Lib(stack, 'my-lib', { noDuplication: false });
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::SQS::Queue', {
    VisibilityTimeout: 300,
  });
  expect(() =>
    template.hasResourceProperties('AWS::SQS::Queue', {
      FifoQueue: true,
    }),
  ).toThrow();
});

test('DynamoDB created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  new Lib(stack, 'my-lib');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: 'pk',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'sk',
        KeyType: 'RANGE',
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'pk',
        AttributeType: 'S',
      },
      {
        AttributeName: 'sk',
        AttributeType: 'S',
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  });
});

test('Lambda and trigger created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  new Lib(stack, 'my-lib');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
  });

  template.hasResourceProperties('AWS::Events::Rule', {
    ScheduleExpression: `rate(${CRON_DELAY_IN_MINUTES} minutes)`,
    State: 'ENABLED',
  });

  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
    ManagedPolicyArns: [
      {
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          ],
        ],
      },
    ],
  });
});
