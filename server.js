import express from 'express';
import { readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { QuoteStore } from './src/quote-store.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const store = new QuoteStore();

app.use(express.json({ limit: '32kb' }));
// Only publish the UI assets, never local data files or server source.
const publicFiles = ['index.html', 'submit.html', 'library.html', 'admin.html',
  'api.html', 'app.js', 'quote-api.js', 'api-demo.js', 'styles.css', 'sample-quotes.json'];
app.get('/', (_req, res) => res.sendFile(fileURLToPath(new URL('index.html', import.meta.url))));
for (const file of publicFiles) {
  app.get(`/${file}`, (_req, res) => {
    if (['sample-quotes.json', 'quote-api.js'].includes(file)) res.set('Access-Control-Allow-Origin', '*');
    res.sendFile(fileURLToPath(new URL(file, import.meta.url)));
  });
}

const publicQuotes = JSON.parse(readFileSync(new URL('sample-quotes.json', import.meta.url), 'utf8'));
app.use('/api/v1', (_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.set('Cache-Control', 'no-store');
  next();
});
app.options('/api/v1/quotes/random', (_req, res) => res.sendStatus(204));
app.get('/api/v1/quotes/random', (_req, res) => {
  res.json({ quote: publicQuotes[randomInt(publicQuotes.length)] });
});

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8))];
  }

  return [...new Set(
    String(value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8)
  )];
}

function cleanQuote(input) {
  const text = String(input.text || input.quote || '').trim();
  const source = String(input.source || '').trim() || 'Unknown';
  const tags = normalizeTags(input.tags);

  if (text.length < 2 || text.length > 500) {
    const error = new Error('Quote text must be between 2 and 500 characters.');
    error.statusCode = 400;
    throw error;
  }

  if (source.length > 80) {
    const error = new Error('Source must be 80 characters or fewer.');
    error.statusCode = 400;
    throw error;
  }

  return { text, source, tags };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/quotes', async (_req, res, next) => {
  try {
    res.json({ quotes: await store.listQuotes() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/quotes/random', async (_req, res, next) => {
  try {
    const quote = await store.randomQuote();
    if (!quote) {
      return res.status(404).json({ error: 'No quotes available.' });
    }
    res.json({ quote });
  } catch (error) {
    next(error);
  }
});

app.post('/api/quotes', async (req, res, next) => {
  try {
    const quote = await store.createQuote(cleanQuote(req.body || {}));
    res.status(201).json({ quote });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.statusCode || 500;
  res.status(status).json({
    error: status >= 500 ? 'Something went wrong.' : error.message
  });
});

const server = app.listen(port, () => {
  console.log(`Quotes-R-Us listening on port ${server.address().port}`);
});
