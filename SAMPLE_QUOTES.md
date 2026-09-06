# Sample quote collection

`sample-quotes.json` contains 1,000 distinct, attributed entries selected from
[dwyl/quotes](https://github.com/dwyl/quotes/blob/65411e3f9508940f7c8a7174fcd4404e55981d9e/quotes.json).
The upstream collection is distributed under GPL-2.0; its license is reproduced
in [SAMPLE_QUOTES_LICENSE.txt](SAMPLE_QUOTES_LICENSE.txt). This separate data
collection remains under those terms.

Changes: normalized whitespace, removed normalized exact-text duplicates,
excluded missing/anonymous attributions, restricted text to 20–300 characters,
and selected 1,000 entries with a fixed shuffle seed (64). Added stable IDs,
a sample tag, and a dataset timestamp (not the date a quote was spoken).
Attributions are inherited from the source dataset, not independently verified.

Samples are bundled with the site and are never inserted into localStorage.
Refresh chooses from samples plus personal saved quotes. The library continues
to show only personal submissions. No third-party quote API is used at runtime.
