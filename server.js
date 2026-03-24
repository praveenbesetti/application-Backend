require('dotenv').config();
const app       = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 QuickBasket API running on port ${PORT}`);
    console.log(`📌 ENV: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Admin:  http://localhost:${PORT}/admin`);
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  process.exit(1);
});

start();
