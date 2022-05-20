# CDK-Scheduler Example - Lambda integration

This is an example project to demonstrate the usage of the `cdk-scheduler` package

## Installation

- Clone this project locally, go to this folder and make sure you have the aws cli installed and configured on your machine
- Install all dependencies by running `npm install`
- Deploy the project by typing `npx cdk deploy --profile=<profile-name>`

You can find comments explaining the integration in the source files

## Usage

With the url provided by the cdk cli when you have deployed the stack you can add a new message with a GET request having the following URL :
`https://<base-url>/?message=Hello%20World!&minutes=20`

You should get the `Completed` output.

## Presentation

- In the `bin/` folder you can find the declaration of the CDK App and the instantiation of the Stack
- In the `lib/` folder you can find the declaration of the Scheduler Stack using the actual cdk-scheduler package
- In the `resources/functions/` folder you can find the handlers for both lambda functions used in the Scheduler Stack
