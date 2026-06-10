import { NextFunction, Request, Response } from 'express';
import supabase from '../config/supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  companyId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice('Bearer '.length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, company_id')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Profile not found. Please complete registration.' });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      companyId: profile.company_id,
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireEmployer = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'EMPLOYER') {
    return res.status(403).json({ error: 'Access denied. Employer only.' });
  }
  next();
};
