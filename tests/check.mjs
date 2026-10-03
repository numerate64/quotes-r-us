import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const quotes = JSON.parse(await readFile(new URL('../sample-quotes.json', import.meta.url)));
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const ids = quotes.map((quote) => quote.id);
const texts = quotes.map((quote) => quote.text);

assert.ok(quotes.length > 0, 'collection must contain at least one quote');
assert.equal(new Set(ids).size, quotes.length, 'quote IDs must be unique');
assert.equal(new Set(texts).size, quotes.length, 'quote text must be unique');
for (const quote of quotes) {
  assert.match(quote.id, /^q-\d+$/);
  assert.equal(typeof quote.text, 'string');
  assert.ok(quote.text.trim().length >= 20);
  assert.equal(typeof quote.source, 'string');
  assert.ok(Array.isArray(quote.tags) && quote.tags.length > 0);
}
assert.match(html, /id="new-quote"/);
assert.match(html, /id="tag-list"/);
assert.match(html, /id="submission-quote"/);
assert.match(html, /id="submission-author"/);
assert.match(html, /id="submission-tags"/);
console.log(`✓ ${quotes.length} unique, valid quotes and required UI hooks found`);
