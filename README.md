# FullStack Mini Projeto - Backend (Node.js, TypeScript, Express, PostgreSQL, JWT)

Aplicacao backend com autenticao JWT, organizada em camadas (middlewares, routes, controllers, services, database) e persistencia em PostgreSQL. Inclui colecao de requisicoes para Insomnia em `requests/requests.yaml`.

## Sumario
- Stack e Arquitetura
- Requisitos
- Configuracao do Ambiente
- Executando Localmente
- Testando com Insomnia
- Deploy (Vercel)
- PostgreSQL em provedores gerenciados
- Docker (opcional para desenvolvimento)
- Endpoints
- Erros e Logs
- Troubleshooting
- Licenca

## Stack e Arquitetura
- Node.js + TypeScript
- Express 5
- PostgreSQL com driver `pg`
- Autenticacao JWT (`jsonwebtoken`)
- Hash de senha (`bcrypt`)
- Validacao (`express-validator`)
- Logs com `winston` + `morgan`
- Handler serverless (`serverless-http`) para Vercel

Estrutura de pastas:
- `src/database/` conexao com PostgreSQL e migracoes idempotentes
- `src/services/` regras de negocio (registro/login, tarefas)
- `src/controllers/` orquestram entrada/saida HTTP
- `src/routes/` definem rotas publicas e protegidas
- `src/middlewares/` autenticacao, validacao e tratamento de erros
- `src/utils/` infra e logging
- `api/` handler serverless utilizado na Vercel

## Requisitos
- Node.js 18+ (recomendado 20 ou 22)
- PostgreSQL local ou em provedor gerenciado
- Opcional: Docker para subir PostgreSQL rapidamente

## Configuracao do Ambiente
Crie um arquivo `.env` na raiz do projeto com as variaveis:

```
PORT=3000
NODE_ENV=development

# Desenvolvimento (local)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fullstack_mini_projeto

# Producao
DATABASE_URL_PROD=postgres://usuario:senha@host:5432/nome_db

# TLS (habilite se o provedor exigir)
# PG_SSL=true
# PG_SSL_REJECT_UNAUTHORIZED=true

# JWT
JWT_SECRET=sua_chave_bem_grande_e_secreta
JWT_EXPIRES=1h
```

Notas:
- Em desenvolvimento, o app usa `DATABASE_URL`. Em producao (`NODE_ENV=production`), usa `DATABASE_URL_PROD`.
- A conexao executa migracoes idempotentes automaticamente (criacao de tabelas e indices) na primeira vez.

## Executando Localmente
1. Instale as dependencias:
   ```
   npm install
   ```
2. Garanta um PostgreSQL ouvindo na porta configurada (ex.: `localhost:5432`).
3. Rode a aplicacao em modo desenvolvimento:
   ```
   npm run dev
   ```
4. Logs esperados: ambiente, URI mascarada e mensagem `PostgreSQL conectado com sucesso`, seguida de `Servidor rodando em http://localhost:3000`.

## Testando com Insomnia
- Importe `requests/requests.yaml` no Insomnia.
- Selecione o ambiente **Local** (canto superior esquerdo) para aplicar o `baseUrl` `http://localhost:3000` automaticamente; sem isso os endpoints ficarao vazios e retornarao erros 405/HTML.
- Colecoes incluidas: Auth (registro/login para dois usuarios), Tasks (CRUD completo com casos de erro), Protected (`/protected`) e Debug (`/_debug/db`) para ambientes nao-producao.
- Para `Protected - with valid token`, rode `Login - success` antes; a requisicao usa o token retornado. Os cenarios `without token` e `with invalid token` devem responder 401 ao apontar para a API local.

## Deploy (Vercel)
1. Suba o repositorio no GitHub (ja configurado).
2. No painel Vercel, importe o projeto e configure as variaveis de ambiente (Production):
   - `NODE_ENV=production`
   - `DATABASE_URL_PROD` (URI provida pelo seu banco gerenciado)
   - `PG_SSL=true` e `PG_SSL_REJECT_UNAUTHORIZED=true` caso o provedor exija TLS
   - `JWT_SECRET`
   - `JWT_EXPIRES=1h` (opcional)
3. O projeto inclui `vercel.json` e handler serverless em `api/index.ts` que aguarda a conexao antes de processar requisicoes.
4. No Insomnia, altere o ambiente para `Production` (definido em `requests.yaml`) e teste as rotas.

## PostgreSQL em provedores gerenciados
Passos gerais (Neon, Supabase, Render, Railway, etc.):
- Crie um banco e um usuario com permissao para o schema padrao.
- Copie a connection string (geralmente `postgres://usuario:senha@host:5432/database`).
- Defina essa string em `DATABASE_URL_PROD`.
- Se o provedor exigir TLS, defina `PG_SSL=true`. Caso permita certificados autoassinados, mantenha `PG_SSL_REJECT_UNAUTHORIZED=true`. Para certificados gerenciados com CA valida, pode permanecer `true`.
- Conceda acesso de rede (por IP ou via VPC) conforme o provedor exigir.

## Docker (opcional para desenvolvimento)
Suba um PostgreSQL local rapidamente:

```
docker run -d --name fsmp-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=fullstack_mini_projeto \
  -p 5432:5432 \
  -v fsmp_pg_data:/var/lib/postgresql/data \
  postgres:16
```

Use `DATABASE_URL=postgres://postgres:postgres@localhost:5432/fullstack_mini_projeto`.

## Endpoints
- `POST /register`
  - Body: `{ "name": string, "email": string, "password": string }`
  - `201` em sucesso; `409` se email ja existe; `422` para dados invalidos.
- `POST /login`
  - Body: `{ "email": string, "password": string }`
  - `200` em sucesso: `{ "token": string }`; `401` para credenciais invalidas; `422` para payload invalido.
- `GET /protected`
  - Header `Authorization: Bearer <token>`
  - `200` em sucesso: `{ "message": "Acesso autorizado" }`
  - `401` se token ausente ou invalido.
- `GET /tasks`
  - Query params opcionais: `status`, `priority`, `title`, `dueDate`
  - `200` com lista de tarefas do usuario autenticado.
- `POST /tasks`
  - Body: `{ "title": string, "description"?: string | null, "status"?: string, "dueDate"?: string | null, "priority"?: string }`
  - `201` em sucesso.
- `GET /tasks/:id`, `PUT /tasks/:id`, `PATCH /tasks/:id`, `DELETE /tasks/:id`
  - `:id` e UUID v4.
  - Retornam `404` se a tarefa nao existir e `403` se pertencer a outro usuario.

- `GET /protected`
  - Header `Authorization: Bearer <token>`
  - `200` quando o token e valido; `401` para token ausente/invalido.

## Erros e Logs
- Logs com `winston` (nivel `debug` em dev, `info` em prod) e `morgan` para HTTP.
- Middleware de erros retorna `{ "error": <mensagem> }` e status coerente (422, 401, 403, 404, 409, 500).
- Endpoint `/_debug/db` (apenas fora de producao) mostra estatisticas do pool PostgreSQL e qual variavel de ambiente foi usada.

## Troubleshooting
- Erro `connect ECONNREFUSED 127.0.0.1:5432`
  - Indica que nao ha processo PostgreSQL ouvindo localmente.
  - Solucoes:
    - Instale PostgreSQL (Windows Installer, brew, apt, etc.) e confirme que o servico esta ativo.
    - Use o container Docker acima.
    - Verifique firewalls bloqueando a porta 5432.
- Erro `password authentication failed for user`
  - Confirme usuario/senha no `.env`.
  - Verifique se o banco alvo existe (`POSTGRES_DB` no Docker, por exemplo).
- Erro `JWT_SECRET nao definido`
  - Garanta que `.env` tem `JWT_SECRET` e que `dotenv/config` esta habilitado (ja importado em `server.ts` e no handler serverless).
- Erro `Tarefa nao encontrada`
  - Confirme que esta usando um UUID v4 valido e que a tarefa pertence ao usuario autenticado.

## Licenca
Uso educacional - sem licenca explicita adicionada.
- Para uma validacao rapida da API, inicie um PostgreSQL local (veja a secao de Docker) e rode:
  ```
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/fullstack_mini_projeto npm run smoke
  ```
  O script executa um fluxo completo (registro, login, protecao JWT, CRUD de tarefas) e exibe os status esperados no terminal.
