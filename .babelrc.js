module.exports = {
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
