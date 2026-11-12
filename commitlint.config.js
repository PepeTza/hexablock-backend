// Same rules as CONTRIBUTING.md §2: Conventional Commits with a required scope
// from a fixed list and a header of at most 72 characters.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [
        'engine',
        'hexa-lines',
        'hexa-fit',
        'hexa-sort',
        'hexa-merge',
        'usecases',
        'ui',
        'api',
        'panel',
        'db',
        'docs',
        'ci',
      ],
    ],
    'header-max-length': [2, 'always', 72],
  },
};
