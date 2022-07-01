![image](https://user-images.githubusercontent.com/46320048/176927746-950cfa05-0ed6-4d8a-8cf6-3334cf9e117e.png)

# CDK construct for serverless scheduling

> `cdk-scheduler`, a CDK construct to schedule events precisely and serverless ⏱

This construct enables to trigger an event at a given time on a serverless architecture.

You should use `cdk-scheduler` if you need to trigger an event at a precise time (down to the second) on your AWS application. If you want to compare options, check out [our article on different serverless scheduling solutions](https://dev.to/kumo/a-serverless-solution-to-just-in-time-scheduling-3cn6).

# [How to use cdk-scheduler](./cdk-scheduler/README.md)

## Understand how the Scheduler works

`cdk-scheduler` is powered by SQS feature to delay events up to 15 minutes.

A lambda is scheduled to query a DynamoDB Table every 15 minutes, it pushes every events scheduled in the next 15 minutes to SQS with a delay corresponding the desired publication date.

## Overview of the architecture

![cdk-scheduler architecture diagram: dynamoDB with scheduled event linked to a lambda scheduled every 15 minutes publishes on an SQS with delay](./docs/images/Architecture%20Scheduler.jpg)

## Usage examples with CDK - Typescript

If you want to implement serverless scheduling you can get inspirations from cdk-scheduler full implementations :

1. [Connecting directly the scheduler to an API Gateway](./demo/apiGatewayIntegration/)
2. [Connecting the Scheduler to a lambda](./demo/lambdaIntegration/)

## Payload format

For cdk-scheduler to function properly the elements added to DynamoDB must have the following attributes:

| Attribute | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pk`      | string | The primary key is always the same. Its value is the attribute `partitionKey` available in the construct instance                                                                                                                                                                                                                                                                            |
| `sk`      | string | The secondary key should start with the timestamp at which you wish to publish the event. You can concatenate with a unique id to be sure you do not have duplicates if you separate them with a `#`. For instance: ✅ `1649434680000#d66727f2-9df7-41b7-b2f8-211eb5581640` is a correct secondary key. ❌ `20220422-16:47:00:00Z00#66727f2-9df7-41b7-b2f8-211eb5581640` will never be read. |
| `payload` | map    | This is an object, without format contraints. This payload will be sent in the event once it's published. Use this to detail the action you want to execute a the scheduled time                                                                                                                                                                                                             |

# CONTRIBUTING

If you wish to contribute to cdk-scheduler:

- you can open an issue to suggest improvements or to report a bug
- you can open a pull-request to implement changes
- you can send us love on twitter ([@adelegauvrit](https://twitter.com/AdeleGauvrit), [@nathperriolat](https://twitter.com/nathperriolat) and [@EGuiyom](https://twitter.com/EGuiyom)) ❤️
