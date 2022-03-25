import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { Role } from 'aws-cdk-lib/aws-iam';
import type { PutCommandInput } from '@aws-sdk/lib-dynamodb';

import { marshall } from '@aws-sdk/util-dynamodb';
import { AwsIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Stack } from 'aws-cdk-lib';
import mapValues from 'lodash/mapValues';

const PUT_ITEM_ACTION = 'PutItem';

type Command = Omit<PutCommandInput, 'TableName'>;

const command: Command = {
  Item: {
    pk: 'PK',
    sk: '$context.requestId',
    id: "$input.path('$.id')",
    payload: "$input.json('$.payload')",
  },
};

type DynamoDBIntegrationProps = {
  table: Table;
  role: Role;
};

export class DynamoDBPutItemIntegration extends AwsIntegration {
  constructor({ table, role: credentialsRole }: DynamoDBIntegrationProps) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const applicationJSONTemplate = {
      TableName: table.tableName,
      ...command,
      ...mapValues({ Item: command.Item }, marshall),
      // Item: marshall(command.Item),
      // ExpressionAttributeValues: marshall(command.ExpressionAttributeValues),
    };

    const responseTemplate = JSON.stringify({
      data: {
        id: '$context.requestId',
        payload: '$input.body',
      },
    });

    super({
      action: PUT_ITEM_ACTION,
      service: 'dynamodb',
      region: Stack.of(table).region,
      options: {
        credentialsRole,
        requestTemplates: {
          'application/json': JSON.stringify(applicationJSONTemplate),
        },
        integrationResponses: [
          {
            selectionPattern: '.+',
            statusCode: '200',
            responseTemplates: {
              'application/json': responseTemplate,
            },
          },
        ],
      },
    });
  }
}
