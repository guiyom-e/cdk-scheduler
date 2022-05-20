import { Stack, StackProps } from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { Scheduler } from "cdk-scheduler";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class TestSchedulerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Instantiate the scheduler with the Scheduler class exposed by the package
    const myScheduler = new Scheduler(this, "myScheduler");

    // Defines the lambda function that handles API Events to append new events into the Scheduler
    const newMessageHandler = new NodejsFunction(this, "NewMessageLambda", {
      entry: `${__dirname}/../resources/functions/newMessage/index.ts`,
      environment: {
        SCHEDULER_PK: myScheduler.partitionKeyValue,
        SCHEDULER_TABLE_NAME: myScheduler.schedulerTable.tableName,
        SCHEDULER_REGION: this.region,
      },
    });

    // Create a new API to handle HTTP Requests
    const api = new apigateway.RestApi(this, "NewMessageApi", {
      restApiName: "New Message API",
      description: "This service appends a new message to your Scheduler.",
    });

    // Bind the lambda function to the API
    const apiIntegration = new apigateway.LambdaIntegration(newMessageHandler);
    api.root.addMethod("GET", apiIntegration);

    // You can access the Table used in the scheduler with
    // the `schedulerTable` property.
    // Use it to grant to the service that appends new messages
    // to the scheduler the write access to the table
    myScheduler.schedulerTable.grantWriteData(newMessageHandler);

    // Define a lambda function which consumes the events when they are
    // triggered by the scheduler
    const triggeredEventHandler = new NodejsFunction(
      this,
      "TriggeredEventLambda",
      {
        entry: `${__dirname}/../resources/functions/triggeredEvent/index.ts`,
        environment: {
          SCHEDULER_PK: myScheduler.partitionKeyValue,
          SCHEDULER_TABLE_NAME: myScheduler.schedulerTable.tableName,
          SCHEDULER_REGION: this.region,
        },
      }
    );

    // You can access the output SQS of the scheduler with
    // the `schedulingQueue` property.
    // Create the event source as such ...
    const eventSource = new SqsEventSource(myScheduler.schedulingQueue);

    // ... and bind your consumer to this source
    triggeredEventHandler.addEventSource(eventSource);
  }
}
