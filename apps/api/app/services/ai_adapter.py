from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Optional, Protocol

import httpx

from app.services.prompt_builder import PromptItem


@dataclass(frozen=True)
class GeneratedItem:
    id: str
    content: str


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
    _adjectives = ['tangled', 'ancient', 'haunting', 'forgotten', 'restless']
    _motifs = ['oath', 'ruin', 'rumor', 'rite', 'shadow']
    _verbs = ['pulls', 'guides', 'fractures', 'echoes', 'shifts']

    @staticmethod
    def _hash(value: str) -> int:
        hash_value = 0
        for char in value:
            hash_value = (hash_value << 5) - hash_value + ord(char)
            hash_value &= 0xFFFFFFFF
        return abs(hash_value)

    @classmethod
    def _pick(cls, items: List[str], seed: int, offset: int) -> str:
        return items[(seed + offset) % len(items)]

    async def generate(self, prompts: List[PromptItem]) -> List[GeneratedItem]:
        results: List[GeneratedItem] = []
        for item in prompts:
            seed = self._hash(item.prompt)
            adjective = self._pick(self._adjectives, seed, 1)
            motif = self._pick(self._motifs, seed, 3)
            verb = self._pick(self._verbs, seed, 5)
            context_line = (
                f"Influenced by {', '.join(item.context_titles)}."
                if item.context_titles
                else 'No upstream context yet.'
            )
            results.append(
                GeneratedItem(
                    id=item.id,
                    content=f"{item.target_title} becomes a {adjective} {motif} that {verb} the story. {context_line}",
                )
            )
        return results


class OpenAIAdapter:
    def __init__(self, config: AIProviderConfig) -> None:
        self._config = config

    async def generate(self, prompts: List[PromptItem]) -> List[GeneratedItem]:
        if not self._config.api_key:
            raise RuntimeError('OPENAI_API_KEY is not set')

        headers = {'Authorization': f"Bearer {self._config.api_key}"}
        async with httpx.AsyncClient(base_url=self._config.base_url, headers=headers, timeout=30) as client:
            results: List[GeneratedItem] = []
            for item in prompts:
                payload = {
                    'model': self._config.model,
                    'messages': [
                        {
                            'role': 'system',
                            'content': 'You are a narrative designer for RPG campaigns.',
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
                content = data['choices'][0]['message']['content'].strip()
                results.append(GeneratedItem(id=item.id, content=content))

        return results


class AzureOpenAIAdapter:
    def __init__(self, config: AIProviderConfig) -> None:
        self._config = config

    async def generate(self, prompts: List[PromptItem]) -> List[GeneratedItem]:
        if not self._config.api_key:
            raise RuntimeError('AZURE_OPENAI_API_KEY is not set')
        if not self._config.deployment:
            raise RuntimeError('AZURE_OPENAI_DEPLOYMENT is not set')
        if not self._config.api_version:
            raise RuntimeError('AZURE_OPENAI_API_VERSION is not set')

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
                            'content': 'You are a narrative designer for RPG campaigns.',
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
                content = data['choices'][0]['message']['content'].strip()
                results.append(GeneratedItem(id=item.id, content=content))

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
