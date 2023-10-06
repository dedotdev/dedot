const fs = require('fs');
const path = require('path');

const filesToCopy = ['package.json', 'README.md', 'LICENSE'];
const targetDir = 'dist';

const main = () => {
  if (!fs.existsSync(targetDir)) {
    return;
  }

  const currentDir = process.cwd();

  filesToCopy.forEach((file) => {
    const filePath = path.join(currentDir, file);
    if (!fs.existsSync(filePath)) {
      return;
    }

    let fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });

    if (file === 'package.json') {
      const pkgJson = JSON.parse(fileContent);
      pkgJson.main = 'index.js';

      fileContent = JSON.stringify(pkgJson, null, 2);
    }

    fs.writeFileSync(path.join(currentDir, targetDir, file), fileContent);
  });
};

main();
