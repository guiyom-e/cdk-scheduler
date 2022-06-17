#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TestBenchStack } from '../lib/testBenchStack';

const app = new cdk.App();
new TestBenchStack(app, 'TestBenchStack');
