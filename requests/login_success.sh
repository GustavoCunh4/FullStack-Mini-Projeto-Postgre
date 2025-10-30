#!/usr/bin/env bash
echo "Efetuando login e extraindo token JWT..."

response=$(curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guga.success@example.com",
    "password": "Guga123"
  }')

token=$(echo "$response" | jq -r '.token')

if [ "$token" != "null" ] && [ -n "$token" ]; then
  echo "✅ Token extraído com sucesso:"
  echo "$token"
  echo "$token" > token.txt
else
  echo "❌ Falha ao extrair token. Resposta completa:"
  echo "$response"
fi
