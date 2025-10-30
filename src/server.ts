import 'dotenv/config';
import { connectDB } from './database/connection';
import { logger } from './utils/logger';
import app from './app';

const port = process.env.PORT || 3000;

(async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      logger.info(`Servidor rodando em http://localhost:${port}`);
    });
  } catch (err: any) {
    logger.error(`Falha ao iniciar: ${err.message}`);
    process.exit(1);
  }
})();
