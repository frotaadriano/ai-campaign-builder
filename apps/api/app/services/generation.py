from __future__ import annotations

from typing import List, Optional, Tuple

import logging

from app.services.ai_adapter import GeneratedItem, MockAdapter, get_adapter
from app.services.prompt_builder import PromptConfig, PromptItem, build_prompts


logger = logging.getLogger(__name__)


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
    logger.info(
        "Geracao solicitada: targets=%s nodes=%s edges=%s",
        target_ids,
        len(raw_nodes),
        len(raw_edges),
    )
    logger.info(
        "Relacoes: %s",
        [f"{edge.get('source')} -> {edge.get('target')}" for edge in raw_edges],
    )
    prompts = build_prompt_items(target_ids, raw_nodes, raw_edges, campaign_title, config)
    if not prompts:
        logger.info("Nenhum prompt gerado.")
        return ('none', [])

    adapter = get_adapter()
    try:
        logger.info("Adapter ativo: %s", adapter.__class__.__name__)
        generated = await adapter.generate(prompts)
        mode = adapter.__class__.__name__.replace('Adapter', '').lower()
        logger.info("Geracao concluida: mode=%s items=%s", mode, len(generated))
        return (mode, generated)
    except Exception:
        logger.exception("Falha no adapter real, usando mock.")
        mock = MockAdapter()
        generated = await mock.generate(prompts)
        logger.info("Geracao mock concluida: items=%s", len(generated))
        return ('mock', generated)
