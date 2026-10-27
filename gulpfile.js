const { src, dest, series, parallel, watch } = require('gulp');
const fileinclude = require('gulp-file-include');
const browser = require('browser-sync').create();
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { buildIconSprite } = require('./scripts/icons.cjs');

const output = path.join(__dirname, 'dist');
const cli = path.join(__dirname, 'node_modules/@tailwindcss/cli/dist/index.mjs');
const cssArgs = [cli, '-i', 'src/css/tailwind.css', '-o', 'dist/css/style.css', '--minify'];

function clean() {
  return fs.rm(output, { recursive: true, force: true });
}
function html() {
  return src('src/*.html')
    .pipe(fileinclude({ prefix: '@@', basepath: '@file' }))
    .pipe(dest(output))
    .pipe(browser.stream());
}
function scripts() {
  return src('src/js/**/*.js').pipe(dest('dist/js')).pipe(browser.stream());
}
function assets() {
  return src('src/img/**/*', { allowEmpty: true }).pipe(dest('dist/img'));
}
function icons() {
  return buildIconSprite(path.join(__dirname, 'src'), path.join(output, 'img/icons.svg'));
}
function vendor() {
  return src([
    'node_modules/chart.js/dist/chart.umd.min.js',
    'node_modules/jspdf/dist/jspdf.umd.min.js',
  ]).pipe(dest('dist/js/vendor'));
}
function fonts() {
  return src([
    'node_modules/@fontsource-variable/exo-2/files/exo-2-{cyrillic,latin}-wght-normal.woff2',
    'node_modules/@fontsource-variable/roboto/files/roboto-{cyrillic,latin}-wght-normal.woff2',
  ]).pipe(dest('dist/fonts'));
}
function dataFiles() {
  return src('src/data/**/*', { allowEmpty: true }).pipe(dest('dist/data'));
}
function staticFiles() {
  return src('src/files/**/*', { allowEmpty: true }).pipe(dest('dist/files'));
}
async function licenses() {
  await fs.mkdir('dist/licenses', { recursive: true });
  for (const [from, to] of [
    ['node_modules/@fontsource-variable/exo-2/LICENSE', 'exo-2.txt'],
    ['node_modules/@fontsource-variable/roboto/LICENSE', 'roboto.txt'],
    ['node_modules/lucide-static/LICENSE', 'lucide.txt'],
    ['node_modules/chart.js/LICENSE.md', 'chartjs.txt'],
    ['node_modules/jspdf/LICENSE', 'jspdf.txt'],
  ])
    await fs.copyFile(from, path.join('dist/licenses', to));
}
function styles() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, cssArgs, { cwd: __dirname, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Tailwind: ${code}`))));
  });
}
const build = series(
  clean,
  parallel(html, scripts, assets, icons, vendor, fonts, styles, dataFiles, staticFiles, licenses),
);
function serve(done) {
  browser.init({ server: { baseDir: output }, port: 3000, open: false, notify: false });
  watch('src/**/*.html', series(icons, html));
  watch(['src/css/**/*.css', 'src/**/*.html', 'src/js/**/*.js'], styles);
  watch('src/js/**/*.js', scripts);
  watch('src/img/**/*', series(assets, reload));
  watch('src/data/**/*', series(dataFiles, reload));
  watch('src/files/**/*', series(staticFiles, reload));
  watch('dist/css/*.css', reload);
  done();
}
function reload(done) {
  browser.reload();
  done();
}
exports.build = build;
exports.icons = icons;
exports.watch = series(build, serve);
exports.default = exports.watch;
