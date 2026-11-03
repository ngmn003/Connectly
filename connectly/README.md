# Connectly — Real-time chat starter

A full-stack chat MVP: React + TypeScript frontend, FastAPI backend, PostgreSQL, SQLAlchemy, JWT authentication and WebSockets.

## Features included
- Register and sign in with email/password
- JWT-protected REST endpoints
- User search
- One-to-one and group conversations
- Persisted message history
- Send messages through REST; receive live messages through WebSockets
- Responsive chat UI

## Run locally (Docker database + backend)

1. Install Docker Desktop and Node.js 20+.
2. From the project root run:

   ```bash
   docker compose up --build
   ```

3. In another terminal:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open http://localhost:5173
5. Backend Swagger docs: http://localhost:8000/docs

Without Docker, create a PostgreSQL database and set `DATABASE_URL`, then run the backend:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then run the frontend commands above.

## Frontend environment
Optional `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

## Deploy

### Backend + PostgreSQL on Railway
- Push this repository to GitHub.
- Create a Railway project and add a PostgreSQL service.
- Add a service from the GitHub repository and set its root directory to `/backend`.
- Set `DATABASE_URL` to Railway's PostgreSQL connection string. Ensure it uses the `postgresql+psycopg://` driver prefix (or adapt the URL if Railway provides `postgres://`).
- Set `SECRET_KEY` to a long random secret.
- Set `CORS_ORIGINS` to your deployed frontend origin, e.g. `https://your-app.vercel.app`.
- Set the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Generate a public domain.

### Frontend on Vercel
- Import the same GitHub repository into Vercel.
- Set the project root directory to `frontend`.
- Add `VITE_API_URL` with the public backend URL (no trailing slash).
- Deploy.

## Important production notes
This is a portfolio MVP, not a hardened production messenger. Before handling real users:
- Replace `Base.metadata.create_all()` with Alembic migrations.
- Add rate limiting, email verification, password reset, refresh-token rotation and account/session controls.
- The included WebSocket connection manager is single-process only. Run one backend instance for this MVP; add managed Redis/pub/sub and a shared connection manager before scaling to multiple backend instances. The included in-memory WebSocket manager only broadcasts within one process.
- Add delivery/read receipts, attachment storage, moderation/reporting and automated tests.
- Enforce HTTPS/WSS and set a strong unique `SECRET_KEY`.
- Do not commit `.env` files or real credentials.

## API overview
- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`
- `GET /users?q=search`
- `GET /conversations`
- `POST /conversations`
- `GET /conversations/{id}/messages`
- `POST /conversations/{id}/messages`
- `WS /ws?token=<JWT>`
