'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');

test('oyun bildirimleri kapatılması gereken tam ekran pencere değildir', () => {
  assert.match(html, /id="tableNotice"/);
  assert.doesNotMatch(html, /id="cardOverlay"/);
  assert.match(app, /setTimeout\(hideTableNotice, duration\)/);
});

test('telefon görünümünde tahta ekran genişliğine sığar', () => {
  assert.match(css, /@media\(max-width:560px\).*?\.board-shell\{min-width:0;width:100%\}/s);
  assert.match(css, /\.board-viewport\{overflow:hidden\}/);
});
