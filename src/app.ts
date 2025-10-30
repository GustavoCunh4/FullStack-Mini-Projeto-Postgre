import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import routes from './routes';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.static(path.resolve(__dirname, '..', 'public')));

app.use(routes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada' });
});

app.use(errorMiddleware);

export default app;
