#!/usr/bin/env bash
echo "Tentando acessar /protected com token inválido..."
curl -i -X GET http://localhost:3000/protected \
  -H "Authorization: Bearer INVALID_TOKEN_123"
