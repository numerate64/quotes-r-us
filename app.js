const STORAGE_KEY = 'quotes-r-us:v1';
const ACTIVE_KEY = 'quotes-r-us:active';

const starterQuotes = [
  {
    id: 'starter-kent-beck',
    text: 'Make it work, make it right, make it fast.',
    source: 'Kent Beck',
    tags: ['software', 'craft'],
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'starter-charles-eames',
    text: 'The details are not the details. They make the design.',
    source: 'Charles Eames',
    tags: ['design'],
    createdAt: '2026-01-01T00:00:01.000Z'
  },
  {
    id: 'starter-dijkstra',
    text: 'Simplicity is prerequisite for reliability.',
    source: 'Edsger W. Dijkstra',
    tags: ['engineering'],
    createdAt: '2026-01-01T00:00:02.000Z'
  }
];

const els = {
  form: document.querySelector('#quote-form'),
  text: document.querySelector('#quote-text'),
  source: document.querySelector('#quote-source'),
  tags: document.querySelector('#quote-tags'),
  status: document.querySelector('#form-status'),
  count: document.querySelector('#quote-count'),
  currentQuote: document.querySelector('#current-quote'),
  currentSource: document.querySelector('#current-source'),
  currentTags: document.querySelector('#current-tags'),
  refresh: document.querySelector('#refresh-quote'),
  search: document.querySelector('#search-quotes'),
  list: document.querySelector('#quote-list'),
  template: document.querySelector('#quote-item-template')
};

let quotes = [];
let usingApi = false;
let activeQuoteId = localStorage.getItem(ACTIVE_KEY) || starterQuotes[0].id;

function apiUrl(path) {
  return `${window.QUOTES_API_BASE || ''}${path}`;
}

async function loadQuotes() {
  try {
    const response = await fetch(apiUrl('/api/quotes'), { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('API unavailable');
    const body = await response.json();
    usingApi = true;
    return Array.isArray(body.quotes) ? body.quotes : [];
  } catch {
    usingApi = false;
    return loadLocalQuotes();
  }
}

function loadLocalQuotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalQuotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

function allDisplayQuotes() {
  return quotes.length ? quotes : starterQuotes;
}

function normalizeTags(value) {
  return [...new Set(
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 6)
  )];
}

function createLocalQuote({ text, source, tags }) {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    source: source.trim() || 'Unknown',
    tags,
    createdAt: new Date().toISOString()
  };
}

function setActiveQuote(id) {
  activeQuoteId = id;
  localStorage.setItem(ACTIVE_KEY, id);
}

function findActiveQuote() {
  const pool = allDisplayQuotes();
  return pool.find((quote) => quote.id === activeQuoteId) || pool[0] || null;
}

async function randomQuote() {
  if (usingApi) {
    try {
      const response = await fetch(apiUrl('/api/quotes/random'), { headers: { Accept: 'application/json' } });
      if (response.ok) {
        const body = await response.json();
        if (body.quote) {
          setActiveQuote(body.quote.id);
          if (!quotes.some((quote) => quote.id === body.quote.id)) {
            quotes = [body.quote, ...quotes];
          }
          renderHome();
          return;
        }
      }
    } catch {
      usingApi = false;
    }
  }

  const pool = allDisplayQuotes();
  if (!pool.length) return;

  if (pool.length === 1) {
    setActiveQuote(pool[0].id);
    renderHome();
    return;
  }

  const candidates = pool.filter((quote) => quote.id !== activeQuoteId);
  const next = candidates[Math.floor(Math.random() * candidates.length)];
  setActiveQuote(next.id);
  renderHome();
}

function renderHome() {
  if (!els.currentQuote) return;

  const quote = findActiveQuote();
  els.count.textContent = usingApi ? `${quotes.length} shared` : `${quotes.length} saved`;
  els.refresh.disabled = !quote;

  if (!quote) {
    els.currentQuote.textContent = 'Submit your first quote to start the collection.';
    els.currentSource.textContent = 'Quotes-R-Us';
    els.currentTags.textContent = '';
    return;
  }

  els.currentQuote.textContent = quote.text;
  els.currentSource.textContent = quote.source;
  els.currentTags.textContent = quote.tags.length ? quote.tags.map((tag) => `#${tag}`).join(' ') : '';
}

function quoteMatchesSearch(quote, term) {
  const haystack = [quote.text, quote.source, ...quote.tags].join(' ').toLowerCase();
  return haystack.includes(term);
}

function renderLibrary() {
  if (!els.list) return;

  const term = els.search.value.trim().toLowerCase();
  const shown = quotes.filter((quote) => quoteMatchesSearch(quote, term));
  els.list.textContent = '';

  if (!shown.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = quotes.length ? 'No quotes match that search.' : 'No submitted quotes yet.';
    els.list.append(empty);
    return;
  }

  shown
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((quote) => {
      const item = els.template.content.firstElementChild.cloneNode(true);
      item.querySelector('p').textContent = quote.text;
      item.querySelector('.item-source').textContent = quote.source;
      item.querySelector('.item-tags').textContent = quote.tags.length ? quote.tags.map((tag) => `#${tag}`).join(' ') : '';
      item.querySelector('.show-quote').addEventListener('click', () => {
        setActiveQuote(quote.id);
        window.location.href = 'index.html';
      });
      els.list.append(item);
    });
}

function showStatus(message) {
  if (!els.status) return;
  els.status.textContent = message;
}

async function submitQuote(input) {
  if (usingApi) {
    const response = await fetch(apiUrl('/api/quotes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input)
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || 'Quote could not be saved.');
    }
    return body.quote;
  }

  const quote = createLocalQuote(input);
  quotes = [quote, ...quotes];
  saveLocalQuotes();
  return quote;
}

if (els.form) {
  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = {
      text: els.text.value,
      source: els.source.value,
      tags: normalizeTags(els.tags.value)
    };

    try {
      const quote = await submitQuote(input);
      if (usingApi && !quotes.some((item) => item.id === quote.id)) {
        quotes = [quote, ...quotes];
      }
      setActiveQuote(quote.id);
      els.form.reset();
      els.text.focus();
      showStatus(usingApi ? 'Saved to the shared quote database.' : 'Saved in this browser.');
    } catch (error) {
      showStatus(error.message);
    }
  });
}

if (els.refresh) {
  els.refresh.addEventListener('click', randomQuote);
}

if (els.search) {
  els.search.addEventListener('input', renderLibrary);
}

async function init() {
  quotes = await loadQuotes();
  renderHome();
  renderLibrary();
}

init();
