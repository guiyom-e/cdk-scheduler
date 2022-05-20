import {
  extractDelaySeconds,
  extractId,
  getExpressionAttributeValues,
} from '../lib/functions/helpers';

const nowIso = '2022-04-01T14:45:00.000Z';
const now = new Date(nowIso).getTime();

const publishDateIso = '2022-04-01T14:55:00.000Z';
const publishDate = new Date(publishDateIso).getTime();

const events = [
  {
    pk: {
      S: 'scheduler',
    },
    sk: {
      S: `${publishDate}#4455fee0-ce74-4145-991a-c78c82f31730`,
    },
    payload: {
      S: '2',
    },
    id: {
      S: 'toto',
    },
  },
];

const defaultCronDelay = 14;

describe('helpers', () => {
  describe('extractDelay', () => {
    it('should extract delay from event', () => {
      const delayInMinutes = extractDelaySeconds(events[0], now) / 60;

      expect(delayInMinutes).toEqual(10);
    });
    it('should return 0 if the delay is negative', () => {
      const delayInMinutes =
        extractDelaySeconds({ sk: { S: '0#def#ghi' } }, now) / 60;

      expect(delayInMinutes).toEqual(0);
    });
    it('should throw an error if the publication timestamp can not be parsed', () => {
      expect(() =>
        extractDelaySeconds({ sk: { S: 'abc#def#ghi' } }, now),
      ).toThrow('Delay could not be parse');
    });
  });

  describe('extractId', () => {
    it('should extract id from event', () => {
      const id = extractId(events[0]);

      expect(id).toEqual('4455fee0-ce74-4145-991a-c78c82f31730');
    });
    it('should extract an id with multiple separators from event', () => {
      const id = extractId({ pk: { S: '' }, sk: { S: '123#def#ghi' } });

      expect(id).toEqual('def#ghi');
    });
    it('should throw an error if the event has an empty id', () => {
      expect(() => extractId({ pk: { S: '' }, sk: { S: '' } })).toThrow(
        'Could not parse id',
      );
    });
    it('should throw an error if the event has an empty publication date', () => {
      expect(() => extractId({ pk: { S: '' }, sk: { S: '#def#ghi' } })).toThrow(
        'Could not parse id',
      );
    });
    it('should throw an error if the event is not correctly formatted', () => {
      expect(() =>
        extractId({ pk: { S: '' }, sk: { S: 'abc#def#ghi' } }),
      ).toThrow('Could not parse id');
    });
  });

  describe('getExpressionAttributeValues', () => {
    it('should return now and now + cronDelay + 1 minutes', () => {
      const expressionAttributesValue = getExpressionAttributeValues(
        now,
        defaultCronDelay,
      );
      expect(expressionAttributesValue[':now'].S).toBe('1648824300000');
      expect(expressionAttributesValue[':future'].S).toBe('1648825200000');
    });
  });
});
