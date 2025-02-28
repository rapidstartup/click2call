export const config = {
  port: process.env.PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
  cors: {
    origins: [
      'https://click2call.ai',
      'https://www.click2call.ai',
      'http://localhost:5173',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
};