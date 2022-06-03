# CDK-Scheduler Example - Lambda integration

This is an example project to demonstrate the usage of the `cdk-scheduler` package

## Installation

- Clone this project locally
- Install all dependencies by running `yarn install` at the root of the repository
- Build the package by running `yarn build` in the `cdk-scheduler` subfolder
- Make sure you have the aws cli installed and configured on your machine
- Go to this folder bootstrap and deploy the project by typing
  - `npx cdk bootstrap --profile=<profile-name>`
  - Then `npx cdk deploy --profile=<profile-name>`

You can find comments explaining the integration in the source files

## Usage

With the url provided by the cdk cli when you have deployed the stack you can add a new message with a GET request having the following URL :
`https://<base-url>/?message=Hello%20World!&minutes=20`

You should get the `Completed` output.

## Presentation

- In the `bin/` folder you can find the declaration of the CDK App and the instantiation of the Stack
- In the `lib/` folder you can find the declaration of the Scheduler Stack using the actual cdk-scheduler package
- In the `resources/functions/` folder you can find the handlers for both lambda functions used in the Scheduler Stack
