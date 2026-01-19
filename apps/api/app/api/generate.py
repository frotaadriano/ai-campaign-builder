from fastapi import APIRouter

from app.schemas.generation import GenerationRequest, GenerationResponse, GeneratedBlock
from app.services.generation import generate_story_blocks
from app.services.prompt_builder import PromptConfig

router = APIRouter()


@router.post('/', response_model=GenerationResponse)
async def generate_blocks(payload: GenerationRequest):
    config = PromptConfig(
        max_depth=payload.max_depth,
        max_context_items=payload.max_context_items,
        max_prompt_chars=payload.max_prompt_chars,
    )
    mode, items = await generate_story_blocks(
        target_ids=payload.target_ids,
        raw_nodes=payload.nodes,
        raw_edges=payload.edges,
        campaign_title=payload.campaign_title,
        config=config,
    )
    return GenerationResponse(
        mode=mode,
        items=[
            GeneratedBlock(id=item.id, title=item.title, content=item.content) for item in items
        ],
    )
