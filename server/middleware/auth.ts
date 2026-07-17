import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db';

declare module 'express' {
  interface Request {
    user: { id: string };
  }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw error;
    req.user = { id: user.id };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
