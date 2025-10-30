#!/usr/bin/env bash
echo "Registrando usuário com sucesso..."
curl -i -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Guga Teste",
    "email": "guga.success@example.com",
    "password": "Guga123"
  }'
