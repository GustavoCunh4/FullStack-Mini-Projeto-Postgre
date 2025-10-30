#!/usr/bin/env bash
curl -i -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{ "email":"dan@example.com" }'
