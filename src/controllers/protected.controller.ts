import { Request, Response } from 'express';

export function protectedPing(_req: Request, res: Response) {
  return res.status(200).json({ message: 'Acesso autorizado' });
}
