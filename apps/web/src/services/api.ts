import type { Edge, Node } from 'reactflow'

import type { PartyProfile, StoryBlockData } from '../models/types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type CampaignPayload = {
  title: string
  nodes: Node<StoryBlockData>[]
  edges: Edge[]
  partyProfile?: PartyProfile
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

type PartyProfileApi = {
  group_name?: string
  average_level?: string
  party_size?: string
  classes?: string
  goals?: string
  summary?: string
}

type CampaignApi = {
  id: string
  title: string
  nodes: Node<StoryBlockData>[]
  edges: Edge[]
  party_profile?: PartyProfileApi
  created_at: string
  updated_at: string
}

const toApiProfile = (profile?: PartyProfile): PartyProfileApi | undefined => {
  if (!profile) {
    return undefined
  }

  return {
    group_name: profile.groupName,
    average_level: profile.averageLevel,
    party_size: profile.partySize,
    classes: profile.classes,
    goals: profile.goals,
    summary: profile.summary,
  }
}

const fromApiProfile = (profile?: PartyProfileApi): PartyProfile | undefined => {
  if (!profile) {
    return undefined
  }

  return {
    groupName: profile.group_name,
    averageLevel: profile.average_level,
    partySize: profile.party_size,
    classes: profile.classes,
    goals: profile.goals,
    summary: profile.summary,
  }
}

const normalizeCampaign = (campaign: CampaignApi): Campaign => ({
  id: campaign.id,
  title: campaign.title,
  nodes: campaign.nodes,
  edges: campaign.edges,
  partyProfile: fromApiProfile(campaign.party_profile),
  created_at: campaign.created_at,
  updated_at: campaign.updated_at,
})

export type GenerationRequest = {
  campaignTitle?: string
  partyProfile?: PartyProfile
  nodes: Node<StoryBlockData>[]
  edges: Edge[]
  targetIds: string[]
  maxDepth?: number
  maxContextItems?: number
  maxPromptChars?: number
}

export type GeneratedBlock = {
  id: string
  title?: string
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

export const fetchCampaign = async (id: string) =>
  normalizeCampaign(await request<CampaignApi>(`/campaigns/${id}`))

export const createCampaign = async (payload: CampaignPayload) =>
  normalizeCampaign(
    await request<CampaignApi>('/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        nodes: payload.nodes,
        edges: payload.edges,
        party_profile: toApiProfile(payload.partyProfile),
      }),
    })
  )

export const updateCampaign = async (id: string, payload: CampaignPayload) =>
  normalizeCampaign(
    await request<CampaignApi>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: payload.title,
        nodes: payload.nodes,
        edges: payload.edges,
        party_profile: toApiProfile(payload.partyProfile),
      }),
    })
  )

export const generateBlocks = (payload: GenerationRequest) =>
  request<GenerationResponse>('/generate', {
    method: 'POST',
    body: JSON.stringify({
      campaign_title: payload.campaignTitle,
      party_profile: toApiProfile(payload.partyProfile),
      nodes: payload.nodes,
      edges: payload.edges,
      target_ids: payload.targetIds,
      max_depth: payload.maxDepth,
      max_context_items: payload.maxContextItems,
      max_prompt_chars: payload.maxPromptChars,
    }),
  })
