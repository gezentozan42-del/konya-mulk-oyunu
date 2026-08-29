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
  assert.match(app, /Otel maliyeti/);
  assert.match(app, /--owner-color/);
  assert.doesNotMatch(app, /owner\.name\.slice\(0, 2\)/);
  assert.match(css, /\.tile\.owned\{/);
  assert.match(css, /\.building-row\.hotel/);
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

test('ipotekli tapu bankaya satılabilir', () => {
  assert.match(app, /sell-to-bank/);
  assert.match(app, /Bankaya sat/);
  assert.match(css, /\.bank-sale/);
});

test('telefon yazıları okunabilir ölçeğe çıkarılır', () => {
  assert.match(css, /\.player-name b\{font-size:13px\}/);
  assert.match(css, /\.action-grid \.btn\{min-height:48px;font-size:13px\}/);
  assert.match(css, /\.tile strong\{font-size:clamp\(6\.8px,2\.1vw,9px\)/);
  assert.match(css, /\.property-modal \.property-card-top h3\{font-size:20px\}/);
});
