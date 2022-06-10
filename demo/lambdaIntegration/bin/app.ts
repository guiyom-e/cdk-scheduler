#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaIntegrationStack } from '../lib/lambdaIntegrationStack';

const app = new cdk.App();
new LambdaIntegrationStack(app, 'LambdaIntegrationStack');
