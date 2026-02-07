from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID


class ChatMessageBase(BaseModel):
    sender: str
    extracted_5w1h: Optional[Dict[str, Any]] = None


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    message_id: UUID
    session_id: UUID

    class Config:
        from_attributes = True


class ChatSessionBase(BaseModel):
    session_summary: Optional[str] = None


class ChatSessionCreate(ChatSessionBase):
    pass


class ChatSessionResponse(ChatSessionBase):
    session_id: UUID
    user_id: UUID
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    query: str
    lat: float = 37.5665
    lon: float = 126.9780
    history: List[Dict[str, str]] = Field(default_factory=list)
    session_id: Optional[UUID] = None
