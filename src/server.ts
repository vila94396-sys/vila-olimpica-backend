import 'dotenv/config';
import app from './app';
import { initDb } from './lib/db';
import { getJwtSecret } from './lib/security';

const PORT = process.env.PORT || 3001;

getJwtSecret();
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (db init failed)`);
  });
});
