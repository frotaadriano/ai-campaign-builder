from __future__ import annotations

from dataclasses import dataclass
from typing import List, Mapping, Optional

TYPE_ORDER = ['theme', 'location', 'npc', 'event', 'twist']

TYPE_LABELS = {
    'theme': 'Tema',
    'location': 'Local',
    'npc': 'NPC',
    'event': 'Evento',
    'twist': 'Reviravolta',
}


@dataclass(frozen=True)
class NodeRecord:
    id: str
    type: str
    title: str
    content: Optional[str] = None


@dataclass(frozen=True)
class EdgeRecord:
    source: str
    target: str


@dataclass(frozen=True)
class PromptConfig:
    max_depth: int = 2
    max_context_items: int = 8
    max_prompt_chars: int = 2000


@dataclass(frozen=True)
class PromptItem:
    id: str
    prompt: str
    target_title: str
    target_type: str
    context_titles: List[str]


def parse_nodes(raw_nodes: List[dict]) -> List[NodeRecord]:
    nodes: List[NodeRecord] = []
    for raw in raw_nodes:
        node_id = raw.get('id')
        data = raw.get('data') or {}
        block_type = data.get('type')
        title = data.get('title')
        if not node_id or not block_type or not title:
            continue
        nodes.append(
            NodeRecord(
                id=node_id,
                type=str(block_type),
                title=str(title),
                content=data.get('content'),
            )
        )
    return nodes


def parse_edges(raw_edges: List[dict]) -> List[EdgeRecord]:
    edges: List[EdgeRecord] = []
    for raw in raw_edges:
        source = raw.get('source')
        target = raw.get('target')
        if not source or not target:
            continue
        edges.append(EdgeRecord(source=str(source), target=str(target)))
    return edges


def build_incoming_map(edges: List[EdgeRecord]) -> Mapping[str, List[str]]:
    incoming: dict[str, List[str]] = {}
    for edge in edges:
        incoming.setdefault(edge.target, []).append(edge.source)
    return incoming


def collect_upstream_ids(target_id: str, incoming: Mapping[str, List[str]], max_depth: int) -> List[str]:
    visited: set[str] = set()
    queue: List[tuple[str, int]] = [(target_id, 0)]

    while queue:
        current, depth = queue.pop(0)
        if depth >= max_depth:
            continue

        for parent in incoming.get(current, []):
            if parent in visited:
                continue
            visited.add(parent)
            queue.append((parent, depth + 1))

    return list(visited)


def sort_nodes(nodes: List[NodeRecord]) -> List[NodeRecord]:
    def sort_key(node: NodeRecord):
        order = TYPE_ORDER.index(node.type) if node.type in TYPE_ORDER else len(TYPE_ORDER)
        return (order, node.title.lower())

    return sorted(nodes, key=sort_key)


def build_prompt(
    target: NodeRecord,
    upstream_nodes: List[NodeRecord],
    campaign_title: Optional[str],
    party_profile: Optional[dict],
    config: PromptConfig,
) -> PromptItem:
    context_nodes = sort_nodes(upstream_nodes)[: config.max_context_items]
    context_titles = [node.title for node in context_nodes]
    context_lines = [
        f"- {TYPE_LABELS.get(node.type, node.type)}: {node.title}" for node in context_nodes
    ]

    party_lines = []
    if party_profile:
        party_lines = [
            "Perfil do grupo:",
            *[
                line
                for line in [
                    f"- Nome do grupo: {party_profile.get('group_name')}" if party_profile.get('group_name') else None,
                    f"- Nivel medio: {party_profile.get('average_level')}" if party_profile.get('average_level') else None,
                    f"- Tamanho do grupo: {party_profile.get('party_size')}" if party_profile.get('party_size') else None,
                    f"- Classes: {party_profile.get('classes')}" if party_profile.get('classes') else None,
                    f"- Objetivo: {party_profile.get('goals')}" if party_profile.get('goals') else None,
                    f"- Resumo: {party_profile.get('summary')}" if party_profile.get('summary') else None,
                ]
                if line
            ],
        ]

    prompt_lines = [
        f"Campanha: {campaign_title or 'Campanha sem titulo'}",
        f"Alvo: {TYPE_LABELS.get(target.type, target.type)} - {target.title}",
        f"Tipo do bloco: {TYPE_LABELS.get(target.type, target.type)}",
        *party_lines,
        "Contexto:",
        *(context_lines if context_lines else ["- Nenhum"]),
        "Instrucoes:",
        "Escreva 2-3 frases curtas para este bloco.",
        "Use nomes canonicos de DnD 5e (Forgotten Realms / Costa da Espada).",
        "Prefira locais conhecidos como Waterdeep, Neverwinter, Baldur's Gate, Silverymoon.",
        "Responda em JSON valido: {\"title\": \"...\", \"content\": \"...\"}.",
        "O titulo deve ser adequado ao tipo do bloco (NPC, local, evento, etc).",
        "Nao repita titulos do contexto ou do tema.",
        "O titulo deve usar nomes canonicos de DnD 5e quando aplicavel.",
        "Mantenha consistencia com o contexto e um tom cinematografico.",
    ]

    prompt = "\n".join(prompt_lines)

    while len(prompt) > config.max_prompt_chars and context_lines:
        context_lines.pop()
        prompt_lines = [
            f"Campanha: {campaign_title or 'Campanha sem titulo'}",
            f"Alvo: {TYPE_LABELS.get(target.type, target.type)} - {target.title}",
            f"Tipo do bloco: {TYPE_LABELS.get(target.type, target.type)}",
            *party_lines,
            "Contexto:",
            *(context_lines if context_lines else ["- Nenhum"]),
            "Instrucoes:",
            "Escreva 2-3 frases curtas para este bloco.",
            "Use nomes canonicos de DnD 5e (Forgotten Realms / Costa da Espada).",
            "Prefira locais conhecidos como Waterdeep, Neverwinter, Baldur's Gate, Silverymoon.",
            "Responda em JSON valido: {\"title\": \"...\", \"content\": \"...\"}.",
            "O titulo deve ser adequado ao tipo do bloco (NPC, local, evento, etc).",
            "Nao repita titulos do contexto ou do tema.",
            "O titulo deve usar nomes canonicos de DnD 5e quando aplicavel.",
            "Mantenha consistencia com o contexto e um tom cinematografico.",
        ]
        prompt = "\n".join(prompt_lines)

    if len(prompt) > config.max_prompt_chars:
        prompt = prompt[: config.max_prompt_chars]

    return PromptItem(
        id=target.id,
        prompt=prompt,
        target_title=target.title,
        target_type=target.type,
        context_titles=context_titles,
    )


def build_prompts(
    target_ids: List[str],
    raw_nodes: List[dict],
    raw_edges: List[dict],
    campaign_title: Optional[str],
    party_profile: Optional[dict],
    config: PromptConfig,
) -> List[PromptItem]:
    nodes = parse_nodes(raw_nodes)
    edges = parse_edges(raw_edges)
    node_map = {node.id: node for node in nodes}
    incoming = build_incoming_map(edges)

    prompts: List[PromptItem] = []
    for target_id in target_ids:
        target = node_map.get(target_id)
        if not target:
            continue

        upstream_ids = collect_upstream_ids(target_id, incoming, config.max_depth)
        upstream_nodes = [node_map[node_id] for node_id in upstream_ids if node_id in node_map]
        prompts.append(build_prompt(target, upstream_nodes, campaign_title, party_profile, config))

    return prompts
