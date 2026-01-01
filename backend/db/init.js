import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'worktoken.db');
const schemaPath = join(__dirname, 'schema.sql');

const db = new sqlite3.Database(dbPath);

console.log('Initializing database...');

const schema = readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
  if (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
  console.log('Database initialized successfully at:', dbPath);
  db.close();
});
