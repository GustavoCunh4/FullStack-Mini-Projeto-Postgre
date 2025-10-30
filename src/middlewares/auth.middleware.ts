import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ error: 'Token nao informado' });
  }

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Formato de Authorization invalido' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Configuracao JWT ausente' });
  }

  try {
    const payload = jwt.verify(token, secret);
    (req as AuthRequest).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
}
