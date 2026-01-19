from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import List, Optional, Protocol, Tuple

import httpx

from app.services.prompt_builder import PromptItem

_DND_TITLES = {
    'theme': ['Sombras de Netheril', 'Culto do Dragao', 'Segredos de Waterdeep', 'Ecos de Vecna'],
    'location': ['Neverwinter', 'Waterdeep', "Baldur's Gate", 'Silverymoon', 'Candlekeep'],
    'npc': ['Volo Geddarm', 'Laeral Silverhand', 'Mirt, o Sr. Moeda', 'Elminster Aumar'],
    'event': ['Festival de Midwinter', 'Ataque dos drows', 'Ritual da Lua Nova', 'Cerco de Luskan'],
    'twist': [
        'O aliado e um doppelganger',
        'A reliquia e de Netheril',
        'A ordem guarda um segredo',
        'O vilao serve Asmodeus',
    ],
}


def _hash_text(value: str) -> int:
    hash_value = 0
    for char in value:
        hash_value = (hash_value << 5) - hash_value + ord(char)
        hash_value &= 0xFFFFFFFF
    return abs(hash_value)


def _pick_title(options: List[str], seed: int, blocked: set[str]) -> Optional[str]:
    if not options:
        return None
    for offset in range(len(options)):
        candidate = options[(seed + offset) % len(options)]
        if candidate.lower() not in blocked:
            return candidate
    return options[seed % len(options)]


def _normalize_title(candidate: Optional[str], item: PromptItem, seed: int) -> str:
    blocked = {title.lower() for title in item.context_titles}
    if item.target_title:
        blocked.add(item.target_title.lower())

    other_titles = {
        title.lower()
        for block_type, titles in _DND_TITLES.items()
        if block_type != item.target_type
        for title in titles
    }

    if candidate and candidate.strip():
        normalized = candidate.strip()
        if normalized.lower() not in blocked and normalized.lower() not in other_titles:
            return normalized

    options = _DND_TITLES.get(item.target_type, [])
    fallback = _pick_title(options, seed, blocked)
    return fallback or (candidate.strip() if candidate else item.target_title)


@dataclass(frozen=True)
class GeneratedItem:
    id: str
    content: str
    title: Optional[str] = None


def _parse_json_payload(value: str) -> Tuple[Optional[str], str]:
    try:
        data = json.loads(value)
        title = data.get('title') if isinstance(data, dict) else None
        content = data.get('content') if isinstance(data, dict) else None
        if isinstance(content, str) and content.strip():
            return (title.strip() if isinstance(title, str) else None, content.strip())
    except json.JSONDecodeError:
        pass

    start = value.find('{')
    end = value.rfind('}')
    if start != -1 and end != -1 and end > start:
        snippet = value[start : end + 1]
        try:
            data = json.loads(snippet)
            title = data.get('title') if isinstance(data, dict) else None
            content = data.get('content') if isinstance(data, dict) else None
            if isinstance(content, str) and content.strip():
                return (title.strip() if isinstance(title, str) else None, content.strip())
        except json.JSONDecodeError:
            pass

    return (None, value.strip())


class AIAdapter(Protocol):
    async def generate(self, prompts: List[PromptItem]) -> List[GeneratedItem]:
        ...


@dataclass(frozen=True)
class AIProviderConfig:
    provider: str
    model: str
    api_key: Optional[str]
    base_url: str
    deployment: Optional[str] = None
    api_version: Optional[str] = None


class MockAdapter:
    _adjectives = ['sombrio', 'antigo', 'inquieto', 'velado', 'misterioso']
    _motifs = ['juramento', 'ruina', 'rumor', 'rito', 'sombra']
    _verbs = ['puxa', 'guia', 'fratura', 'ecoa', 'muda']

    @classmethod
    def _pick(cls, items: List[str], seed: int, offset: int) -> str:
        return items[(seed + offset) % len(items)]

    async def generate(self, prompts: List[PromptItem]) -> List[GeneratedItem]:
        results: List[GeneratedItem] = []
        for item in prompts:
            seed = _hash_text(item.prompt)
            adjective = self._pick(self._adjectives, seed, 1)
            motif = self._pick(self._motifs, seed, 3)
            verb = self._pick(self._verbs, seed, 5)
            title = _normalize_title(None, item, seed)
            context_line = (
                f"Influenciado por {', '.join(item.context_titles)}."
                if item.context_titles
                else 'Sem contexto conectado ainda.'
            )
            results.append(
                GeneratedItem(
                    id=item.id,
                    title=title,
                    content=(
                        f"{title} vira um {motif} {adjective} que {verb} a historia. "
                        f"{context_line}"
                    ),
                )
            )
        return results


class OpenAIAdapter:
    def __init__(self, config: AIProviderConfig) -> None:
        self._config = config

    async def generate(self, prompts: List[PromptItem]) -> List[GeneratedItem]:
        if not self._config.api_key:
            raise RuntimeError('OPENAI_API_KEY nao definido')

        headers = {'Authorization': f"Bearer {self._config.api_key}"}
        async with httpx.AsyncClient(base_url=self._config.base_url, headers=headers, timeout=30) as client:
            results: List[GeneratedItem] = []
            for item in prompts:
                payload = {
                    'model': self._config.model,
                    'messages': [
                        {
                            'role': 'system',
                            'content': 'Voce e um designer de narrativa para campanhas de RPG.',
                        },
                        {
                            'role': 'user',
                            'content': item.prompt,
                        },
                    ],
                    'temperature': 0.7,
                    'max_tokens': 160,
                }

                response = await client.post('/v1/chat/completions', json=payload)
                response.raise_for_status()
                data = response.json()
                raw = data['choices'][0]['message']['content'].strip()
                title, content = _parse_json_payload(raw)
                seed = _hash_text(item.prompt)
                normalized_title = _normalize_title(title, item, seed)
                results.append(GeneratedItem(id=item.id, content=content, title=normalized_title))

        return results


class AzureOpenAIAdapter:
    def __init__(self, config: AIProviderConfig) -> None:
        self._config = config

    async def generate(self, prompts: List[PromptItem]) -> List[GeneratedItem]:
        if not self._config.api_key:
            raise RuntimeError('AZURE_OPENAI_API_KEY nao definido')
        if not self._config.deployment:
            raise RuntimeError('AZURE_OPENAI_DEPLOYMENT nao definido')
        if not self._config.api_version:
            raise RuntimeError('AZURE_OPENAI_API_VERSION nao definido')

        endpoint = self._config.base_url.rstrip('/')
        headers = {'api-key': self._config.api_key}
        path = f'/openai/deployments/{self._config.deployment}/chat/completions'

        async with httpx.AsyncClient(base_url=endpoint, headers=headers, timeout=60) as client:
            results: List[GeneratedItem] = []
            for item in prompts:
                payload = {
                    'messages': [
                        {
                            'role': 'system',
                            'content': 'Voce e um designer de narrativa para campanhas de RPG.',
                        },
                        {
                            'role': 'user',
                            'content': item.prompt,
                        },
                    ],
                    'temperature': 0.7,
                    'max_tokens': 300,
                }

                response = await client.post(
                    path,
                    params={'api-version': self._config.api_version},
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                raw = data['choices'][0]['message']['content'].strip()
                title, content = _parse_json_payload(raw)
                seed = _hash_text(item.prompt)
                normalized_title = _normalize_title(title, item, seed)
                results.append(GeneratedItem(id=item.id, content=content, title=normalized_title))

        return results


def get_adapter() -> AIAdapter:
    provider = os.getenv('AI_PROVIDER', 'mock').lower()
    model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    api_key = os.getenv('OPENAI_API_KEY')
    base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com')
    azure_endpoint = os.getenv('AZURE_OPENAI_ENDPOINT', 'https://api.openai.com')
    azure_deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT')
    azure_api_version = os.getenv('AZURE_OPENAI_API_VERSION')
    azure_api_key = os.getenv('AZURE_OPENAI_API_KEY')

    if provider == 'openai':
        return OpenAIAdapter(
            AIProviderConfig(provider=provider, model=model, api_key=api_key, base_url=base_url)
        )

    if provider == 'azure':
        return AzureOpenAIAdapter(
            AIProviderConfig(
                provider=provider,
                model=model,
                api_key=azure_api_key,
                base_url=azure_endpoint,
                deployment=azure_deployment,
                api_version=azure_api_version,
            )
        )

    return MockAdapter()
