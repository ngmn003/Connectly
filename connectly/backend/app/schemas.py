from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ConversationIn(BaseModel):
    member_ids: list[int] = Field(min_length=1)
    title: str = Field(default="Group chat", max_length=100)

class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=5000)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
