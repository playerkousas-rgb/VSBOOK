import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gateSource = fs.readFileSync('web/public/store_gate_v1.0.js', 'utf8');
const context = vm.createContext({ URL, console });
vm.runInContext(gateSource, context);
const gate = context.ScoutStoreGate;
const options = { appKey: 'vsbook', mode: 'entry-gate', portalIds: ['appstore'], silentPortalIds: ['library', 'member'], allowStandalone: true, autoRedirectSeconds: 0 };

function page(referrer = '', { pass = false, standalone = false } = {}) {
  const nodes = new Map();
  function element(tag) {
    const el = { tagName: tag, children: [], attributes: {}, style: {}, textContent: '',
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k] || ''; },
      appendChild(child) { this.children.push(child); if (child.id) nodes.set(child.id, child); return child; },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
    };
    Object.defineProperty(el, 'firstChild', { get() { return this.children[0]; } });
    return el;
  }
  const document = { referrer, documentElement: element('html'), head: element('head'), body: element('body'),
    createElement: element, getElementById: (id) => nodes.get(id) || null };
  const values = new Map(pass ? [['vsbook.store_pass', '1']] : []);
  const win = { document, location: { origin: 'https://vsbook-sand.vercel.app' }, navigator: { serviceWorker: {} },
    matchMedia: () => ({ matches: standalone }), sessionStorage: {
      getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value),
    } };
  win.self = win; win.top = win;
  return { document, win, values, nodes };
}

test('入口來源精確比對、靜默放行並保留工作階段', () => {
  for (const [origin, id] of [
    ['https://scoutappstore.vercel.app/', 'appstore'],
    ['https://scout-circulars.vercel.app/', 'library'],
    ['https://member-portal-sigma-swart.vercel.app/books', 'member'],
  ]) {
    const p = page(origin);
    const decision = gate.initStoreGate(options, p.win);
    assert.equal(decision.allowed, true);
    assert.equal(decision.matchedPortalId, id);
    assert.equal(p.values.get('vsbook.store_pass'), '1');
  }
  for (const referrer of ['', 'https://scoutappstore.vercel.app.evil.com/', 'https://scout-district-portal.vercel.app/']) {
    assert.equal(gate.evaluateStoreGate(options, { referrer }).allowed, false);
  }
  assert.equal(gate.initStoreGate(options, page('', { pass: true }).win).reason, 'session-pass');
  assert.equal(gate.initStoreGate(options, page('', { standalone: true }).win).reason, 'standalone-pwa');
});

test('儲存遭封鎖時入口仍可進入，但不能保證重整通行', () => {
  const p = page('https://scoutappstore.vercel.app/');
  Object.defineProperty(p.win, 'sessionStorage', { get() { throw new Error('blocked'); } });
  assert.equal(gate.initStoreGate(options, p.win).allowed, true);
  const next = page();
  Object.defineProperty(next.win, 'sessionStorage', { get() { throw new Error('blocked'); } });
  assert.equal(gate.initStoreGate(options, next.win).allowed, false);
});

test('直接開啟顯示單一主站按鈕且不暴露底層', () => {
  const p = page();
  assert.equal(gate.initStoreGate(options, p.win).allowed, false);
  assert.equal(p.document.documentElement.getAttribute('data-store-gated'), 'missing-whitelist-entry');
  const overlay = p.nodes.get('scoutStoreGate');
  assert.equal(overlay.attributes.role, 'dialog');
  const actions = overlay.children.find((child) => child.className === 'sg-actions');
  assert.equal(actions.children.length, 1);
  assert.equal(actions.children[0].href, 'https://scoutappstore.vercel.app/');
  assert.equal(actions.children[0].target, '_top');
  assert.match(p.nodes.get('scoutStoreGateStyle').textContent, /body > :not\(#scoutStoreGate\).*display: none !important/);
});

test('閘放在 HTML head、隨 PWA 離線快取，並避開 SPA rewrite', () => {
  const html = fs.readFileSync('web/index.html', 'utf8');
  assert.ok(html.indexOf('<meta charset=') < html.indexOf('<script src="/store_gate_v1.0.js">'));
  assert.ok(html.indexOf('<script src="/store_gate_v1.0.js">') < html.indexOf('<title>'));
  assert.match(html, /portalIds: \['appstore'\], silentPortalIds: \['library', 'member'\]/);
  const sw = fs.readFileSync('web/public/sw.js', 'utf8');
  assert.match(sw, /'\/store_gate_v1\.0\.js'/);
  assert.match(fs.readFileSync('web/src/main.jsx', 'utf8'), /!document\.documentElement\.hasAttribute\('data-store-gated'\)/);
  const rewrite = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).rewrites[0].source;
  const regex = new RegExp('^' + rewrite + '$');
  assert.equal(regex.test('/store_gate_v1.0.js'), false);
  assert.equal(regex.test('/scan'), true);
});

test('支持連結使用已核實 slug、失敗隱藏並且列印不顯示', () => {
  assert.equal(gate.getAppStoreUrl('vsbook'), 'https://scoutappstore.vercel.app/?app=vsbook');
  const component = fs.readFileSync('web/src/components/StoreSupport.jsx', 'utf8');
  assert.match(component, /helper\('vsbook'\)/);
  assert.match(component, /hidden={!href}/);
  const css = fs.readFileSync('web/src/styles.css', 'utf8');
  assert.match(css, /\.store-support\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(css, /@media print\s*\{\s*\.store-support\s*\{\s*display:\s*none/);
});
