#!/usr/bin/env bash
curl -i -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"nao_e_email",
    "password":"123456"
  }'
