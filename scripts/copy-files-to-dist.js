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

      if (pkgJson.name !== '@dedot/cli') {
        pkgJson.module = './index.js';
        pkgJson.types = './index.d.ts';
      }

      if (!['@dedot/chaintypes', '@dedot/cli'].includes(pkgJson.name)) {
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

  // Resolve dirname conflict issue for cjs & esm
  // TODO we should have a better way to handle this!!!
  if (currentDir.endsWith('packages/codegen')) {
    // remove unrelated files
    const toRemove = ['generator/dirname.cjs', 'generator/dirname.d.cts', 'cjs/generator/dirname.mjs'];

    toRemove.forEach((file) => fs.rmSync(path.resolve(currentDir, targetDir, file), { force: true }));

    // change file names
    fs.renameSync(
      path.resolve(currentDir, targetDir, 'generator/dirname.mjs'),
      path.resolve(currentDir, targetDir, 'generator/dirname.js'),
    );

    fs.renameSync(
      path.resolve(currentDir, targetDir, 'generator/dirname.d.mts'),
      path.resolve(currentDir, targetDir, 'generator/dirname.d.ts'),
    );

    fs.renameSync(
      path.resolve(currentDir, targetDir, 'cjs/generator/dirname.cjs'),
      path.resolve(currentDir, targetDir, 'cjs/generator/dirname.js'),
    );
  }
};

main();
