import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localDataPath = path.resolve(__dirname, '..', 'data', 'quotes.local.json');

const starterQuotes = [
  {
    id: 'starter-kent-beck',
    text: 'Make it work, make it right, make it fast.',
    source: 'Kent Beck',
    tags: ['software', 'craft'],
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'starter-charles-eames',
    text: 'The details are not the details. They make the design.',
    source: 'Charles Eames',
    tags: ['design'],
    createdAt: '2026-01-01T00:00:01.000Z'
  },
  {
    id: 'starter-dijkstra',
    text: 'Simplicity is prerequisite for reliability.',
    source: 'Edsger W. Dijkstra',
    tags: ['engineering'],
    createdAt: '2026-01-01T00:00:02.000Z'
  }
];

export class QuoteStore {
  constructor() {
    this.tableName = process.env.DYNAMODB_TABLE;
    this.localOnly = process.env.QUOTE_STORE === 'local' || !this.tableName;

    if (!this.localOnly) {
      const client = new DynamoDBClient({});
      this.documentClient = DynamoDBDocumentClient.from(client);
    }
  }

  async listQuotes() {
    if (this.localOnly) {
      return this.listLocalQuotes();
    }

    const quotes = [];
    let ExclusiveStartKey;

    do {
      const result = await this.documentClient.send(new ScanCommand({
        TableName: this.tableName,
        ExclusiveStartKey
      }));
      quotes.push(...(result.Items || []));
      ExclusiveStartKey = result.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return quotes.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async randomQuote() {
    const quotes = await this.listQuotes();
    if (!quotes.length) {
      return null;
    }
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  async createQuote(input) {
    const quote = {
      id: crypto.randomUUID(),
      text: input.text,
      source: input.source,
      tags: input.tags,
      createdAt: new Date().toISOString()
    };

    if (this.localOnly) {
      const quotes = await this.listLocalQuotes();
      await this.writeLocalQuotes([quote, ...quotes.filter((item) => !item.id.startsWith('starter-'))]);
      return quote;
    }

    await this.documentClient.send(new PutCommand({
      TableName: this.tableName,
      Item: quote
    }));
    return quote;
  }

  async listLocalQuotes() {
    try {
      const raw = await fs.readFile(localDataPath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : starterQuotes;
    } catch {
      return starterQuotes;
    }
  }

  async writeLocalQuotes(quotes) {
    await fs.mkdir(path.dirname(localDataPath), { recursive: true });
    await fs.writeFile(localDataPath, `${JSON.stringify(quotes, null, 2)}\n`);
  }
}
