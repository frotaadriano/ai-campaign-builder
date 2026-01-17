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

const getDefaultTitle = (type: BlockType): string => {
  const entry = BLOCK_TYPES.find((block) => block.type === type)
  return entry ? `New ${entry.label}` : 'New Block'
}

const getNextPosition = (index: number) => {
  const column = index % GRID_COLUMNS
  const row = Math.floor(index / GRID_COLUMNS)

  return {
    x: GRID_START_X + column * GRID_X,
    y: GRID_START_Y + row * GRID_Y,
  }
}

type CanvasState = {
  nodes: Node<StoryBlockData>[]
  edges: Edge[]
  selectedNodeId: string | null
  addBlock: (type: BlockType) => void
  updateBlock: (id: string, patch: Partial<StoryBlockData>) => void
  removeNodes: (nodeIds: string[]) => void
  setSelectedNodeId: (nodeId: string | null) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
}

export const useCanvasStore = create<CanvasState>()(
  immer((set) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
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
      })
    },
    removeNodes: (nodeIds) => {
      set((state) => {
        state.nodes = state.nodes.filter((node) => !nodeIds.includes(node.id))
        state.edges = state.edges.filter(
          (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
        )

        if (state.selectedNodeId && nodeIds.includes(state.selectedNodeId)) {
          state.selectedNodeId = null
        }
      })
    },
    setSelectedNodeId: (nodeId) => {
      set((state) => {
        state.selectedNodeId = nodeId
      })
    },
    onNodesChange: (changes) => {
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes)
      })
    },
    onEdgesChange: (changes) => {
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges)
      })
    },
    onConnect: (connection) => {
      set((state) => {
        state.edges = addEdge({
          ...connection,
          type: 'smoothstep',
        }, state.edges)
      })
    },
  }))
)
