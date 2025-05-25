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
    if (currentDir.endsWith('packages/dedot') && file === 'README.md') {
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

      if (pkgJson.name === '@dedot/cli') {
        pkgJson.main = './index.js';
      }

      if (!['@dedot/cli'].includes(pkgJson.name)) {
        pkgJson.exports = {
          '.': {
            types: './index.d.ts',
            import: './index.js',
            require: './cjs/index.js',
            default: './index.js',
          },
        };
      }

      if (pkgJson.name === '@dedot/api') {
        pkgJson.exports['./chaintypes'] = {
          types: './chaintypes/index.d.ts',
          import: './chaintypes/index.js',
          require: './cjs/chaintypes/index.js',
          default: './chaintypes/index.js',
        };
      }

      // Export default/generic substrate chaintypes
      if (pkgJson.name === 'dedot') {
        pkgJson.exports['./chaintypes'] = {
          types: './chaintypes/index.d.ts',
          import: './chaintypes/index.js',
          require: './cjs/chaintypes/index.js',
          default: './chaintypes/index.js',
        };
        pkgJson.exports['./codecs'] = {
          types: './codecs/index.d.ts',
          import: './codecs/index.js',
          require: './cjs/codecs/index.js',
          default: './codecs/index.js',
        };
        pkgJson.exports['./types'] = {
          types: './types/index.d.ts',
          import: './types/index.js',
          require: './cjs/types/index.js',
          default: './types/index.js',
        };
        pkgJson.exports['./types/json-rpc'] = {
          types: './types/json-rpc/index.d.ts',
          import: './types/json-rpc/index.js',
          require: './cjs/types/json-rpc/index.js',
          default: './types/json-rpc/index.js',
        };
        pkgJson.exports['./runtime-specs'] = {
          types: './runtime-specs/index.d.ts',
          import: './runtime-specs/index.js',
          require: './cjs/runtime-specs/index.js',
          default: './runtime-specs/index.js',
        };
        pkgJson.exports['./utils'] = {
          types: './utils/index.d.ts',
          import: './utils/index.js',
          require: './cjs/utils/index.js',
          default: './utils/index.js',
        };
        pkgJson.exports['./shape'] = {
          types: './shape/index.d.ts',
          import: './shape/index.js',
          require: './cjs/shape/index.js',
          default: './shape/index.js',
        };
        pkgJson.exports['./contracts'] = {
          types: './contracts/index.d.ts',
          import: './contracts/index.js',
          require: './cjs/contracts/index.js',
          default: './contracts/index.js',
        };
        pkgJson.exports['./merkleized-metadata'] = {
          types: './merkleized-metadata/index.d.ts',
          import: './merkleized-metadata/index.js',
          require: './cjs/merkleized-metadata/index.js',
          default: './merkleized-metadata/index.js',
        };
        pkgJson.exports['./smoldot'] = {
          types: './smoldot/index.d.ts',
          import: './smoldot/index.js',
          require: './cjs/smoldot/index.js',
          default: './smoldot/index.js',
        };
        pkgJson.exports['./smoldot/worker'] = {
          types: './smoldot/worker.d.ts',
          import: './smoldot/worker.js',
          require: './cjs/smoldot/worker.js',
          default: './smoldot/worker.js',
        };
        pkgJson.exports['./smoldot/with-worker'] = {
          types: './smoldot/with-worker.d.ts',
          import: './smoldot/with-worker.js',
          require: './cjs/smoldot/with-worker.js',
          default: './smoldot/with-worker.js',
        };
      }

      if (pkgJson.name === '@dedot/types') {
        pkgJson.exports['./json-rpc'] = {
          types: './json-rpc/index.d.ts',
          import: './json-rpc/index.js',
          require: './cjs/json-rpc/index.js',
          default: './json-rpc/index.js',
        };
      }

      if (pkgJson.name === '@dedot/smoldot') {
        pkgJson.exports['./worker'] = {
          types: './worker.d.ts',
          import: './worker.js',
          require: './cjs/worker.js',
          default: './worker.js',
        };
        pkgJson.exports['./with-worker'] = {
          types: './with-worker.d.ts',
          import: './with-worker.js',
          require: './cjs/with-worker.js',
          default: './with-worker.js',
        };
      }

      fileContent = JSON.stringify(pkgJson, null, 2);
    }

    fs.writeFileSync(path.join(currentDir, targetDir, file), fileContent);
  });

  const withCjsBuild = ['packages/chaintypes', 'packages/cli'].some((pkg) => currentDir.endsWith(pkg));
  if (!withCjsBuild) {
    fs.writeFileSync(path.join(currentDir, targetDir, 'cjs/package.json'), `{"type": "commonjs"}`);
  }

  // clean up
  fs.rmSync(path.join(currentDir, targetDir, 'tsconfig.build.cjs.tsbuildinfo'), { force: true });

  // Resolve dirname conflict issue for cjs & esm
  // TODO we should have a better way to handle this!!!
  if (currentDir.endsWith('packages/codegen')) {
    // remove unrelated files
    const toRemove = ['dirname.cjs', 'dirname.d.cts', 'cjs/dirname.js'];

    toRemove.forEach((file) => fs.rmSync(path.resolve(currentDir, targetDir, file), { force: true }));

    fs.renameSync(
      path.resolve(currentDir, targetDir, 'cjs/dirname.cjs'),
      path.resolve(currentDir, targetDir, 'cjs/dirname.js'),
    );
  }
};

main();
