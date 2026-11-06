::: {align="center"}
# ⚡ Connectly

### Real-time conversations. Built from the ground up.

A full-stack messaging application built to explore modern backend
engineering --- REST APIs, relational data modelling, JWT
authentication, persistent WebSocket connections, and cloud deployment.

[![Live
App](https://img.shields.io/badge/🚀_Live_App-Open_Connectly-7C3AED?style=for-the-badge)](https://live-comms-15ey-git-main-mns-projects-fbcb9964.vercel.app)
[![Backend](https://img.shields.io/badge/⚙️_Backend-FastAPI-009688?style=for-the-badge)](https://livecomms-backend-1.onrender.com)
[![API
Docs](https://img.shields.io/badge/📚_API_Docs-Swagger-85EA2D?style=for-the-badge)](https://livecomms-backend-1.onrender.com/docs)
[![GitHub](https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/ngmn003/LiveComms)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?style=flat-square&logo=typescript&logoColor=white)
![WebSockets](https://img.shields.io/badge/WebSockets-Realtime-7C3AED?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
:::

------------------------------------------------------------------------

## ✨ Overview

**Connectly** is a real-time messaging application featuring user
authentication, private and group conversations, message history, and
live message updates.

The goal was to build a working full-stack application while learning
how the backend pieces fit together --- from API design and database
operations to WebSockets and deployment.

## 🌐 Live Demo

  -------------------------------------------------------------------------------------------------------------------
  Service                             Link
  ----------------------------------- -------------------------------------------------------------------------------
  Frontend                            [Open
                                      Connectly](https://live-comms-15ey-git-main-mns-projects-fbcb9964.vercel.app)

  Backend                             [FastAPI service](https://livecomms-backend-1.onrender.com)

  API documentation                   [Swagger UI](https://livecomms-backend-1.onrender.com/docs)

  Source code                         [GitHub repository](https://github.com/ngmn003/LiveComms)
  -------------------------------------------------------------------------------------------------------------------

> The backend is hosted on Render, the frontend on Vercel, and
> PostgreSQL on Neon. Free-tier services may take a little time to wake
> up after inactivity.

## 🚀 Features

-   🔐 JWT-based user registration and login.
-   👥 Search for users.
-   💬 Private one-to-one conversations.
-   🧑‍🤝‍🧑 Group conversations.
-   ⚡ WebSocket connections for live message updates.
-   🗂️ Persistent message history stored in PostgreSQL.
-   📱 React + TypeScript web interface.

## 🏗️ Architecture

``` mermaid
flowchart TD
    U["👤 User"] --> FE["⚛️ React + TypeScript"]
    FE -->|"HTTP / REST"| API["🚀 FastAPI Backend"]
    FE <-->|"WebSocket events"| WS["⚡ WebSocket Endpoint"]
    API --> ORM["SQLAlchemy ORM"]
    ORM --> DB[("🐘 PostgreSQL / Neon")]
    API --> AUTH["🔐 JWT Authentication"]
```

### REST and WebSocket responsibilities

  -----------------------------------------------------------------------
  Technology                          Responsibility
  ----------------------------------- -----------------------------------
  REST / HTTP                         Registration, login, user search,
                                      conversation operations, message
                                      history, and sending messages

  WebSockets                          Persistent client connection used
                                      to deliver live message updates

  SQLAlchemy                          Maps Python models to relational
                                      tables and manages database
                                      operations

  JWT                                 Provides signed authentication
                                      tokens for protected operations and
                                      WebSocket connections
  -----------------------------------------------------------------------

### Message flow

``` mermaid
sequenceDiagram
    participant S as Sender
    participant UI as React Client
    participant API as FastAPI
    participant DB as PostgreSQL
    participant WS as WebSocket Manager
    participant R as Recipient

    S->>UI: Send message
    UI->>API: HTTP request + JWT
    API->>API: Validate user and request
    API->>DB: Save message
    DB-->>API: Saved message
    API->>WS: Trigger live update
    WS-->>R: WebSocket event
    API-->>UI: HTTP response
```

**Implementation note:** Message creation is handled through REST.
WebSockets deliver live updates to connected clients. The current
connection manager stores active connections in application memory; it
is a learning/MVP implementation, not a distributed multi-instance
messaging system.

## 🛠️ Tech Stack

  Layer                        Technologies
  ---------------------------- -------------------------------------
  Backend                      Python, FastAPI, Uvicorn
  Database                     PostgreSQL, SQLAlchemy 2.0, Psycopg
  Validation & configuration   Pydantic, Pydantic Settings
  Authentication               JWT
  Real-time communication      WebSockets
  Frontend                     React, TypeScript, Vite, CSS
  Local development            Docker, Docker Compose
  Version control              Git, GitHub
  Deployment                   Render, Neon, Vercel

## 🗃️ Database Design

The core relational entities are:

``` mermaid
erDiagram
    USERS ||--o{ CONVERSATION_MEMBERS : joins
    CONVERSATIONS ||--o{ CONVERSATION_MEMBERS : contains
    USERS ||--o{ MESSAGES : sends
    CONVERSATIONS ||--o{ MESSAGES : contains

    USERS {
        int id PK
        string username
        string email
        string hashed_password
    }
    CONVERSATIONS {
        int id PK
        string name
        datetime created_at
    }
    CONVERSATION_MEMBERS {
        int user_id FK
        int conversation_id FK
    }
    MESSAGES {
        int id PK
        int sender_id FK
        int conversation_id FK
        text content
        datetime created_at
    }
```

-   **users** --- account information and password hashes.
-   **conversations** --- private or group chat records.
-   **conversation_members** --- many-to-many relationship between users
    and conversations.
-   **messages** --- message content, sender, conversation, and
    timestamp.

## 💻 Run Locally

### Prerequisites

-   Python 3.12
-   Node.js and npm
-   Docker Desktop
-   Git

### 1. Clone the repository

``` bash
git clone https://github.com/ngmn003/LiveComms.git
cd LiveComms/connectly
```

### 2. Configure environment variables

Create or update `.env` in the `connectly/` directory. The variable
names must match the backend settings.

Example:

``` env
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/connectly
SECRET_KEY=replace_with_a_long_random_secret
CORS_ORIGINS=http://localhost:5173
```

Never commit real credentials, production database URLs, or secret keys.
Keep `.env` out of Git.

### 3. Start backend and PostgreSQL

Run this from `connectly/`, where `docker-compose.yaml` is located:

``` bash
docker compose up --build
```

Stop the services:

``` bash
docker compose down
```

To also delete the local database volume and its data:

``` bash
docker compose down -v
```

**Warning:** `-v` removes persisted local database data.

### 4. Start the frontend

Open another terminal:

``` bash
cd frontend
npm install
npm run dev
```

Vite will display the local URL, usually `http://localhost:5173`.

### 5. Explore the API

When the backend is running, open:

``` text
http://localhost:8000/docs
```

Use Swagger UI to inspect and test the API endpoints.

> If your local Compose configuration or backend settings use different
> ports or environment variable names, use the values defined in those
> files.

## 🐳 What Docker Does Here

Docker Compose provides a repeatable local development environment. It
starts the PostgreSQL database and FastAPI backend as configured
services, so you do not have to install and configure the database
manually.

``` mermaid
flowchart LR
    CMD["docker compose up"] --> DB["🐘 PostgreSQL container"]
    CMD --> API["🚀 FastAPI container"]
    API --> DB
    FE["⚛️ Frontend<br/>npm run dev"] --> API
```

**Deployment distinction:** Docker Compose was used for local
development. The live application is hosted using Render (backend), Neon
(database), and Vercel (frontend). Docker was not the hosting platform
for the deployed version.

## ☁️ Deployment

``` mermaid
flowchart TD
    B["🌍 Browser"] --> V["▲ Vercel<br/>React + TypeScript"]
    V -->|"HTTPS / REST + WebSocket"| R["🚀 Render<br/>FastAPI"]
    R -->|"Database connection"| N[("🐘 Neon<br/>PostgreSQL")]
```

  Component             Hosting platform
  --------------------- ------------------
  Frontend              Vercel
  Backend API           Render
  PostgreSQL database   Neon

## 📁 Project Structure

``` text
LiveComms/
└── connectly/
    ├── backend/
    │   ├── app/
    │   │   ├── routes/
    │   │   ├── schemas/
    │   │   ├── db/
    │   │   └── main.py
    │   ├── requirements.txt
    │   └── .python-version
    │
    ├── frontend/
    │   ├── src/
    │   ├── public/
    │   ├── package.json
    │   └── vite.config.ts
    │
    ├── .env
    ├── .gitignore
    ├── docker-compose.yaml
    └── README.md
```

*High-level structure; individual files may evolve as the project
grows.*

## 🎯 What I Learned

-   Building REST APIs with FastAPI.
-   Organizing backend code into routes, schemas, and database modules.
-   Relational database design with PostgreSQL.
-   Using SQLAlchemy to work with database records.
-   Request and response validation with Pydantic.
-   JWT-based authentication.
-   Establishing and managing WebSocket connections.
-   Connecting a React + TypeScript frontend to a Python backend.
-   Running local services with Docker Compose.
-   Version control with Git/GitHub and deploying a full-stack
    application.

## 🔭 Potential Improvements

The current application is an MVP and a learning project. Possible next
steps:

-   Redis Pub/Sub for real-time events across multiple backend
    instances.
-   Alembic database migrations.
-   WebSocket reconnection and stronger connection lifecycle handling.
-   Typing indicators and message delivery/read receipts.
-   Pagination for message history.
-   Automated backend and frontend tests.
-   Rate limiting and additional production security.
-   Refresh-token rotation and account verification.

------------------------------------------------------------------------

::: {align="center"}
## Built to learn. Deployed to share. ⚡

If you find Connectly interesting, consider giving the repository a ⭐

[![Explore on
GitHub](https://img.shields.io/badge/Explore_the_Code-181717?style=for-the-badge&logo=github)](https://github.com/ngmn003/LiveComms)
[![Try the Live
App](https://img.shields.io/badge/Try_Connectly-7C3AED?style=for-the-badge)](https://live-comms-15ey-git-main-mns-projects-fbcb9964.vercel.app)
:::
