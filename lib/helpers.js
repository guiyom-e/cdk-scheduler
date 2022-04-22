const getNow = () => Date.now();

const extractDelay = (event, now) => {
  const sk = event.sk;

  try {
    const publishTimestamp = parseInt(sk.S.split('#')[0]);

    return Math.max(0, Math.floor((publishTimestamp - now) / 1000));
  } catch (e) {
    throw new Error('Delay could not be parsed', e);
  }
};

const extractId = event => {
  try {
    return event.sk.S.split('#')[1];
  } catch (e) {
    throw new Error('Could not parse id', e);
  }
};

const buildSk = (delay, id) => `${delay}#${id}`;

const getExpressionAttributeValues = (now, cronDelay) => ({
  ':now': {
    S: now.toString(),
  },
  ':future': {
    S: (now + (cronDelay + 1) * 60 * 1000).toString(),
  },
});

module.exports = {
  extractDelay,
  extractId,
  getNow,
  buildSk,
  getExpressionAttributeValues,
};
