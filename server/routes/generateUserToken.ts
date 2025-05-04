import { Router, Request, Response } from 'express';
import { generateUserToken } from '../lib/stream';

const router = Router();

router.post('/', async (req, res) => {
    try {
      const { userId, name } = req.body;
      
      if (!userId || !name) {
        return res.status(400).json({ error: 'Missing userId or name' });
      }
  
      const token = await generateUserToken(userId, name);
      console.log("Token:", token);
  
      return res.json({ token });
    } catch (error) {
      console.error('Error generating token:', error);
      return res.status(500).json({ error: 'Failed to generate token' });
    }
});

export default router; 