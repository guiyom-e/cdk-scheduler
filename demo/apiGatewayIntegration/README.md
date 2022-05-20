# CDK-Scheduler Example - API Gateway integration

This is an example project to demonstrate the usage of the `cdk-scheduler` package

## Installation

- Clone this project locally
- Install all dependencies by running `yarn install`
- Make sure you have the aws cli installed and configured on your machine
- Go to this folder bootstrap and deploy the project by typing
  - Then `npx cdk deploy --profile=<profile-name>`

You can find comments explaining the integration in the source files

## Usage

With the url provided by the cdk cli when you have deployed the stack you can add a new message with a POST request having the following body :

```json
{
  "publicationTimestamp": 123456790,
  "id": "some-random-id",
  "payload": {
    "ignored": "ignored"
  }
}
```

## Presentation

- In the `bin/app.ts` file you can find the App Stack definition
- In the `bin/DynamoDBPutItemIntegration.ts` file you can find the definition of an API Integration that interfaces the API with a DynamoDB Put Item
