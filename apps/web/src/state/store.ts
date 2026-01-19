import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from 'reactflow'

import { BLOCK_TYPES, type BlockType, type StoryBlockData } from '../models/types'

const GRID_COLUMNS = 4
const GRID_X = 220
const GRID_Y = 140
const GRID_START_X = 120
const GRID_START_Y = 120

const DEFAULT_PREFIX: Record<BlockType, string> = {
  theme: 'Novo',
  location: 'Novo',
  npc: 'Novo',
  event: 'Novo',
  twist: 'Nova',
}

const getDefaultTitle = (type: BlockType): string => {
  const entry = BLOCK_TYPES.find((block) => block.type === type)
  const prefix = DEFAULT_PREFIX[type] ?? 'Novo'
  return entry ? `${prefix} ${entry.label}` : 'Novo bloco'
}

const getNextPosition = (index: number) => {
  const column = index % GRID_COLUMNS
  const row = Math.floor(index / GRID_COLUMNS)

  return {
    x: GRID_START_X + column * GRID_X,
    y: GRID_START_Y + row * GRID_Y,
  }
}

const buildDownstreamMap = (edges: Edge[]) => {
  const map = new Map<string, string[]>()
  edges.forEach((edge) => {
    const current = map.get(edge.source) ?? []
    map.set(edge.source, [...current, edge.target])
  })
  return map
}

const collectDownstreamIds = (startIds: string[], edges: Edge[]) => {
  const adjacency = buildDownstreamMap(edges)
  const visited = new Set<string>()
  const queue = [...startIds]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) {
      continue
    }

    visited.add(current)
    const next = adjacency.get(current) ?? []
    next.forEach((target) => {
      if (!visited.has(target)) {
        queue.push(target)
      }
    })
  }

  return Array.from(visited)
}

const markDirtyFromState = (state: CanvasState, startIds: string[]) => {
  if (startIds.length === 0) {
    return
  }

  const downstream = collectDownstreamIds(startIds, state.edges)
  const merged = new Set([...state.dirtyNodeIds, ...downstream])
  state.dirtyNodeIds = Array.from(merged)
}

const getEdgeImpactNodeIds = (
  changes: EdgeChange[],
  edges: Edge[],
  nodes: Node<StoryBlockData>[]
) => {
  const impacted = new Set<string>()
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]))
  let markAll = false

  changes.forEach((change) => {
    if (change.type === 'select') {
      return
    }

    if (change.type === 'reset') {
      markAll = true
      return
    }

    if ('item' in change && change.item) {
      impacted.add(change.item.source)
      impacted.add(change.item.target)
      return
    }

    if ('id' in change) {
      const edge = edgeById.get(change.id)
      if (edge) {
        impacted.add(edge.source)
        impacted.add(edge.target)
        return
      }
    }

    markAll = true
  })

  if (markAll) {
    return nodes.map((node) => node.id)
  }

  return Array.from(impacted)
}

type CanvasState = {
  nodes: Node<StoryBlockData>[]
  edges: Edge[]
  campaignId: string | null
  campaignTitle: string
  hasHydrated: boolean
  dirtyNodeIds: string[]
  selectedNodeId: string | null
  selectedNodeIds: string[]
  addBlock: (type: BlockType) => void
  updateBlock: (id: string, patch: Partial<StoryBlockData>) => void
  removeNodes: (nodeIds: string[]) => void
  setSelectedNodeId: (nodeId: string | null) => void
  setSelectedNodeIds: (nodeIds: string[]) => void
  setCampaignMeta: (id: string, title: string) => void
  setCampaignTitle: (title: string) => void
  setCampaignData: (nodes: Node<StoryBlockData>[], edges: Edge[]) => void
  setHasHydrated: (value: boolean) => void
  applyGeneratedContent: (updates: Array<{ id: string; content: string }>) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
}

export const useCanvasStore = create<CanvasState>()(
  immer((set) => ({
    nodes: [],
    edges: [],
    campaignId: null,
    campaignTitle: 'Campanha sem titulo',
    hasHydrated: false,
    dirtyNodeIds: [],
    selectedNodeId: null,
    selectedNodeIds: [],
    addBlock: (type) => {
      set((state) => {
        const index = state.nodes.length
        const position = getNextPosition(index)
        const id = crypto.randomUUID()

        state.nodes.push({
          id,
          type: 'story',
          position,
          data: {
            type,
            title: getDefaultTitle(type),
          },
        })
        state.selectedNodeId = id
        state.selectedNodeIds = [id]
        markDirtyFromState(state, [id])
      })
    },
    updateBlock: (id, patch) => {
      set((state) => {
        const node = state.nodes.find((item) => item.id === id)
        if (!node) {
          return
        }

        node.data = {
          ...node.data,
          ...patch,
        }
        markDirtyFromState(state, [id])
      })
    },
    removeNodes: (nodeIds) => {
      set((state) => {
        const impacted = new Set<string>()
        state.edges.forEach((edge) => {
          if (nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)) {
            impacted.add(edge.target)
          }
          if (nodeIds.includes(edge.target) && !nodeIds.includes(edge.source)) {
            impacted.add(edge.source)
          }
        })

        state.nodes = state.nodes.filter((node) => !nodeIds.includes(node.id))
        state.edges = state.edges.filter(
          (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
        )

        if (state.selectedNodeId && nodeIds.includes(state.selectedNodeId)) {
          state.selectedNodeId = null
        }

        markDirtyFromState(state, Array.from(impacted))
      })
    },
    setSelectedNodeId: (nodeId) => {
      set((state) => {
        state.selectedNodeId = nodeId
      })
    },
    setSelectedNodeIds: (nodeIds) => {
      set((state) => {
        state.selectedNodeIds = nodeIds
      })
    },
    setCampaignMeta: (id, title) => {
      set((state) => {
        state.campaignId = id
        state.campaignTitle = title
      })
    },
    setCampaignTitle: (title) => {
      set((state) => {
        state.campaignTitle = title
      })
    },
    setCampaignData: (nodes, edges) => {
      set((state) => {
        state.nodes = nodes
        state.edges = edges
        state.selectedNodeId = null
        state.selectedNodeIds = []
        state.dirtyNodeIds = []
      })
    },
    setHasHydrated: (value) => {
      set((state) => {
        state.hasHydrated = value
      })
    },
    applyGeneratedContent: (updates) => {
      set((state) => {
        const updateMap = new Map(updates.map((item) => [item.id, item.content]))
        if (updateMap.size === 0) {
          return
        }

        state.nodes.forEach((node) => {
          const content = updateMap.get(node.id)
          if (content === undefined) {
            return
          }

          node.data = {
            ...node.data,
            content,
          }
        })

        state.dirtyNodeIds = state.dirtyNodeIds.filter((id) => !updateMap.has(id))
      })
    },
    onNodesChange: (changes) => {
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes)
      })
    },
    onEdgesChange: (changes) => {
      set((state) => {
        const impacted = getEdgeImpactNodeIds(changes, state.edges, state.nodes)
        state.edges = applyEdgeChanges(changes, state.edges)
        markDirtyFromState(state, impacted)
      })
    },
    onConnect: (connection) => {
      set((state) => {
        state.edges = addEdge({
          ...connection,
          type: 'smoothstep',
        }, state.edges)

        const targets = [connection.target, connection.source].filter(
          (value): value is string => Boolean(value)
        )
        markDirtyFromState(state, targets)
      })
    },
  }))
)
