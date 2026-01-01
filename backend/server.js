import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import taskRoutes from './routes/tasks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'proof-of-work-token-api',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Proof of Useful Work Token API',
    version: '1.0.0',
    description: 'AI labor backed cryptocurrency - MVP',
    endpoints: {
      health: 'GET /health',
      createTask: 'POST /api/tasks',
      getTask: 'GET /api/tasks/:id',
      listTasks: 'GET /api/tasks',
      completeTask: 'POST /api/tasks/:id/complete',
      agentStats: 'GET /api/tasks/stats/agent/:wallet'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('Proof of Useful Work Token - Backend');
  console.log('===========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log('===========================================\n');
});
