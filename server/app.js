import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './src/modules/auth/auth.routes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.use((req, res) => {
  res.status(404).json({ message: "Page NotFound 404" });
});

export default app;
