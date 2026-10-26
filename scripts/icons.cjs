const fs = require('node:fs/promises');
const path = require('node:path');

async function findIconNames(sourceDirectory) {
  const files = await fs.readdir(sourceDirectory, { recursive: true });
  const names = new Set();
  for (const file of files.filter((file) => file.endsWith('.html'))) {
    const html = await fs.readFile(path.join(sourceDirectory, file), 'utf8');
    for (const match of html.matchAll(/\bhref=["']img\/icons\.svg#([a-z][a-z0-9-]*)["']/g)) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

async function readIconSymbol(name, iconsDirectory) {
  const file = path.join(iconsDirectory, name + '.svg');
  const source = await fs.readFile(file, 'utf8');
  const svg = source.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/);
  const viewBox = svg?.[1].match(/\bviewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error(`Lucide: invalid SVG for icon "${name}"`);
  return `<symbol id="${name}" viewBox="${viewBox}">\n${svg[2].trim()}\n</symbol>`;
}

async function buildIconSprite(sourceDirectory, outputFile) {
  const iconsDirectory = path.resolve(__dirname, '../node_modules/lucide-static/icons');
  const names = await findIconNames(sourceDirectory);
  const symbols = await Promise.all(names.map((name) => readIconSymbol(name, iconsDirectory)));
  const sprite = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<!-- Lucide icons, ISC license. See ../licenses/lucide.txt. -->',
    ...symbols,
    '</svg>',
    '',
  ].join('\n');

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, sprite);
}

module.exports = { buildIconSprite };
