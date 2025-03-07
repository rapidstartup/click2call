export const config = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  cors: {
    origins: process.env.NODE_ENV === 'production' 
      ? ['https://click2call.ai'] 
      : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  }
};