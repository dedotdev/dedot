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
    let filePath = path.resolve(currentDir, file);

    // Copy the root README.md if current dir is api
    if (currentDir.endsWith('packages/api') && file === 'README.md') {
      filePath = path.resolve(currentDir, '../..', file);
    }

    if (!fs.existsSync(filePath)) {
      return;
    }

    let fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });

    if (file === 'package.json') {
      const pkgJson = JSON.parse(fileContent);
      pkgJson.main = './cjs/index.js';
      pkgJson.module = './index.js';
      pkgJson.types = './index.d.ts';

      if (pkgJson.name !== '@delightfuldot/chaintypes') {
        pkgJson.exports = {
          '.': {
            import: {
              types: './index.d.ts',
              default: './index.js',
            },
            require: {
              types: './index.d.ts',
              default: './cjs/index.js',
            },
          },
        };
      }

      fileContent = JSON.stringify(pkgJson, null, 2);
    }

    fs.writeFileSync(path.join(currentDir, targetDir, file), fileContent);
  });

  fs.writeFileSync(path.join(currentDir, targetDir, 'cjs/package.json'), `{"type": "commonjs"}`);

  // clean up
  fs.rmSync(path.join(currentDir, targetDir, 'tsconfig.build.cjs.tsbuildinfo'), { force: true });
};

main();
