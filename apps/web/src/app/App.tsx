import { useCallback, useEffect, useRef, useState } from 'react'

import { generateMock } from '../ai/mockAdapter'
import { Canvas } from '../canvas/Canvas'
import { BlockPalette } from '../components/BlockPalette'
import { Inspector } from '../components/Inspector'
import {
  createCampaign,
  fetchCampaign,
  listCampaigns,
  updateCampaign,
  type Campaign,
} from '../services/api'
import { useCanvasStore } from '../state/store'

const SAVE_DEBOUNCE_MS = 700

const formatSavedTime = (value: string | null) => {
  if (!value) {
    return 'Not saved'
  }

  const time = new Date(value)
  return `Saved ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

export const App = () => {
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const campaignId = useCanvasStore((state) => state.campaignId)
  const campaignTitle = useCanvasStore((state) => state.campaignTitle)
  const hasHydrated = useCanvasStore((state) => state.hasHydrated)
  const dirtyNodeIds = useCanvasStore((state) => state.dirtyNodeIds)
  const setCampaignMeta = useCanvasStore((state) => state.setCampaignMeta)
  const setCampaignTitle = useCanvasStore((state) => state.setCampaignTitle)
  const setCampaignData = useCanvasStore((state) => state.setCampaignData)
  const setHasHydrated = useCanvasStore((state) => state.setHasHydrated)
  const applyGeneratedContent = useCanvasStore((state) => state.applyGeneratedContent)

  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const savingRef = useRef(false)
  const skipAutoSave = useRef(true)

  const hydrateCampaign = useCallback(
    (campaign: Campaign) => {
      setCampaignMeta(campaign.id, campaign.title)
      setCampaignData(campaign.nodes, campaign.edges)
      setLastSavedAt(campaign.updated_at)
    },
    [setCampaignData, setCampaignMeta]
  )

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setStatus('loading')
      setError(null)

      const campaigns = await listCampaigns()
      if (!isActive) {
        return
      }

      if (campaigns.length === 0) {
        const created = await createCampaign({
          title: 'Untitled Campaign',
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

      const message = loadError instanceof Error ? loadError.message : 'Failed to load campaign.'
      setError(message)
      setStatus('error')
    })

    return () => {
      isActive = false
    }
  }, [hydrateCampaign, setHasHydrated])

  const saveCampaign = useCallback(async () => {
    if (!campaignId || savingRef.current) {
      return
    }

    savingRef.current = true
    setStatus('saving')
    setError(null)

    try {
      const title = campaignTitle.trim() || 'Untitled Campaign'
      const updated = await updateCampaign(campaignId, {
        title,
        nodes,
        edges,
      })
      setLastSavedAt(updated.updated_at)
      setStatus('idle')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save.'
      setError(message)
      setStatus('error')
    } finally {
      savingRef.current = false
    }
  }, [campaignId, campaignTitle, edges, nodes])

  useEffect(() => {
    if (!hasHydrated || !campaignId) {
      return
    }

    if (status === 'loading' || status === 'error') {
      return
    }

    if (skipAutoSave.current) {
      skipAutoSave.current = false
      return
    }

    const timeout = setTimeout(() => {
      void saveCampaign()
    }, SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [campaignId, campaignTitle, edges, hasHydrated, nodes, saveCampaign, status])

  const handleNewCampaign = async () => {
    setStatus('loading')
    setError(null)

    try {
      const created = await createCampaign({
        title: 'Untitled Campaign',
        nodes: [],
        edges: [],
      })
      hydrateCampaign(created)
      setHasHydrated(true)
      skipAutoSave.current = true
      setStatus('idle')
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Failed to create.'
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
      const message = reloadError instanceof Error ? reloadError.message : 'Failed to reload.'
      setError(message)
      setStatus('error')
    }
  }

  const handleSave = async () => {
    await saveCampaign()
  }

  const handleRegenerate = () => {
    if (dirtyNodeIds.length === 0 || isGenerating) {
      return
    }

    setIsGenerating(true)
    try {
      const updates = generateMock(dirtyNodeIds, nodes, edges)
      applyGeneratedContent(updates)
    } catch (generationError) {
      const message =
        generationError instanceof Error ? generationError.message : 'Failed to regenerate.'
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const statusLabel =
    status === 'loading'
      ? 'Loading...'
      : status === 'saving'
      ? 'Saving...'
      : status === 'error'
      ? 'Save failed'
      : formatSavedTime(lastSavedAt)

  const statusClassName =
    status === 'error'
      ? 'status-pill status-pill--error'
      : status === 'saving' || status === 'loading'
      ? 'status-pill status-pill--saving'
      : 'status-pill status-pill--ok'

  const regenLabel = isGenerating
    ? 'Regenerating...'
    : dirtyNodeIds.length > 0
    ? `Regenerate (${dirtyNodeIds.length})`
    : 'Regenerate'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__left">
          <div>
            <div className="app-title">AI Campaign Builder</div>
            <div className="app-subtitle">Phase 3 - AI Mock Integration</div>
          </div>
          <div className="campaign-field">
            <label className="campaign-field__label" htmlFor="campaign-title">
              Campaign
            </label>
            <input
              id="campaign-title"
              className="campaign-field__input"
              type="text"
              value={campaignTitle}
              onChange={(event) => setCampaignTitle(event.target.value)}
              placeholder="Untitled Campaign"
            />
          </div>
        </div>
        <div className="app-header__right">
          <span className={statusClassName}>{statusLabel}</span>
          <button type="button" className="ghost-button" onClick={handleNewCampaign}>
            New
          </button>
          <button type="button" className="ghost-button" onClick={handleReload}>
            Reload
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={handleRegenerate}
            disabled={dirtyNodeIds.length === 0 || isGenerating}
          >
            {regenLabel}
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
    </div>
  )
}
