const STORAGE_KEY = 'quotes-r-us:v1';
const ACTIVE_KEY = 'quotes-r-us:active';
const DELETED_SAMPLES_KEY = 'quotes-r-us:deleted-samples';
const SHOW_SAMPLES_KEY = 'quotes-r-us:show-samples';
let showSamples = localStorage.getItem(SHOW_SAMPLES_KEY) !== 'false';
const isAdmin = Boolean(document.querySelector('#admin-panel'));
let deletedSampleIds;
try {
  const ids = JSON.parse(localStorage.getItem(DELETED_SAMPLES_KEY) || '[]');
  deletedSampleIds = new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
} catch {
  deletedSampleIds = new Set();
}

let starterQuotes = [
  {
    "id": "starter-humor-meeting",
    "text": "My calendar has trust issues. Every free hour looks like a meeting it has not scheduled yet.",
    "source": "Anonymous",
    "tags": [
      "humor",
      "work"
    ],
    "createdAt": "2026-09-07T00:00:00.000Z"
  },
  {
    "id": "starter-humor-productivity",
    "text": "I made a to-do list so my unfinished business could enjoy better formatting.",
    "source": "Anonymous",
    "tags": [
      "humor",
      "adulting"
    ],
    "createdAt": "2026-09-07T00:00:00.000Z"
  },
  {
    "id": "starter-humor-housework",
    "text": "Housework is a subscription service where I am both the unpaid employee and the disappointed customer.",
    "source": "Anonymous",
    "tags": [
      "humor",
      "everyday-life"
    ],
    "createdAt": "2026-09-07T00:00:00.000Z"
  }
];

const els = {
  sampleToggle: document.querySelector('#show-samples'),
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
let activeQuoteId = localStorage.getItem(ACTIVE_KEY) || starterQuotes[0].id;

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

function visibleSamples() {
  return showSamples ? starterQuotes.filter((quote) => !deletedSampleIds.has(quote.id)) : [];
}

function allDisplayQuotes() {
  return [...quotes, ...visibleSamples()];
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

function randomQuote() {
  const pool = allDisplayQuotes();
  if (!pool.length) return;

  if (pool.length === 1) {
    setActiveQuote(pool[0].id);
    renderHome();
    return;
  }

  const currentId = findActiveQuote()?.id;
  const candidates = pool.filter((quote) => quote.id !== currentId);
  const next = candidates[Math.floor(Math.random() * candidates.length)];
  setActiveQuote(next.id);
  renderHome();
}

function renderHome() {
  if (!els.currentQuote) return;

  const quote = findActiveQuote();
  els.count.textContent = `${showSamples ? `${visibleSamples().length.toLocaleString()} samples` : 'Samples hidden'} · ${quotes.length} saved`;
  els.refresh.disabled = !quote;

  if (!quote) {
    els.currentQuote.textContent = showSamples
      ? 'Submit your first quote to start the collection.'
      : 'Samples are hidden. Submit a quote or turn samples back on in Admin.';
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
  const collection = isAdmin ? allDisplayQuotes() : quotes;
  const shown = collection.filter((quote) => quoteMatchesSearch(quote, term));
  els.list.textContent = '';

  if (!shown.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = collection.length ? 'No quotes match that search.' : (isAdmin ? 'No quotes left in this browser’s rotation.' : 'No submitted quotes yet.');
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
      const deleteButton = item.querySelector('.delete-quote');
      if (deleteButton) {
        const saved = quotes.some((entry) => entry.id === quote.id);
        deleteButton.textContent = saved ? 'Delete saved quote' : 'Delete sample';
        deleteButton.addEventListener('click', () => {
          if (!window.confirm(`Delete this ${saved ? 'saved quote' : 'sample'} from this browser?\n\n${quote.text}`)) return;
          try {
            if (saved) {
              const remaining = quotes.filter((entry) => entry.id !== quote.id);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
              quotes = remaining;
            } else {
              const remainingIds = new Set([...deletedSampleIds, quote.id]);
              localStorage.setItem(DELETED_SAMPLES_KEY, JSON.stringify([...remainingIds]));
              deletedSampleIds = remainingIds;
            }
            renderLibrary();
            showStatus(saved ? 'Saved quote deleted from this browser.' : 'Sample removed from this browser’s rotation.');
            els.search.focus();
          } catch {
            showStatus('Could not save the deletion. Check browser storage settings and try again.');
          }
        });
      }
      els.list.append(item);
    });
}

function showStatus(message) {
  if (!els.status) return;
  els.status.textContent = message;
}

function submitQuote(input) {
  const quote = createLocalQuote(input);
  quotes = [quote, ...quotes];
  saveLocalQuotes();
  return quote;
}

if (els.form) {
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = {
      text: els.text.value,
      source: els.source.value,
      tags: normalizeTags(els.tags.value)
    };

    try {
      const quote = submitQuote(input);
      setActiveQuote(quote.id);
      els.form.reset();
      els.text.focus();
      showStatus('Saved in this browser.');
    } catch (error) {
      showStatus(error.message);
    }
  });
}

if (els.sampleToggle) {
  els.sampleToggle.checked = showSamples;
  els.sampleToggle.addEventListener('change', () => {
    try {
      localStorage.setItem(SHOW_SAMPLES_KEY, String(els.sampleToggle.checked));
      showSamples = els.sampleToggle.checked;
      renderLibrary();
      showStatus(showSamples ? 'Sample quotes are now shown.' : 'Sample quotes are now hidden. Your saved quotes are unchanged.');
    } catch {
      els.sampleToggle.checked = showSamples;
      showStatus('Could not save this preference. Check browser storage settings and try again.');
    }
  });
}

function syncSamplePreference() {
  showSamples = localStorage.getItem(SHOW_SAMPLES_KEY) !== 'false';
  if (els.sampleToggle) els.sampleToggle.checked = showSamples;
  renderHome();
  renderLibrary();
}
window.addEventListener('storage', (event) => {
  if (event.key === SHOW_SAMPLES_KEY || event.key === null) syncSamplePreference();
});
window.addEventListener('pageshow', syncSamplePreference);

if (els.refresh) {
  els.refresh.addEventListener('click', randomQuote);
}

if (els.search) {
  els.search.addEventListener('input', renderLibrary);
}

async function init() {
  quotes = loadLocalQuotes();
  renderHome();
  renderLibrary();

  if (els.currentQuote || isAdmin) {
    try {
      const response = await fetch('sample-quotes.json');
      if (!response.ok) throw new Error('Sample quotes unavailable');
      const samples = await response.json();
      if (!Array.isArray(samples) || !samples.length || samples.some((quote) =>
        !quote || typeof quote.id !== 'string' || typeof quote.text !== 'string' ||
        typeof quote.source !== 'string' || !Array.isArray(quote.tags))) {
        throw new Error('Invalid sample collection');
      }
      starterQuotes = samples;
      renderHome();
      renderLibrary();
    } catch {
      // Keep the small built-in fallback and personal quotes usable.
    }
  }
}

init();
