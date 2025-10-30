#!/usr/bin/env bash
curl -i -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"guga.success@example.com",
    "password":"errada123"
  }'
