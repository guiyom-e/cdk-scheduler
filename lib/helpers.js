const getNow = () => Date.now();

const extractDelay = (event, now) => {
  const sk = event.sk;

  try {
    const publishTimestamp = parseInt(sk.S.split('#')[0]);

    console.log(publishTimestamp);

    console.log(
      'computed publishDate',
      event.sk,
      ' --> ',
      new Date(publishTimestamp),
    );

    return Math.max(0, Math.floor((publishTimestamp - now) / 1000));
  } catch (e) {
    throw new Error('Delay could not be parsed');
  }
};

const extractId = event => {
  try {
    return event.sk.S.split('#')[1];
  } catch (e) {
    console.log(e);
    throw new Error(e, 'Could not parse id');
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
