import express from 'express';
import dotenv from 'dotenv';
import { schema, createMutators } from '@radhe/zero-shared';
import { PushProcessor, connectionProvider } from '@rocicorp/zero/pg';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => {
  res.send('Hello from ESM + TypeScript!');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});