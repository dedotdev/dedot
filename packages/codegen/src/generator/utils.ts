import * as fs from 'fs';
import handlebars from 'handlebars';
import * as path from 'path';
import * as prettier from 'prettier';
import * as process from 'process';

export const commentBlock = (docs: string | string[]) => {
  docs = Array.isArray(docs) ? docs : [docs];

  const docsTemplateFilePath = resolveFilePath('packages/codegen/src/templates/docs.hbs');
  const template = compileTemplate(docsTemplateFilePath);

  return template({ docs: docs.map((line) => line.replaceAll(/\s+/g, ' ').trim()) });
};

export const resolveFilePath = (relativePath: string | string[]) => {
  relativePath = Array.isArray(relativePath) ? relativePath : [relativePath];

  return path.resolve(process.cwd(), ...relativePath);
};

export const PRETTIER_FORMAT_OPTION = await prettier.resolveConfig(resolveFilePath('./.prettierrc.js'));

export const compileTemplate = (templateFilePath: string) => {
  return handlebars.compile(fs.readFileSync(templateFilePath, 'utf8'));
};

export const format = (tsInput: string) => {
  return prettier.format(tsInput, { parser: 'babel-ts', ...PRETTIER_FORMAT_OPTION });
};