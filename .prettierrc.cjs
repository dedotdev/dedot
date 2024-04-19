module.exports = {
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  jsxSingleQuote: true,
  printWidth: 120,
  tabWidth: 2,
  bracketSameLine: true,
  plugins: ["prettier-plugin-organize-imports", "@trivago/prettier-plugin-sort-imports"],
  importOrder: ['.*react.*', '^@polkadot/(.*)$', '^@dedot/(.*)$', '<THIRD_PARTY_MODULES>', '^[./]', '^[../]'],
};
