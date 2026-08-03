import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: '*', // For local development, allow any origin. In production, restrict to frontend domain.
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Increase payload limits for receiving multiple base64 face images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routing
app.use('/api', authRoutes);

// Server check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'node-backend' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Node backend running on port ${PORT}`);
});
