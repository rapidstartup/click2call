export const config = {
  port: process.env.PORT || 3002,
  environment: process.env.NODE_ENV || 'development',
  cors: {
    origins: process.env.NODE_ENV === 'production' 
      ? [
          'https://click2call.ai',
          'https://www.click2call.ai'
        ]
      : [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:3002'
        ],
    methods: ['GET', 'POST'],
    credentials: true
  }
};