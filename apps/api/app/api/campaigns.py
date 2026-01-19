import json
from datetime import datetime
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Campaign
from app.db.session import get_session
from app.schemas.campaigns import (
    CampaignCreate,
    CampaignResponse,
    CampaignSummary,
    CampaignUpdate,
)

router = APIRouter()


def _parse_payload(campaign: Campaign) -> dict:
    try:
        return json.loads(campaign.data)
    except json.JSONDecodeError:
        return {}


def _to_response(campaign: Campaign) -> CampaignResponse:
    payload = _parse_payload(campaign)
    return CampaignResponse(
        id=campaign.id,
        title=campaign.title,
        nodes=payload.get('nodes', []),
        edges=payload.get('edges', []),
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


@router.get('/', response_model=List[CampaignSummary])
def list_campaigns(db: Session = Depends(get_session)):
    campaigns = db.query(Campaign).order_by(Campaign.updated_at.desc()).all()
    return [
        CampaignSummary(
            id=campaign.id,
            title=campaign.title,
            updated_at=campaign.updated_at,
        )
        for campaign in campaigns
    ]


@router.post('/', response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_session)):
    campaign_id = payload.id or uuid4().hex
    data = json.dumps({'nodes': payload.nodes, 'edges': payload.edges})
    now = datetime.utcnow()

    campaign = Campaign(
        id=campaign_id,
        title=payload.title,
        data=data,
        created_at=now,
        updated_at=now,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _to_response(campaign)


@router.get('/{campaign_id}', response_model=CampaignResponse)
def get_campaign(campaign_id: str, db: Session = Depends(get_session)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail='Campanha nao encontrada')
    return _to_response(campaign)


@router.put('/{campaign_id}', response_model=CampaignResponse)
def update_campaign(
    campaign_id: str, payload: CampaignUpdate, db: Session = Depends(get_session)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail='Campanha nao encontrada')

    campaign.title = payload.title
    campaign.data = json.dumps({'nodes': payload.nodes, 'edges': payload.edges})
    campaign.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(campaign)
    return _to_response(campaign)


@router.delete('/{campaign_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: str, db: Session = Depends(get_session)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail='Campanha nao encontrada')

    db.delete(campaign)
    db.commit()
