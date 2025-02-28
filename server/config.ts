export const config = {
  port: process.env.PORT || 80,
  environment: process.env.NODE_ENV || 'development',
  cors: {
    origins: [
      'https://click2call.ai',
      'https://www.click2call.ai',
      'http://click2call.ai',
      'http://www.click2call.ai',
      'http://localhost:5173',
      'http://localhost:3000',
      '*' // Allow all origins during testing (remove in production)
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
};