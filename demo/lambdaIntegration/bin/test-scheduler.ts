#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { TestSchedulerStack } from "../lib/test-scheduler-stack";

const app = new cdk.App();
new TestSchedulerStack(app, "TestSchedulerStack");
