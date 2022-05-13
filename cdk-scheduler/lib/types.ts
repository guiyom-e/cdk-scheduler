export interface SchedulerDynamoDBRecord {
  pk: { S: string };
  sk: { S: string };
  id?: { S: string };
  payload?: unknown;
}
