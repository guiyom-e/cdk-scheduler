# ts-serverless-scheduler

> A CDK construct to schedule events precisely ⏱

This construct enables you to trigger an event at a given time on a serverless architecture.

You should use ts-serverless-scheduler if you need to trigger an event at a precise time (down to the second) on your AWS application.

## Install

To install with npm:

```
npm install ts-serverless-scheduler
```

To install with yarn:

```
yarn add ts-serverless-scheduler
```

## Usage

`ts-serverless-scheduler` is powered by SQS feature to delay events up to 15 minutes. A lambda is scheduled to query a DynamoDB Table every 15 minutes, it pushes every events scheduled in the next 15 minutes to SQS with a delay corresponding the desired publication date.

![architecture: dynamoDB with scheduled event / lambda scheduled every 15 minutes / publishes to SQS with delay](./docs/images/Architecture%20Scheduler.jpg)

### Usage example with CDK - Typescript
