#!/usr/bin/env bash
echo "Tentando acessar /protected sem token..."
curl -i -X GET http://localhost:3000/protected
