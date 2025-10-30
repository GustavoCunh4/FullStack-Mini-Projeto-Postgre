import request from 'supertest';
import app from '../src/app';
import { connectDB, getPool } from '../src/database/connection';

async function main() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test_secret_for_smoke_checks_123';
  process.env.JWT_EXPIRES = '1h';

  await connectDB();

  const pool = getPool();
  await pool.query('TRUNCATE tasks, users CASCADE');

  const agent = request(app);

  const registerRes = await agent.post('/register').send({
    name: 'Smoke Test',
    email: 'smoke@example.com',
    password: 'Password123'
  });
  console.log('Register status:', registerRes.status);

  const duplicateRes = await agent.post('/register').send({
    name: 'Smoke Test',
    email: 'smoke@example.com',
    password: 'Password123'
  });
  console.log('Register duplicate status:', duplicateRes.status);

  const loginRes = await agent.post('/login').send({
    email: 'smoke@example.com',
    password: 'Password123'
  });
  console.log('Login status:', loginRes.status);
  const token = loginRes.body.token;

  const protectedRes = await agent
    .get('/protected')
    .set('Authorization', `Bearer ${token}`);
  console.log('Protected w/ token status:', protectedRes.status);

  const protectedNoToken = await agent.get('/protected');
  console.log('Protected w/out token status:', protectedNoToken.status);

  const protectedInvalid = await agent
    .get('/protected')
    .set('Authorization', 'Bearer INVALID_TOKEN');
  console.log('Protected invalid token status:', protectedInvalid.status);

  const createTaskRes = await agent
    .post('/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Primeira tarefa',
      description: 'Criada no smoke test',
      priority: 'high',
      status: 'pending',
      dueDate: '2025-12-31'
    });
  console.log('Create task status:', createTaskRes.status);
  const taskId = createTaskRes.body.task?.id;

  const listTasksRes = await agent
    .get('/tasks')
    .set('Authorization', `Bearer ${token}`);
  console.log('List tasks status:', listTasksRes.status);

  if (taskId) {
    const taskGetRes = await agent
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);
    console.log('Get task status:', taskGetRes.status);
  }

  const listNoToken = await agent.get('/tasks');
  console.log('List tasks without token status:', listNoToken.status);

  await pool.query('TRUNCATE tasks, users CASCADE');
  await pool.end();
}

main()
  .then(() => {
    console.log('Smoke test completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Smoke test failed', err);
    process.exit(1);
  });
