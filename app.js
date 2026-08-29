const STORAGE_KEY = 'quotes-r-us:v1';

const sampleQuotes = [
  {
    text: 'Make it work, make it right, make it fast.',
    source: 'Kent Beck',
    tags: ['software', 'craft']
  },
  {
    text: 'The details are not the details. They make the design.',
    source: 'Charles Eames',
    tags: ['design']
  },
  {
    text: 'Simplicity is prerequisite for reliability.',
    source: 'Edsger W. Dijkstra',
    tags: ['engineering']
  }
];

const els = {
  form: document.querySelector('#quote-form'),
  text: document.querySelector('#quote-text'),
  source: document.querySelector('#quote-source'),
  tags: document.querySelector('#quote-tags'),
  count: document.querySelector('#quote-count'),
  currentQuote: document.querySelector('#current-quote'),
  currentSource: document.querySelector('#current-source'),
  currentTags: document.querySelector('#current-tags'),
  refresh: document.querySelector('#refresh-quote'),
  copy: document.querySelector('#copy-quote'),
  delete: document.querySelector('#delete-quote'),
  samples: document.querySelector('#load-samples'),
  search: document.querySelector('#search-quotes'),
  list: document.querySelector('#quote-list'),
  template: document.querySelector('#quote-item-template')
};

let quotes = loadQuotes();
let activeQuoteId = quotes[0]?.id ?? null;

function loadQuotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQuotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
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

function createQuote({ text, source, tags }) {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    source: source.trim() || 'Unknown',
    tags,
    createdAt: new Date().toISOString()
  };
}

function findActiveQuote() {
  return quotes.find((quote) => quote.id === activeQuoteId) ?? quotes[0] ?? null;
}

function showQuote(id) {
  activeQuoteId = id;
  render();
}

function randomQuote() {
  if (!quotes.length) return;
  if (quotes.length === 1) {
    activeQuoteId = quotes[0].id;
    render();
    return;
  }

  const candidates = quotes.filter((quote) => quote.id !== activeQuoteId);
  const next = candidates[Math.floor(Math.random() * candidates.length)];
  activeQuoteId = next.id;
  render();
}

function renderFeatured() {
  const quote = findActiveQuote();
  els.count.textContent = `${quotes.length} saved`;
  els.delete.disabled = !quote;
  els.copy.disabled = !quote;
  els.refresh.disabled = !quotes.length;

  if (!quote) {
    els.currentQuote.textContent = 'Add your first quote to start the collection.';
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

function renderList() {
  const term = els.search.value.trim().toLowerCase();
  const shown = quotes.filter((quote) => quoteMatchesSearch(quote, term));
  els.list.textContent = '';

  if (!shown.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = quotes.length ? 'No quotes match that search.' : 'Your quote library is empty.';
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
      item.querySelector('button').addEventListener('click', () => showQuote(quote.id));
      if (quote.id === activeQuoteId) {
        item.classList.add('active');
      }
      els.list.append(item);
    });
}

function render() {
  renderFeatured();
  renderList();
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const quote = createQuote({
    text: els.text.value,
    source: els.source.value,
    tags: normalizeTags(els.tags.value)
  });

  quotes = [quote, ...quotes];
  activeQuoteId = quote.id;
  saveQuotes();
  els.form.reset();
  els.text.focus();
  render();
});

els.refresh.addEventListener('click', randomQuote);

els.copy.addEventListener('click', async () => {
  const quote = findActiveQuote();
  if (!quote) return;
  const tags = quote.tags.length ? ` ${quote.tags.map((tag) => `#${tag}`).join(' ')}` : '';
  await navigator.clipboard.writeText(`"${quote.text}" - ${quote.source}${tags}`);
  els.copy.textContent = 'Copied';
  setTimeout(() => {
    els.copy.textContent = 'Copy';
  }, 1200);
});

els.delete.addEventListener('click', () => {
  const quote = findActiveQuote();
  if (!quote) return;
  quotes = quotes.filter((item) => item.id !== quote.id);
  activeQuoteId = quotes[0]?.id ?? null;
  saveQuotes();
  render();
});

els.samples.addEventListener('click', () => {
  const additions = sampleQuotes.map(createQuote);
  quotes = [...additions, ...quotes];
  activeQuoteId = additions[0].id;
  saveQuotes();
  render();
});

els.search.addEventListener('input', renderList);

render();
