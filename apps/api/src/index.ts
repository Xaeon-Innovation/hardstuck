import http from 'http';
import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { initJobQueues } from './jobs/queues';
import { initSockets } from './sockets';

async function main() {
  await connectDb();
  console.log('MongoDB connected');

  initJobQueues();

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);

  server.listen(env.port, () => {
    console.log(`HardStuck API listening on :${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});
