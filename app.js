const els = {
  text: document.querySelector('#quote-text'),
  source: document.querySelector('#quote-source'),
  tags: document.querySelector('#quote-tags'),
  number: document.querySelector('#quote-number'),
  activeTag: document.querySelector('#active-tag'),
  tagList: document.querySelector('#tag-list'),
  next: document.querySelector('#new-quote'),
  copy: document.querySelector('#copy-quote'),
  copyStatus: document.querySelector('#copy-status')
};

let quotes = [];
let current = null;
let activeTag = 'all';
let lastId = null;

function labelFor(tag) {
  return tag.replaceAll('-', ' ');
}

function filteredQuotes() {
  return activeTag === 'all' ? quotes : quotes.filter((quote) => quote.tags.includes(activeTag));
}

function chooseQuote() {
  const pool = filteredQuotes();
  if (!pool.length) return null;
  const choices = pool.length > 1 ? pool.filter((quote) => quote.id !== lastId) : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

function renderQuote(quote) {
  if (!quote) return;
  current = quote;
  lastId = quote.id;
  const index = quotes.findIndex((item) => item.id === quote.id) + 1;
  els.text.textContent = quote.text;
  els.source.textContent = `— ${quote.source}`;
  els.number.textContent = `NO. ${String(index).padStart(3, '0')} / ${quotes.length}`;
  els.activeTag.textContent = activeTag === 'all' ? 'ALL QUOTES' : labelFor(activeTag).toUpperCase();
  els.tags.replaceChildren(...quote.tags.map((tag) => {
    const span = document.createElement('span');
    span.textContent = `#${labelFor(tag)}`;
    return span;
  }));
}

function nextQuote() {
  renderQuote(chooseQuote());
  els.next.classList.remove('is-spinning');
  requestAnimationFrame(() => els.next.classList.add('is-spinning'));
}

function renderTags() {
  const tags = ['all', ...new Set(quotes.flatMap((quote) => quote.tags).filter((tag) => tag !== 'humor' && tag !== 'sarcasm'))];
  const fragment = document.createDocumentFragment();
  tags.forEach((tag) => {
    const button = document.createElement('button');
    button.className = 'tag-button';
    button.type = 'button';
    button.textContent = tag === 'all' ? `All · ${quotes.length}` : labelFor(tag);
    button.dataset.tag = tag;
    button.setAttribute('aria-pressed', String(tag === activeTag));
    button.addEventListener('click', () => {
      activeTag = tag;
      els.tagList.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.tag === tag)));
      nextQuote();
    });
    fragment.append(button);
  });
  els.tagList.replaceChildren(fragment);
}

async function copyCurrent() {
  if (!current) return;
  const value = `“${current.text}” — ${current.source}`;
  try {
    await navigator.clipboard.writeText(value);
    els.copyStatus.textContent = 'Copied.';
  } catch {
    els.copyStatus.textContent = 'Copy unavailable.';
  }
  window.setTimeout(() => { els.copyStatus.textContent = ''; }, 1800);
}

async function init() {
  try {
    const response = await fetch('sample-quotes.json');
    if (!response.ok) throw new Error('Quote collection unavailable');
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== 600) throw new Error('Quote collection is incomplete');
    quotes = data;
    renderTags();
    nextQuote();
  } catch (error) {
    els.text.textContent = 'The jokes are taking an unscheduled break.';
    els.source.textContent = '— Quotes-R-Us';
    els.number.textContent = 'COLLECTION UNAVAILABLE';
    console.error(error);
  }
}

els.next.addEventListener('click', nextQuote);
els.copy.addEventListener('click', copyCurrent);
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat && event.target === document.body) {
    event.preventDefault();
    nextQuote();
  }
});

init();
