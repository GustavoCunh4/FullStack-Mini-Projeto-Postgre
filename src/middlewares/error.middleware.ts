import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const message =
    err.message || (status === 500 ? 'Erro interno do servidor' : 'Erro na requisicao');

  if (status >= 500) {
    logger.error(`Erro ${status}: ${message}`);
  } else {
    logger.warn(`Erro ${status}: ${message}`);
  }

  res.status(status).json({ error: message });
}
