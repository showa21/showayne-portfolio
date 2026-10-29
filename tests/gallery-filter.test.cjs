const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
function node(attrs) {
  const values = new Set((attrs.class || '').split(' '));
  return {
    dataset: { filter: attrs['data-filter'], cat: attrs['data-cat'] },
    attributes: {}, listeners: {},
    classList: {
      contains: key => values.has(key),
      add: key => values.add(key), remove: key => values.delete(key),
      toggle(key, state) { if (state) values.add(key); else values.delete(key); }
    },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, fn) { this.listeners[key] = fn; }
  };
}
function elements(tag, className) {
  return [...html.matchAll(new RegExp('<'+tag+' ([^>]+)>', 'g'))]
    .map(m => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], a[2]])))
    .filter(a => (a.class || '').split(' ').includes(className)).map(node);
}
const buttons = elements('button', 'filter-btn');
const shots = elements('figure', 'shot');
const document = {
  querySelectorAll(selector) { return selector === '.filter-btn' ? buttons : selector === '.shot' ? shots : []; },
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
};
const helpers = html.slice(html.indexOf('        var $ ='), html.indexOf('        /* Mobile menu */'));
const galleryStart = html.indexOf('        /* Gallery filters */');
const gallery = html.slice(galleryStart, html.indexOf('        /* Lightbox */', galleryStart));
vm.runInNewContext(helpers + gallery, { document });
assert.equal(buttons.length, 5);
assert.equal(shots.length, 12);
assert.equal(buttons[0].attributes['aria-pressed'], 'true');
for (const category of ['training', 'demo', 'customer', 'activation', 'all', 'demo', 'all']) {
  const button = buttons.find(b => b.dataset.filter === category);
  button.listeners.click();
  const visible = shots.filter(s => !s.classList.contains('hidden'));
  assert.equal(visible.length, category === 'all' ? 12 : 3);
  assert.ok(visible.every(s => category === 'all' || s.dataset.cat === category));
  assert.equal(buttons.filter(b => b.classList.contains('active')).length, 1);
  assert.equal(buttons.filter(b => b.attributes['aria-pressed'] === 'true').length, 1);
  assert.equal(button.attributes['aria-pressed'], 'true');
}
console.log('PASS: each category shows its 3 matching photos; All restores 12; repeated switching and selected states work.');
