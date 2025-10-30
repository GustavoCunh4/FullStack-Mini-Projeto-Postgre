#!/usr/bin/env bash
curl -i -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Guga Teste",
    "email":"guga.success@example.com",
    "password":"outraSenha123"
  }'
