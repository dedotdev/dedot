const fs = require('fs');
const path = require('path');

const targetDir = '.';

const main = () => {
  if (!fs.existsSync(targetDir)) {
    return;
  }

  const currentDir = process.cwd();

  const file = 'package.json';

  let filePath = path.resolve(currentDir, file);

  if (!fs.existsSync(filePath)) {
    return;
  }

  let fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });

  if (file === 'package.json') {
    const pkgJson = JSON.parse(fileContent);
    pkgJson.type = 'commonjs';
    pkgJson.main = './dist/cjs/index.js';
    pkgJson.module = './dist/index.js';
    pkgJson.types = './dist/index.d.ts';

    if (pkgJson.name !== '@delightfuldot/chaintypes') {
      pkgJson.exports = {
        '.': {
          import: {
            types: './dist/index.d.ts',
            default: './dist/index.js',
          },
          require: {
            types: './dist/index.d.ts',
            default: './dist/cjs/index.js',
          },
        },
      };
    }

    fileContent = JSON.stringify(pkgJson, null, 2);
  }

  fs.writeFileSync(path.join(currentDir, targetDir, file), fileContent);

  fs.writeFileSync(path.join(currentDir, targetDir, 'dist/cjs/package.json'), `{"type": "commonjs"}`);

  // clean up
  // fs.rmSync(path.join(currentDir, targetDir, 'tsconfig.build.cjs.tsbuildinfo'), { force: true });
};

main();
