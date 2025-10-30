#!/usr/bin/env bash
curl -i -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Carol",
    "email":"carol@example.com",
    "password":"123"
  }'
