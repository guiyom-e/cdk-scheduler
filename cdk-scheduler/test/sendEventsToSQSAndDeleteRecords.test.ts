import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { SQS } from 'aws-sdk';
import { sendEventsToSQSAndDeleteRecords } from '../lib/functions/sendEventsToSQSAndDeleteRecords';

jest.mock('aws-sdk');
jest.mock('@aws-sdk/client-dynamodb');

const PK_WITH_SUCCESSFUL_DELETION = 'scheduler';
const PK_WITH_FAILED_DELETION = 'not-scheduler';

const mockDynamoDb = {
  batchWriteItem: async (args: {
    RequestItems: {
      [tableName: string]: {
        DeleteRequest: {
          Key: { pk: { S: string }; sk: { S: string } };
        };
      }[];
    };
  }) => {
    return Promise.resolve({
      UnprocessedItems: Object.fromEntries(
        Object.keys(args.RequestItems).map(tableName => [
          tableName,
          args.RequestItems[tableName].filter(
            key => key.DeleteRequest.Key.pk.S === PK_WITH_FAILED_DELETION,
          ),
        ]),
      ),
    });
  },
} as unknown as DynamoDB;

(SQS as unknown as jest.Mock).mockImplementation(() => ({
  sendMessageBatch: () => ({
    promise: () => ({
      Successful: [
        { Id: '1651240630745-ID_SUCCESSFUL_DELETION' },
        { Id: '1651240630745-ID_FAILED_DELETION' },
      ],
      Failed: [{ Id: '1651240630745-ID_FAILED' }],
    }),
  }),
}));

describe('sendEventsToSQSAndDeleteRecords', () => {
  it('should format empty list of records correctly', async () => {
    const response = await sendEventsToSQSAndDeleteRecords([], {
      queueUrl: '',
      dynamodb: mockDynamoDb,
      tableName: '',
    });
    expect(response).toEqual({
      failedIds: [],
      successIdsWithFailedDeletion: [],
      successfulIdsWithSuccessfulDeletion: [],
    });
  });

  it('should format a record correctly', async () => {
    const response = await sendEventsToSQSAndDeleteRecords(
      [
        {
          payload: {
            M: { message: { S: 'Custom payload not implemented' } },
          },
          sk: { S: '1651240630745#ID_SUCCESSFUL_DELETION' },
          id: { S: 'ID_SUCCESSFUL_DELETION' },
          pk: { S: PK_WITH_SUCCESSFUL_DELETION },
        },
      ],
      { queueUrl: '', dynamodb: mockDynamoDb, tableName: '' },
    );
    expect(response).toEqual({
      failedIds: ['1651240630745-ID_FAILED'],
      successIdsWithFailedDeletion: [],
      successfulIdsWithSuccessfulDeletion: [
        'DELETION_SUCCESS-1651240630745#ID_SUCCESSFUL_DELETION',
      ],
    });
  });
  it('should format two records correctly', async () => {
    const response = await sendEventsToSQSAndDeleteRecords(
      [
        {
          payload: {
            M: { message: { S: 'record 1' } },
          },
          sk: { S: '1651240630745#ID_SUCCESSFUL_DELETION' },
          id: { S: 'ID_SUCCESSFUL_DELETION' },
          pk: { S: PK_WITH_SUCCESSFUL_DELETION },
        },
        {
          payload: {
            M: { message: { S: 'record 2' } },
          },
          sk: { S: '1651240630745#ID_FAILED_DELETION' },
          id: { S: 'ID_FAILED_DELETION' },
          pk: { S: PK_WITH_FAILED_DELETION },
        },
      ],
      { queueUrl: '', dynamodb: mockDynamoDb, tableName: '' },
    );
    expect(response).toEqual({
      failedIds: ['1651240630745-ID_FAILED'],
      successIdsWithFailedDeletion: [
        'DELETION_FAILURE-1651240630745#ID_FAILED_DELETION',
      ],
      successfulIdsWithSuccessfulDeletion: [
        'DELETION_SUCCESS-1651240630745#ID_SUCCESSFUL_DELETION',
      ],
    });
  });
});
