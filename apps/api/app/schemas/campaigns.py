from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PartyProfile(BaseModel):
    group_name: Optional[str] = None
    average_level: Optional[str] = None
    party_size: Optional[str] = None
    classes: Optional[str] = None
    goals: Optional[str] = None
    summary: Optional[str] = None


class CampaignPayload(BaseModel):
    title: str = Field(..., min_length=1)
    nodes: List[dict] = Field(default_factory=list)
    edges: List[dict] = Field(default_factory=list)
    party_profile: Optional[PartyProfile] = None


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
