// Public samples only. Never accesses personal browser storage.
const collectionUrl = new URL('./sample-quotes.json', import.meta.url);
let collectionPromise;

async function loadCollection() {
  if (!collectionPromise) {
    collectionPromise = fetch(collectionUrl).then(async (response) => {
      if (!response.ok) throw new Error(`Quote request failed (${response.status}).`);
      const quotes = await response.json();
      if (!Array.isArray(quotes) || !quotes.length || quotes.some((quote) =>
        !quote || typeof quote.id !== 'string' || typeof quote.text !== 'string' ||
        typeof quote.source !== 'string' || !Array.isArray(quote.tags))) {
        throw new Error('Invalid quote collection.');
      }
      return quotes;
    }).catch((error) => {
      collectionPromise = undefined;
      throw error;
    });
  }
  return collectionPromise;
}

/** Fetch the public collection once, then choose a random quote in the caller. */
export async function getRandomQuote() {
  const quotes = await loadCollection();
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  return { ...quote, tags: [...quote.tags] };
}
