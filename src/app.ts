import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'express';
import authRoutes from './routes/authRoutes';
import residentsRoutes from './routes/residentsRoutes';
import propertiesRoutes from './routes/propertiesRoutes';
import publicPropertiesRoutes from './routes/publicPropertiesRoutes';
import ffhRoutes from './routes/ffhRoutes';
import fpdRoutes from './routes/fpdRoutes';
import institutionRoutes from './routes/institutionRoutes';
import documentsRoutes from './routes/documentsRoutes';
import publicDocumentsRoutes from './routes/publicDocumentsRoutes';
import noticesRoutes from './routes/noticesRoutes';
import publicNoticesRoutes from './routes/publicNoticesRoutes';
import newsRoutes from './routes/newsRoutes';
import publicNewsRoutes from './routes/publicNewsRoutes';
import messagesRoutes from './routes/messagesRoutes';
import aboutGalleryRoutes from './routes/aboutGalleryRoutes';
import publicAboutGalleryRoutes from './routes/publicAboutGalleryRoutes';
import { UPLOADS_DIR } from './middleware/upload';

const app = express();

app.use(express.json());
// Temporarily allow all origins for dev
app.use(require('cors')({ origin: '*' }));

app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/admin/residents', residentsRoutes);
app.use('/api/admin/properties', propertiesRoutes);
app.use('/api/properties', publicPropertiesRoutes);
app.use('/api/admin/ffh', ffhRoutes);
app.use('/api/admin/fpd', fpdRoutes);
app.use('/api/admin/institutions', institutionRoutes);
app.use('/api/admin/documents', documentsRoutes);
app.use('/api/documents', publicDocumentsRoutes);
app.use('/api/admin/notices', noticesRoutes);
app.use('/api/notices', publicNoticesRoutes);
app.use('/api/admin/news', newsRoutes);
app.use('/api/news', publicNewsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin/about-gallery', aboutGalleryRoutes);
app.use('/api/about-gallery', publicAboutGalleryRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Vila Olímpica Hub Backend API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vila Olímpica Hub API is running' });
});

// Handles multer errors (invalid file type, size limit) as JSON instead of Express's default HTML page
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
});

export default app;
