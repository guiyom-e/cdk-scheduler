import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Lib } from '../lib/index';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/index.ts
test('SQS Queue Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  // WHEN
  new Lib(stack, 'my-lib');
  // THEN
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::SQS::Queue', {
    VisibilityTimeout: 300,
  });
});

test('DynamoDB created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  // WHEN
  new Lib(stack, 'my-lib');
  // THEN
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

test('Lambda created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'AppStack');
  // WHEN
  new Lib(stack, 'my-lib');
  // THEN
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
    Runtime: 'nodejs14.x',
  });
});
