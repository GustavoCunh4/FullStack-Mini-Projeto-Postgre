import { Router } from 'express';
import { dbInfo } from '../controllers/debug.controller';

const router = Router();

router.get('/_debug/db', dbInfo);

export default router;

