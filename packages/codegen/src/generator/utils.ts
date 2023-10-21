export const commentBlock = (docs: string | string[]) => {
  docs = Array.isArray(docs) ? docs : [docs];

  if (!docs || docs.length === 0) {
    return '';
  } else {
    return `
/**
${docs.map((line) => `* ${line.replaceAll(/\s+/g, ' ').trim()}`).join('\n')}
 **/
      `;
  }
}
