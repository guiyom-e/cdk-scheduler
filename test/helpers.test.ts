import {
  extractDelay,
  extractId,
  getExpressionAttributeValues,
} from '../lib/helpers';

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
      const delayInMinutes = extractDelay(events[0], now) / 60;

      expect(delayInMinutes).toEqual(10);
    });
  });

  describe('extractId', () => {
    it('should extract id from event', () => {
      const id = extractId(events[0]);

      expect(id).toEqual('4455fee0-ce74-4145-991a-c78c82f31730');
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
