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
  assert.match(html, /id="tableFeedItems"/);
  assert.doesNotMatch(html, /id="cardOverlay"/);
  assert.match(app, /setTimeout\(hideTableNotice, duration\)/);
});

test('tapular dokununca kira kartı ve renkli takas alanı açar', () => {
  assert.match(html, /id="propertyModal"/);
  assert.match(html, /id="propertyCard"/);
  assert.match(html, /id="propertyCardBody"/);
  assert.match(app, /showPropertyCard\(index\)/);
  assert.match(app, /propertyModal\.classList\.remove\('hidden'\)/);
  assert.match(app, /E\.board\.addEventListener\('click'/);
  assert.match(app, /trade-asset/);
  assert.match(css, /\.property-card\{/);
  assert.match(css, /\.trade-swatch\{/);
});

test('kart hareketleri tam rota ile hızlı animasyonlanır', () => {
  assert.match(app, /explicitMovementPath/);
  assert.match(app, /newState\.lastMovement/);
  assert.match(app, /pace === 'fast' \? 105/);
});

test('telefon görünümünde tahta ekran genişliğine sığar', () => {
  assert.match(css, /@media\(max-width:560px\).*?\.board-shell\{min-width:0;width:100%\}/s);
  assert.match(css, /\.board-viewport\{overflow:hidden\}/);
});
