import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CRON_DELAY_IN_MINUTES, Scheduler } from '../lib/index';

test('SQS Queue Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  new Scheduler(stack, 'my-lib');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::SQS::Queue', {
    VisibilityTimeout: 300,
  });
});

test('DynamoDB created with stream', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  new Scheduler(stack, 'my-lib');
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
    StreamSpecification: {
      StreamViewType: 'NEW_IMAGE',
    },
  });
});

test('DynamoDB created without stream', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  new Scheduler(stack, 'my-lib', { disableNearFutureScheduling: true });
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
  expect(() =>
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      StreamSpecification: {
        StreamViewType: 'NEW_IMAGE',
      },
    }),
  ).toThrow();
});

test.each`
  disableNearFutureScheduling
  ${undefined}
  ${false}
  ${true}
`(
  'Lambdas and trigger created',
  ({
    disableNearFutureScheduling,
  }: {
    disableNearFutureScheduling: boolean;
  }) => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'AppStack');
    new Scheduler(stack, 'my-lib', {
      disableNearFutureScheduling,
    });
    const template = Template.fromStack(stack);

    template.resourceCountIs(
      'AWS::Lambda::Function',
      disableNearFutureScheduling ? 1 : 2,
    );

    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs16.x',
    });

    expect(CRON_DELAY_IN_MINUTES).toBeGreaterThan(0);
    expect(CRON_DELAY_IN_MINUTES).toBeLessThanOrEqual(14);

    // ExtractHandler lambda
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
  },
);
