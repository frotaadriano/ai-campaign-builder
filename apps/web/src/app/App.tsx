import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Edge, Node } from 'reactflow'

import { generateMock } from '../ai/mockAdapter'
import { Canvas } from '../canvas/Canvas'
import { BlockPalette } from '../components/BlockPalette'
import { Inspector } from '../components/Inspector'
import { BLOCK_TYPES, type BlockType, type StoryBlockData } from '../models/types'
import {
  createCampaign,
  generateBlocks,
  fetchCampaign,
  listCampaigns,
  updateCampaign,
  type Campaign,
  type CampaignSummary,
} from '../services/api'
import { useCanvasStore } from '../state/store'

const SAVE_DEBOUNCE_MS = 700

const formatSavedTime = (value: string | null) => {
  if (!value) {
    return 'Nao salvo'
  }

  const time = new Date(value)
  return `Salvo ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

type CampaignSnapshot = {
  title: string
  nodes: Node<StoryBlockData>[]
  edges: Edge[]
  signature: string
}

const typeOrder = BLOCK_TYPES.map((block) => block.type)
const typeLabelMap = new Map<BlockType, string>(
  BLOCK_TYPES.map((block) => [block.type, block.label])
)

const buildSnapshot = (
  rawTitle: string,
  nodes: Node<StoryBlockData>[],
  edges: Edge[]
): CampaignSnapshot => {
  const title = rawTitle.trim() || 'Campanha sem titulo'

  const sanitizedNodes = nodes
    .map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        type: node.data.type,
        title: node.data.title,
        content: node.data.content,
        summary: node.data.summary,
      },
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const sanitizedEdges = edges
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    }))
    .sort((a, b) => {
      const left = a.id ?? `${a.source}-${a.target}`
      const right = b.id ?? `${b.source}-${b.target}`
      return left.localeCompare(right)
    })

  const signature = JSON.stringify({ title, nodes: sanitizedNodes, edges: sanitizedEdges })

  return {
    title,
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
    signature,
  }
}

const buildIncomingMap = (edges: Edge[]) => {
  const incoming = new Map<string, string[]>()
  edges.forEach((edge) => {
    const current = incoming.get(edge.target) ?? []
    incoming.set(edge.target, [...current, edge.source])
  })
  return incoming
}

const collectUpstreamIds = (targetIds: string[], edges: Edge[]) => {
  const incoming = buildIncomingMap(edges)
  const visited = new Set<string>()
  const queue = [...targetIds]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }

    const parents = incoming.get(current) ?? []
    parents.forEach((parent) => {
      if (visited.has(parent) || targetIds.includes(parent)) {
        return
      }
      visited.add(parent)
      queue.push(parent)
    })
  }

  return Array.from(visited)
}

export const App = () => {
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const campaignId = useCanvasStore((state) => state.campaignId)
  const campaignTitle = useCanvasStore((state) => state.campaignTitle)
  const hasHydrated = useCanvasStore((state) => state.hasHydrated)
  const dirtyNodeIds = useCanvasStore((state) => state.dirtyNodeIds)
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds)
  const setCampaignMeta = useCanvasStore((state) => state.setCampaignMeta)
  const setCampaignTitle = useCanvasStore((state) => state.setCampaignTitle)
  const setCampaignData = useCanvasStore((state) => state.setCampaignData)
  const setHasHydrated = useCanvasStore((state) => state.setHasHydrated)
  const applyGeneratedContent = useCanvasStore((state) => state.applyGeneratedContent)

  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isStoryOpen, setIsStoryOpen] = useState(false)
  const [isCampaignsOpen, setIsCampaignsOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [campaignsStatus, setCampaignsStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [impactIds, setImpactIds] = useState<string[] | null>(null)
  const [impactTargetIds, setImpactTargetIds] = useState<string[] | null>(null)

  const savingRef = useRef(false)
  const skipAutoSave = useRef(true)
  const savedSignatureRef = useRef<string | null>(null)

  const campaignSnapshot = useMemo(
    () => buildSnapshot(campaignTitle, nodes, edges),
    [campaignTitle, nodes, edges]
  )

  const hydrateCampaign = useCallback(
    (campaign: Campaign) => {
      const snapshot = buildSnapshot(campaign.title, campaign.nodes, campaign.edges)
      setCampaignMeta(campaign.id, campaign.title)
      setCampaignData(snapshot.nodes, snapshot.edges)
      setLastSavedAt(campaign.updated_at)
      savedSignatureRef.current = snapshot.signature
    },
    [setCampaignData, setCampaignMeta]
  )

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setStatus('loading')
      setError(null)

      const campaigns = await listCampaigns()
      setCampaigns(campaigns)
      if (!isActive) {
        return
      }

      if (campaigns.length === 0) {
        const created = await createCampaign({
          title: 'Campanha sem titulo',
          nodes: [],
          edges: [],
        })
        if (!isActive) {
          return
        }
        hydrateCampaign(created)
      } else {
        const latest = await fetchCampaign(campaigns[0].id)
        if (!isActive) {
          return
        }
        hydrateCampaign(latest)
      }

      setHasHydrated(true)
      skipAutoSave.current = true
      setStatus('idle')
    }

    load().catch((loadError) => {
      if (!isActive) {
        return
      }

      const message =
        loadError instanceof Error ? loadError.message : 'Falha ao carregar campanha.'
      setError(message)
      setStatus('error')
    })

    return () => {
      isActive = false
    }
  }, [hydrateCampaign, setHasHydrated])

  const refreshCampaigns = useCallback(async () => {
    setCampaignsStatus('loading')
    setCampaignsError(null)
    try {
      const data = await listCampaigns()
      setCampaigns(data)
      setCampaignsStatus('idle')
    } catch (listError) {
      const message =
        listError instanceof Error ? listError.message : 'Falha ao carregar campanhas.'
      setCampaignsError(message)
      setCampaignsStatus('error')
    }
  }, [])

  const saveCampaign = useCallback(
    async (snapshot: CampaignSnapshot, allowCreate: boolean) => {
      if (savingRef.current) {
        return
      }

      savingRef.current = true
      setStatus('saving')
      setError(null)

      try {
        if (!campaignId && allowCreate) {
          const created = await createCampaign({
            title: snapshot.title,
            nodes: snapshot.nodes,
            edges: snapshot.edges,
          })
          hydrateCampaign(created)
          savedSignatureRef.current = snapshot.signature
          setStatus('idle')
          return
        }

        if (!campaignId) {
          setStatus('error')
          setError('Campanha nao carregada.')
          return
        }

        const updated = await updateCampaign(campaignId, {
          title: snapshot.title,
          nodes: snapshot.nodes,
          edges: snapshot.edges,
        })
        setLastSavedAt(updated.updated_at)
        savedSignatureRef.current = snapshot.signature
        setStatus('idle')
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : 'Falha ao salvar.'
        setError(message)
        setStatus('error')
      } finally {
        savingRef.current = false
      }
    },
    [campaignId, hydrateCampaign]
  )

  useEffect(() => {
    if (!hasHydrated || !campaignId) {
      return
    }

    if (status === 'loading' || status === 'error') {
      return
    }

    if (skipAutoSave.current) {
      skipAutoSave.current = false
      savedSignatureRef.current = campaignSnapshot.signature
      return
    }

    if (savedSignatureRef.current === campaignSnapshot.signature) {
      return
    }

    const timeout = setTimeout(() => {
      void saveCampaign(campaignSnapshot, false)
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [campaignId, campaignSnapshot, hasHydrated, saveCampaign, status])

  const handleNewCampaign = async () => {
    setStatus('loading')
    setError(null)

    try {
      const created = await createCampaign({
        title: 'Campanha sem titulo',
        nodes: [],
        edges: [],
      })
      hydrateCampaign(created)
      setHasHydrated(true)
      skipAutoSave.current = true
      setStatus('idle')
      void refreshCampaigns()
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Falha ao criar.'
      setError(message)
      setStatus('error')
    }
  }

  const handleReload = async () => {
    if (!campaignId) {
      return
    }

    setStatus('loading')
    setError(null)

    try {
      const loaded = await fetchCampaign(campaignId)
      hydrateCampaign(loaded)
      setHasHydrated(true)
      skipAutoSave.current = true
      setStatus('idle')
    } catch (reloadError) {
      const message = reloadError instanceof Error ? reloadError.message : 'Falha ao recarregar.'
      setError(message)
      setStatus('error')
    }
  }

  const handleSave = async () => {
    await saveCampaign(campaignSnapshot, true)
    void refreshCampaigns()
  }

  const handleOpenCampaigns = () => {
    setIsCampaignsOpen(true)
    void refreshCampaigns()
  }

  const handleSelectCampaign = async (id: string) => {
    setStatus('loading')
    setError(null)
    setIsCampaignsOpen(false)
    try {
      const loaded = await fetchCampaign(id)
      hydrateCampaign(loaded)
      setHasHydrated(true)
      skipAutoSave.current = true
      setStatus('idle')
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Falha ao carregar campanha.'
      setError(message)
      setStatus('error')
    }
  }

  const runRegeneration = (targetIds: string[]) => {
    if (targetIds.length === 0 || isGenerating) {
      return
    }

    setIsGenerating(true)
    setError(null)
    const run = async () => {
      try {
        const response = await generateBlocks({
          campaignTitle,
          nodes: campaignSnapshot.nodes,
          edges: campaignSnapshot.edges,
          targetIds,
        })
        applyGeneratedContent(response.items)
      } catch (generationError) {
        const updates = generateMock(targetIds, campaignSnapshot.nodes, campaignSnapshot.edges)
        applyGeneratedContent(updates)
        const message =
          generationError instanceof Error
            ? `IA offline, usando mock. ${generationError.message}`
            : 'IA offline, usando mock.'
        setError(message)
      } finally {
        setIsGenerating(false)
      }
    }

    void run()
  }

  const handleRegenerate = () => {
    const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : dirtyNodeIds
    if (targetIds.length === 0 || isGenerating) {
      return
    }

    if (selectedNodeIds.length > 0) {
      const upstreamIds = collectUpstreamIds(targetIds, edges)
      if (upstreamIds.length > 0) {
        setImpactIds(upstreamIds)
        setImpactTargetIds(targetIds)
        return
      }
    }

    runRegeneration(targetIds)
  }

  const statusLabel =
    status === 'loading'
      ? 'Carregando...'
      : status === 'saving'
      ? 'Salvando...'
      : status === 'error'
      ? 'Falha ao salvar'
      : formatSavedTime(lastSavedAt)

  const statusClassName =
    status === 'error'
      ? 'status-pill status-pill--error'
      : status === 'saving' || status === 'loading'
      ? 'status-pill status-pill--saving'
      : 'status-pill status-pill--ok'

  const regenCount = selectedNodeIds.length > 0 ? selectedNodeIds.length : dirtyNodeIds.length
  const regenLabel = isGenerating
    ? 'Regenerando...'
    : regenCount > 0
    ? `Regenerar (${regenCount})`
    : 'Regenerar'

  const storyText = useMemo(() => {
    if (nodes.length === 0) {
      return 'Nenhum bloco ainda.'
    }

    const sorted = [...nodes].sort((a, b) => {
      const typeIndexA = typeOrder.indexOf(a.data.type)
      const typeIndexB = typeOrder.indexOf(b.data.type)
      if (typeIndexA !== typeIndexB) {
        return typeIndexA - typeIndexB
      }
      return a.data.title.localeCompare(b.data.title)
    })

    return sorted
      .map((node) => {
        const label = typeLabelMap.get(node.data.type) ?? node.data.type
        const content = node.data.content?.trim() || 'Sem texto gerado.'
        return `${label}: ${node.data.title}\n${content}`
      })
      .join('\n\n')
  }, [nodes])

  const impactNodes = useMemo(() => {
    if (!impactIds) {
      return []
    }
    const map = new Map(nodes.map((node) => [node.id, node]))
    return impactIds
      .map((id) => map.get(id))
      .filter((node): node is Node<StoryBlockData> => Boolean(node))
  }, [impactIds, nodes])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__left">
          <div>
            <div className="app-title">AI Campaign Builder</div>
            <div className="app-subtitle">Fase 4 - Integracao real de IA</div>
          </div>
          <div className="campaign-field">
            <label className="campaign-field__label" htmlFor="campaign-title">
              Campanha
            </label>
            <input
              id="campaign-title"
              className="campaign-field__input"
              type="text"
              value={campaignTitle}
              onChange={(event) => setCampaignTitle(event.target.value)}
              placeholder="Campanha sem titulo"
            />
          </div>
        </div>
        <div className="app-header__right">
          <span className={statusClassName}>{statusLabel}</span>
          <button type="button" className="ghost-button" onClick={handleNewCampaign}>
            Novo
          </button>
          <button type="button" className="ghost-button" onClick={handleReload}>
            Recarregar
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Salvar
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={handleRegenerate}
            disabled={regenCount === 0 || isGenerating}
          >
            {regenLabel}
          </button>
          <button type="button" className="ghost-button" onClick={() => setIsStoryOpen(true)}>
            Historia
          </button>
          <button type="button" className="ghost-button" onClick={handleOpenCampaigns}>
            Campanhas
          </button>
        </div>
      </header>
      {error ? <div className="app-alert">{error}</div> : null}
      <div className="app-body">
        <BlockPalette />
        <div className="canvas-wrap">
          <Canvas />
        </div>
        <Inspector />
      </div>
      {isStoryOpen ? (
        <div className="story-modal">
          <div className="story-modal__overlay" onClick={() => setIsStoryOpen(false)} />
          <div className="story-modal__content">
            <div className="story-modal__header">
              <div className="story-modal__title">Historia montada</div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsStoryOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="story-modal__body">{storyText}</div>
          </div>
        </div>
      ) : null}
      {isCampaignsOpen ? (
        <div className="story-modal">
          <div className="story-modal__overlay" onClick={() => setIsCampaignsOpen(false)} />
          <div className="story-modal__content">
            <div className="story-modal__header">
              <div className="story-modal__title">Campanhas salvas</div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsCampaignsOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="story-modal__body">
              <div className="campaigns-toolbar">
                <button type="button" className="ghost-button" onClick={refreshCampaigns}>
                  Atualizar lista
                </button>
                <span className="campaigns-status">
                  {campaignsStatus === 'loading'
                    ? 'Carregando...'
                    : campaignsStatus === 'error'
                    ? 'Falha ao carregar'
                    : `${campaigns.length} campanhas`}
                </span>
              </div>
              {campaignsError ? <div className="app-alert">{campaignsError}</div> : null}
              {campaigns.length === 0 ? (
                <div className="panel__empty">Nenhuma campanha salva ainda.</div>
              ) : (
                <div className="campaigns-list">
                  {campaigns.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`campaigns-card ${
                        item.id === campaignId ? 'campaigns-card--active' : ''
                      }`}
                      onClick={() => handleSelectCampaign(item.id)}
                    >
                      <div className="campaigns-card__title">{item.title}</div>
                      <div className="campaigns-card__meta">
                        Atualizado em{' '}
                        {new Date(item.updated_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {impactIds && impactTargetIds ? (
        <div className="story-modal">
          <div
            className="story-modal__overlay"
            onClick={() => {
              setImpactIds(null)
              setImpactTargetIds(null)
            }}
          />
          <div className="story-modal__content">
            <div className="story-modal__header">
              <div className="story-modal__title">Possivel impacto em outros blocos</div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setImpactIds(null)
                  setImpactTargetIds(null)
                }}
              >
                Fechar
              </button>
            </div>
            <div className="story-modal__body">
              <div className="panel__empty">
                Estes blocos estao conectados ao que voce selecionou. A IA pode sugerir
                alteracoes neles para manter coerencia.
              </div>
              <div className="campaigns-list">
                {impactNodes.map((node) => (
                  <div key={node.id} className="campaigns-card">
                    <div className="campaigns-card__title">
                      {typeLabelMap.get(node.data.type) ?? node.data.type}: {node.data.title}
                    </div>
                    <div className="campaigns-card__meta">ID: {node.id}</div>
                  </div>
                ))}
              </div>
              <div className="impact-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setImpactIds(null)
                    setImpactTargetIds(null)
                    runRegeneration(impactTargetIds)
                  }}
                >
                  Regenerar apenas selecionados
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    const combined = Array.from(new Set([...impactTargetIds, ...impactIds]))
                    setImpactIds(null)
                    setImpactTargetIds(null)
                    runRegeneration(combined)
                  }}
                >
                  Incluir relacionados
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
