import { useMemo, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  type OnSelectionChangeParams,
} from 'reactflow'

import { useCanvasStore } from '../state/store'
import { StoryNode } from './StoryNode'

export const Canvas = () => {
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const onNodesChange = useCanvasStore((state) => state.onNodesChange)
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange)
  const onConnect = useCanvasStore((state) => state.onConnect)
  const removeNodes = useCanvasStore((state) => state.removeNodes)
  const setSelectedNodeId = useCanvasStore((state) => state.setSelectedNodeId)

  const nodeTypes = useMemo(() => ({ story: StoryNode }), [])

  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      setSelectedNodeId(params.nodes[0]?.id ?? null)
    },
    [setSelectedNodeId]
  )

  return (
    <div className="canvas-root">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={handleSelectionChange}
          onNodesDelete={(deleted) => removeNodes(deleted.map((node) => node.id))}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode={["Backspace", "Delete"]}
          className="canvas-flow"
        >
          <Background gap={24} size={1} color="#cdd3da" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
