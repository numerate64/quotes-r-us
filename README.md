# Quotes-R-Us

A container-ready shared quote app for ECS Fargate and DynamoDB.

## Features

- Simple homepage with one quote and a refresh button.
- Submit quotes with an optional author/source and comma-separated tags.
- Browse, search, and show submitted quotes on the library page.
- Store shared quotes through an Express API backed by DynamoDB.
- Fall back to browser `localStorage` when the API is unavailable.

## Run locally

```bash
npm install
npm run dev
```

Then visit:

```text
http://localhost:3000
```

Local development uses `QUOTE_STORE=local`, which writes to `data/quotes.local.json`.

## API

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

## Runtime Configuration

| Name | Purpose |
| --- | --- |
| `PORT` | Container port, default `3000`. |
| `DYNAMODB_TABLE` | Enables shared DynamoDB quote storage. |
| `QUOTE_STORE=local` | Forces local file storage for development. |
