import type { Edge, Node } from 'reactflow'

import type { StoryBlockData } from '../models/types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type CampaignPayload = {
  title: string
  nodes: Node<StoryBlockData>[]
  edges: Edge[]
}

export type Campaign = CampaignPayload & {
  id: string
  created_at: string
  updated_at: string
}

export type CampaignSummary = {
  id: string
  title: string
  updated_at: string
}

export type GenerationRequest = {
  campaignTitle?: string
  nodes: Node<StoryBlockData>[]
  edges: Edge[]
  targetIds: string[]
  maxDepth?: number
  maxContextItems?: number
  maxPromptChars?: number
}

export type GeneratedBlock = {
  id: string
  content: string
}

export type GenerationResponse = {
  mode: string
  items: GeneratedBlock[]
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const listCampaigns = () => request<CampaignSummary[]>('/campaigns')

export const fetchCampaign = (id: string) => request<Campaign>(`/campaigns/${id}`)

export const createCampaign = (payload: CampaignPayload) =>
  request<Campaign>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateCampaign = (id: string, payload: CampaignPayload) =>
  request<Campaign>(`/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const generateBlocks = (payload: GenerationRequest) =>
  request<GenerationResponse>('/generate', {
    method: 'POST',
    body: JSON.stringify({
      campaign_title: payload.campaignTitle,
      nodes: payload.nodes,
      edges: payload.edges,
      target_ids: payload.targetIds,
      max_depth: payload.maxDepth,
      max_context_items: payload.maxContextItems,
      max_prompt_chars: payload.maxPromptChars,
    }),
  })
