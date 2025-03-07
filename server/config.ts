export const config = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  cors: {
    origins: '*',  // Allow all origins since this is a widget
    methods: ['GET', 'POST'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  }
};