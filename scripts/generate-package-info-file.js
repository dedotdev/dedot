const fs = require('fs');
const path = require('path');

const main = () => {
  const currentDir = process.cwd();
  const packageJson = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));

  const { name, version } = packageJson;

  const fileHeader = `// THIS FILE IS AUTO-GENERATED, DO NOT EDIT!\n`;
  const fileContent = `${fileHeader}\nexport const packageInfo = { name: '${name}', version: '${version}' };\n`;

  fs.writeFileSync(path.join(currentDir, 'src/packageInfo.ts'), fileContent);
  fs.writeFileSync(path.join(currentDir, 'dist/packageInfo.js'), fileContent);
};

main();
