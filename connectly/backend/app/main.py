import os
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from .database import Base, engine, get_db, SessionLocal
from .models import User, Conversation, Message
from .schemas import RegisterIn, LoginIn, ConversationIn, MessageIn
from .security import hash_password, verify_password, create_access_token, token_user_id

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Connectly API", version="1.0.0")
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
bearer = HTTPBearer(auto_error=False)

def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    if not creds:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        uid = token_user_id(creds.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user

def user_json(user):
    return {"id": user.id, "username": user.username, "email": user.email}

def conversation_json(c, user_id, db):
    last = db.query(Message).filter(Message.conversation_id == c.id).order_by(Message.created_at.desc()).first()
    return {
        "id": c.id, "title": c.title, "is_group": c.is_group,
        "members": [user_json(u) for u in c.members],
        "last_message": last.content if last else None,
        "last_message_at": last.created_at.isoformat() if last else None
    }

@app.get("/")
def root():
    return {"name": "Connectly API", "docs": "/docs", "health": "/health"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter(or_(User.email == email, User.username == data.username)).first():
        raise HTTPException(409, "Email or username already registered")
    user = User(username=data.username, email=email, password_hash=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": user_json(user)}

@app.post("/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": user_json(user)}

@app.get("/users/me")
def me(user: User = Depends(current_user)):
    return user_json(user)

@app.get("/users")
def search_users(q: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(User).filter(User.id != user.id)
    if q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(or_(User.username.ilike(term), User.email.ilike(term)))
    return [user_json(u) for u in query.order_by(User.username).limit(30).all()]

@app.get("/conversations")
def list_conversations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = db.query(Conversation).join(Conversation.members).filter(User.id == user.id).all()
    result = [conversation_json(c, user.id, db) for c in items]
    result.sort(key=lambda x: x["last_message_at"] or "", reverse=True)
    return result

@app.post("/conversations", status_code=201)
def create_conversation(data: ConversationIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ids = list(dict.fromkeys([user.id] + data.member_ids))
    members = db.query(User).filter(User.id.in_(ids)).all()
    if len(members) != len(ids):
        raise HTTPException(404, "One or more users not found")
    is_group = len(members) > 2
    if not is_group:
        # Reuse an existing one-to-one conversation.
        for c in user.conversations:
            member_ids = {m.id for m in c.members}
            if not c.is_group and member_ids == set(ids):
                return conversation_json(c, user.id, db)
    title = data.title.strip() if is_group else " • ".join(m.username for m in members if m.id != user.id)
    c = Conversation(title=title or "Group chat", is_group=is_group, members=members)
    db.add(c); db.commit(); db.refresh(c)
    return conversation_json(c, user.id, db)

@app.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, before_id: int | None = None, limit: int = 50,
                 user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(Conversation, conversation_id)
    if not c or user.id not in {m.id for m in c.members}:
        raise HTTPException(404, "Conversation not found")
    query = db.query(Message).filter(Message.conversation_id == c.id)
    if before_id:
        query = query.filter(Message.id < before_id)
    rows = query.order_by(Message.id.desc()).limit(min(max(limit, 1), 100)).all()
    rows.reverse()
    return [{"id": m.id, "conversation_id": m.conversation_id, "sender": user_json(m.sender),
             "content": m.content, "created_at": m.created_at.isoformat()} for m in rows]

@app.post("/conversations/{conversation_id}/messages", status_code=201)
async def send_message(conversation_id: int, data: MessageIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(Conversation, conversation_id)
    if not c or user.id not in {m.id for m in c.members}:
        raise HTTPException(404, "Conversation not found")
    msg = Message(conversation_id=c.id, sender_id=user.id, content=data.content.strip())
    db.add(msg); db.commit(); db.refresh(msg)
    payload = {"id": msg.id, "conversation_id": c.id, "sender": user_json(user),
               "content": msg.content, "created_at": msg.created_at.isoformat()}
    # Await broadcasts on this worker's active WebSocket connections.
    for member in c.members:
        for ws in list(active_connections.get(member.id, set())):
            try:
                await ws.send_json({"type": "new_message", "message": payload})
            except Exception:
                active_connections.get(member.id, set()).discard(ws)
    return payload

active_connections: dict[int, set[WebSocket]] = {}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str):
    try:
        uid = token_user_id(token)
    except ValueError:
        await ws.close(code=1008); return
    db = SessionLocal()
    if not db.get(User, uid):
        db.close(); await ws.close(code=1008); return
    await ws.accept()
    active_connections.setdefault(uid, set()).add(ws)
    try:
        await ws.send_json({"type": "connected", "user_id": uid})
        while True:
            # Client may send ping; chat messages are sent through authenticated REST API.
            data = await ws.receive_json()
            if data.get("type") == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        active_connections.get(uid, set()).discard(ws)
        if not active_connections.get(uid):
            active_connections.pop(uid, None)
        db.close()
