import { initDb } from './lib/db';

async function main() {
  console.log('Running database seed...');
  await initDb();
  console.log('Seed completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
