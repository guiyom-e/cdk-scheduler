import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { Role } from 'aws-cdk-lib/aws-iam';
import type { PutCommandInput } from '@aws-sdk/lib-dynamodb';

import { AwsIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Stack } from 'aws-cdk-lib';

const PUT_ITEM_ACTION = 'PutItem';

type Command = Omit<PutCommandInput, 'TableName'> & {
  Item: { pk: string; sk: string; id: string };
};

const command: Command = {
  Item: {
    pk: "$input.path('$.dateRange')",
    sk: "$input.path('$.publishDate')#$context.requestId",
    id: "$input.path('$.id')",
  },
};

type DynamoDBIntegrationProps = {
  partitionKey: string;
  table: Table;
  role: Role;
};

export class DynamoDBPutItemIntegration extends AwsIntegration {
  constructor({ table, role: credentialsRole }: DynamoDBIntegrationProps) {
    const applicationJSONTemplate = {
      TableName: table.tableName,
      Item: {
        pk: { S: command.Item.pk },
        sk: { S: command.Item.sk },
        id: { S: command.Item.id },
      },
    };

    const responseTemplate = JSON.stringify({
      data: {
        id: '$context.requestId',
        publicationDate: "$input.path('$.publishDate')",
        payload: { message: 'Custom payload is not implemented' },
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
