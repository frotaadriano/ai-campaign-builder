from __future__ import annotations

from typing import List, Optional, Tuple

from app.services.ai_adapter import GeneratedItem, MockAdapter, get_adapter
from app.services.prompt_builder import PromptConfig, PromptItem, build_prompts


def build_prompt_items(
    target_ids: List[str],
    raw_nodes: List[dict],
    raw_edges: List[dict],
    campaign_title: Optional[str],
    config: PromptConfig,
) -> List[PromptItem]:
    return build_prompts(target_ids, raw_nodes, raw_edges, campaign_title, config)


async def generate_story_blocks(
    target_ids: List[str],
    raw_nodes: List[dict],
    raw_edges: List[dict],
    campaign_title: Optional[str],
    config: PromptConfig,
) -> Tuple[str, List[GeneratedItem]]:
    prompts = build_prompt_items(target_ids, raw_nodes, raw_edges, campaign_title, config)
    if not prompts:
        return ('none', [])

    adapter = get_adapter()
    try:
        generated = await adapter.generate(prompts)
        mode = adapter.__class__.__name__.replace('Adapter', '').lower()
        return (mode, generated)
    except Exception:
        mock = MockAdapter()
        generated = await mock.generate(prompts)
        return ('mock', generated)
