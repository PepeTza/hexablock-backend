// Layer boundaries of Clean Architecture (issue #6).
//
// Each block uses ESLint's built-in `no-restricted-imports` rule, so a
// forbidden import is a lint error in the editor, in the pre-commit hook and
// in CI. The dependency rule is documented in the client repo's
// docs/architecture.md §2.
//
// This file is CommonJS so that both eslint.config.mjs and the Jest test
// (eslint-boundaries.spec.ts) can load it.

const FILES = '**/*.ts';

/**
 * Matches a relative import climbing out to one of `layers`
 * (`../../frameworks/...`).
 *
 * @param {string[]} layers
 * @returns {string}
 */
function layerImportRegex(layers) {
  return `^(\\.\\./)+(${layers.join('|')})(/|$)`;
}

/**
 * Restriction for a layer: it cannot import the layers outside it.
 *
 * @param {string[]} outerLayers
 * @param {string} layer
 */
function outerLayersPattern(outerLayers, layer) {
  return {
    regex: layerImportRegex(outerLayers),
    message: `The ${layer} layer cannot import ${outerLayers.join(', ')}: dependencies only point inwards.`,
  };
}

// `no-restricted-imports` has no "any external package" option, so the
// domain forbids every specifier that is not relative (`./` or `../`).
const EXTERNAL_PACKAGE_PATTERN = {
  regex: '^(?!\\.{1,2}/)',
  message:
    'The domain cannot import external packages or outer layers: it is plain TypeScript (ADR-03).',
};

const DOMAIN_PATTERNS = [
  EXTERNAL_PACKAGE_PATTERN,
  outerLayersPattern(['application', 'adapters', 'frameworks'], 'domain'),
];

/**
 * Builds the boundary blocks of the ESLint flat config.
 *
 * @returns {import('eslint').Linter.Config[]}
 */
function layerBoundaries() {
  const restrict = (patterns) => ({
    'no-restricted-imports': ['error', { patterns }],
  });

  return [
    { files: [`src/domain/${FILES}`], rules: restrict(DOMAIN_PATTERNS) },
    {
      files: [`src/application/${FILES}`],
      rules: restrict([
        outerLayersPattern(['adapters', 'frameworks'], 'application'),
      ]),
    },
    {
      files: [`src/adapters/${FILES}`],
      rules: restrict([outerLayersPattern(['frameworks'], 'adapters')]),
    },
    // src/frameworks has no restriction: it is the outermost layer and wires use cases via useFactory.
  ];
}

module.exports = { layerBoundaries };
