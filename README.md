# Quotes-R-Us

A browser-stored quote app hosted on GitHub Pages, with optional ECS Fargate and DynamoDB deployment files kept for server-backed experiments.

## Features

- Simple homepage with one quote and a refresh button.
- 1,000 original, anonymous sarcastic and funny sample quotes, mixed with your saved quotes on refresh.
- Samples stay out of your personal library and browser storage; [about the sample collection](SAMPLE_QUOTES.md).
- Submit quotes with an optional author/source and comma-separated tags.
- Browse, search, and show submitted quotes on the library page.
- Store quotes in each visitor's browser with `localStorage`.

## GitHub Pages

The live browser-only site is hosted at:

```text
https://numerate64.github.io/quotes-r-us/
```

Quotes saved there are private to that browser/device. They are not shared across visitors and are not written to GitHub.

## Run locally

For the browser-only version, serve the files with any static web server:

```bash
python3 -m http.server 3000
```

Then visit:

```text
http://localhost:3000
```

You can also run the optional Express server:

```bash
npm install
npm run dev
```

## Public quote access

[API documentation and live demo](https://numerate64.github.io/quotes-r-us/api.html).

The GitHub Pages version provides a public [JSON collection](https://numerate64.github.io/quotes-r-us/sample-quotes.json) and a browser JavaScript helper:

```js
import { getRandomQuote } from 'https://numerate64.github.io/quotes-r-us/quote-api.js';
const quote = await getRandomQuote();
console.log(quote.text, quote.source);
```

Use a browser `type="module"` script. The helper downloads the collection once, then selects randomly on the client. It throws on failed requests and retries on the next call. No key is required. The JSON response is an array of objects with `id`, `text`, `source`, `tags`, and `createdAt`.

For a **server-selected random quote per HTTP request**, start the Express server (`npm ci && npm start`) or deploy it using [the AWS guide](DEPLOY_AWS.md):

```bash
curl http://localhost:3000/api/v1/quotes/random
```

Response: `{ "quote": { "id": "...", "text": "...", "source": "Anonymous", "tags": ["humor"], "createdAt": "..." } }`.

This read-only endpoint selects from the bundled 1,000 samples, requires no database or key, allows cross-origin GET requests, and disables response caching. It is **not live on GitHub Pages**; Pages is static hosting. No new AWS deployment was provisioned for this feature. For calls from HTTPS websites, deploy the backend behind HTTPS as well (the existing AWS template defaults to HTTP).

Neither public interface exposes browser-saved quotes or applies browser-local Admin deletions. The older database API below is separate.

## Optional API

```text
GET  /health
GET  /api/quotes
GET  /api/quotes/random
POST /api/quotes
```

Example:

```bash
curl -X POST http://localhost:3000/api/quotes \
  -H 'content-type: application/json' \
  -d '{"text":"Ship the useful thing.","source":"Quotes-R-Us","tags":["build"]}'
```

## ECS Fargate Deployment

The repo includes:

- `Dockerfile` for the Node/Express container.
- `deploy/cloudformation.yml` for ECS Fargate, an Application Load Balancer, CloudWatch Logs, task roles, and DynamoDB.
- `scripts/deploy-fargate.sh` to build, push to ECR, and deploy the CloudFormation stack.

Detailed deployment instructions are in [`DEPLOY_AWS.md`](DEPLOY_AWS.md).

Required local tools:

- AWS CLI authenticated to the target AWS account.
- Docker.
- A VPC with at least two public subnets.

Set the target network and deploy:

```bash
export AWS_REGION=us-east-1
export VPC_ID=vpc-xxxxxxxx
export PUBLIC_SUBNET_IDS=subnet-aaaaaaaa,subnet-bbbbbbbb

./scripts/deploy-fargate.sh
```

The script creates an ECR repo if needed, pushes the image, deploys the stack, and prints the load balancer URL.

To delete the AWS test environment later:

```bash
./scripts/destroy-fargate.sh
```

## Cost Estimate

AWS pricing changes by Region and over time, so treat this as a planning estimate rather than a bill guarantee. These numbers assume `us-east-1`, one always-on Fargate task, the default template values of `0.25 vCPU` and `512 MB` memory, low traffic, and no NAT Gateway.

| Resource | Estimate | Notes |
| --- | ---: | --- |
| ECS Fargate task | ~$9/month | One Linux/x86 task running 24/7 at `0.25 vCPU` and `512 MB`. |
| Application Load Balancer | ~$16-$23/month | Includes the hourly ALB charge; LCU usage depends on traffic. |
| DynamoDB on-demand | Usually $0-$1/month for testing | Quote reads/writes are tiny unless traffic grows. |
| CloudWatch Logs | Usually $0-$1/month for testing | Log retention is set to 14 days. |
| ECR image storage | Usually pennies | Depends on image count and size. |

Expected test deployment total: roughly **$25-$35/month** if left running all day, or about **$0.04-$0.05/hour**. The load balancer is the biggest fixed cost. Run `./scripts/destroy-fargate.sh` after testing to stop ongoing charges.

For current pricing, check:

- AWS Fargate pricing: https://aws.amazon.com/fargate/pricing/
- Elastic Load Balancing pricing: https://aws.amazon.com/elasticloadbalancing/pricing/
- DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/

## Runtime Configuration

| Name | Purpose |
| --- | --- |
| `PORT` | Container port, default `3000`. |
| `DYNAMODB_TABLE` | Enables DynamoDB storage for the optional API. |
| `QUOTE_STORE=local` | Forces file storage for the optional API. |

## Admin

Use **Admin** in the navigation to search and delete saved quotes or remove built-in samples from rotation. Each deletion requires confirmation and persists in this browser. Samples are excluded using browser storage; the bundled sample file and other visitors are unchanged. This is a local management page, not a password-protected global admin account.

The **Show sample quotes** switch in Admin includes or hides samples on the homepage and in the Admin list. It defaults to on and remembers your choice in this browser. Saved quotes and individually deleted samples are preserved; public API results are unaffected.
