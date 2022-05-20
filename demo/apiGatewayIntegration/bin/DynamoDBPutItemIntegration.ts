import { Stack } from 'aws-cdk-lib';
import { AwsIntegration } from 'aws-cdk-lib/aws-apigateway';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { Role } from 'aws-cdk-lib/aws-iam';

const PUT_ITEM_ACTION = 'PutItem';

type DynamoDBIntegrationProps = {
  partitionKey: string;
  table: Table;
  role: Role;
};

export class DynamoDBPutItemIntegration extends AwsIntegration {
  constructor({
    table,
    role: credentialsRole,
    partitionKey,
  }: DynamoDBIntegrationProps) {
    const applicationJSONTemplate = {
      TableName: table.tableName,
      Item: {
        pk: { S: partitionKey },
        sk: {
          S: "$input.path('$.publicationTimestamp')#$input.path('$.id')#$context.requestId",
        },
        id: { S: "$input.path('$.id')#$context.requestId" },
        payload: {
          M: {
            message: {
              S: 'Custom payload not implemented',
            },
          },
        },
      },
    };

    const responseTemplate = {
      id: "$input.path('$.id')#$context.requestId",
      publicationTimestamp: "$input.path('$.publicationTimestamp')",
      payload: { message: 'Custom payload not implemented' },
    };

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
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify(responseTemplate),
            },
          },
        ],
      },
    });
  }
}
