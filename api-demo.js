import { getRandomQuote } from './quote-api.js';
const button = document.querySelector('#try-api');
const output = document.querySelector('#api-output');
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    output.textContent = JSON.stringify({ quote: await getRandomQuote() }, null, 2);
  } catch (error) {
    output.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
