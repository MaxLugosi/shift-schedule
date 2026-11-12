import 'dotenv/config';
import { createDb } from './client.js';
import { seedIfEmpty } from './seed.js';

const handle = await createDb();
await handle.migrate();
const seeded = await seedIfEmpty(handle.db);
console.log(seeded ? 'Seed: demo data inserted' : 'Seed: database is not empty, skipped');
await handle.close();
