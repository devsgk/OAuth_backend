import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 OAuth Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Token endpoint: http://localhost:${PORT}/oauth/token`);
  console.log('');
  console.log('   Demo credentials: demo@example.com / password123');
});

