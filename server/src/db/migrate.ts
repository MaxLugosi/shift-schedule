import 'dotenv/config';
import { createDb } from './client.js';

const handle = await createDb();
await handle.migrate();
console.log(`Migrations applied (${handle.kind})`);
await handle.close();
