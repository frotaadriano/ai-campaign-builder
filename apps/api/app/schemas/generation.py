from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.campaigns import PartyProfile


class GenerationRequest(BaseModel):
    campaign_title: Optional[str] = None
    party_profile: Optional[PartyProfile] = None
    nodes: List[dict] = Field(default_factory=list)
    edges: List[dict] = Field(default_factory=list)
    target_ids: List[str] = Field(default_factory=list)
    max_depth: int = 2
    max_context_items: int = 8
    max_prompt_chars: int = 2000


class GeneratedBlock(BaseModel):
    id: str
    title: Optional[str] = None
    content: str


class GenerationResponse(BaseModel):
    mode: str
    items: List[GeneratedBlock]
