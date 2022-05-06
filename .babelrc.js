module.exports = {
  presets: ['@babel/preset-typescript', '@babel/preset-env'],
  plugins: [
    [
      'search-and-replace',
      {
        rules: [
          {
            search: /(.*\/functions)\/(.*)\.ts/,
            searchTemplateStrings: true,
            replace: `$1/$2.js`,
          },
        ],
      },
    ],
  ],
};
