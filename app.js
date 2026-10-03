const els = {
  text: document.querySelector('#quote-text'),
  source: document.querySelector('#quote-source'),
  tags: document.querySelector('#quote-tags'),
  number: document.querySelector('#quote-number'),
  activeTag: document.querySelector('#active-tag'),
  tagList: document.querySelector('#tag-list'),
  next: document.querySelector('#new-quote'),
  copy: document.querySelector('#copy-quote'),
  copyStatus: document.querySelector('#copy-status'),
  openSubmitButtons: document.querySelectorAll('[data-open-submit]'),
  closeSubmit: document.querySelector('#close-submit'),
  cancelSubmit: document.querySelector('#cancel-submit'),
  submitDialog: document.querySelector('#submit-dialog'),
  submissionForm: document.querySelector('#submission-form'),
  submissionQuote: document.querySelector('#submission-quote'),
  submissionAuthor: document.querySelector('#submission-author'),
  submissionTags: document.querySelector('#submission-tags')
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
  els.number.textContent = `QUOTE NO. ${String(index).padStart(3, '0')}`;
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
    button.textContent = tag === 'all' ? 'All quotes' : labelFor(tag);
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

function buildIssueUrl({ quote, author, tags }) {
  const titleText = quote.length > 60 ? `${quote.slice(0, 57).trim()}…` : quote;
  const quotedText = quote.split('\n').map((line) => `> ${line}`).join('\n');
  const body = [
    '## Quote',
    quotedText,
    '',
    '## Author',
    author,
    '',
    '## Tags',
    tags,
    '',
    '---',
    'Submitted through Quotes-R-Us.'
  ].join('\n');
  const params = new URLSearchParams({
    title: `Quote submission: ${titleText}`,
    body,
    labels: 'quote-submission'
  });
  return `https://github.com/numerate64/quotes-r-us/issues/new?${params}`;
}

function openSubmissionDialog() {
  els.submitDialog.showModal();
  window.setTimeout(() => els.submissionQuote.focus(), 0);
}

function closeSubmissionDialog() {
  els.submitDialog.close();
}

async function init() {
  try {
    const response = await fetch('sample-quotes.json');
    if (!response.ok) throw new Error('Quote collection unavailable');
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Quote collection is empty');
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
els.openSubmitButtons.forEach((button) => button.addEventListener('click', openSubmissionDialog));
els.closeSubmit.addEventListener('click', closeSubmissionDialog);
els.cancelSubmit.addEventListener('click', closeSubmissionDialog);
els.submitDialog.addEventListener('click', (event) => {
  if (event.target === els.submitDialog) closeSubmissionDialog();
});
els.submissionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const submission = {
    quote: els.submissionQuote.value.trim(),
    author: els.submissionAuthor.value.trim(),
    tags: els.submissionTags.value.trim()
  };
  if (!submission.quote || !submission.author || !submission.tags) {
    els.submissionForm.reportValidity();
    return;
  }
  window.open(buildIssueUrl(submission), '_blank', 'noopener,noreferrer');
  els.submissionForm.reset();
  closeSubmissionDialog();
});
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat && event.target === document.body) {
    event.preventDefault();
    nextQuote();
  }
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

init();
