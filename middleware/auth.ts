import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db';

declare module 'express' {
  interface Request {
    user: { id: string };
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw error;
    req.user = { id: user.id };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}; 