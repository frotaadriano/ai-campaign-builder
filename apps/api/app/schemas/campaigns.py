from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class CampaignPayload(BaseModel):
    title: str = Field(..., min_length=1)
    nodes: List[dict] = Field(default_factory=list)
    edges: List[dict] = Field(default_factory=list)


class CampaignCreate(CampaignPayload):
    id: Optional[str] = None


class CampaignUpdate(CampaignPayload):
    pass


class CampaignSummary(BaseModel):
    id: str
    title: str
    updated_at: datetime


class CampaignResponse(CampaignPayload):
    id: str
    created_at: datetime
    updated_at: datetime
