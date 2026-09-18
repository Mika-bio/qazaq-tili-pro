'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const { openDatabase, isSeeded } = require('./db');
const { seed } = require('./seed');
const api = require('./api');

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await openDatabase();
  if (!isSeeded()) {
    console.log('[boot] seeding database...');
    await seed();
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', api);

  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // SPA fallback
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ҚАЗАҚ ТІЛІ PRO → http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
