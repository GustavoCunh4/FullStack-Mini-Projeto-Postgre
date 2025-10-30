#!/usr/bin/env bash
if [ ! -f token.txt ]; then
  echo "Token não encontrado. Execute 'bash requests/login_success.sh' primeiro."
  exit 1
fi

token=$(cat token.txt)

echo "Testando /protected com token válido..."
curl -i -X GET http://localhost:3000/protected \
  -H "Authorization: Bearer $token"
