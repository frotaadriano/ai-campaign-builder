import { BLOCK_TYPES, type BlockType } from '../models/types'
import { useCanvasStore } from '../state/store'

export const Inspector = () => {
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId)
  const selectedNode = useCanvasStore((state) =>
    state.nodes.find((node) => node.id === selectedNodeId)
  )
  const updateBlock = useCanvasStore((state) => state.updateBlock)
  const removeNodes = useCanvasStore((state) => state.removeNodes)

  if (!selectedNode) {
    return (
      <div className="panel panel--inspector">
        <div className="panel__title">Inspector</div>
        <div className="panel__empty">Select a block to edit its details.</div>
      </div>
    )
  }

  const handleDelete = () => {
    removeNodes([selectedNode.id])
  }

  return (
    <div className="panel panel--inspector">
      <div className="panel__title">Inspector</div>
      <div className="field">
        <label className="field__label" htmlFor="block-title">
          Title
        </label>
        <input
          id="block-title"
          className="field__input"
          type="text"
          value={selectedNode.data.title}
          onChange={(event) => updateBlock(selectedNode.id, { title: event.target.value })}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="block-type">
          Type
        </label>
        <select
          id="block-type"
          className="field__select"
          value={selectedNode.data.type}
          onChange={(event) =>
            updateBlock(selectedNode.id, { type: event.target.value as BlockType })
          }
        >
          {BLOCK_TYPES.map((block) => (
            <option key={block.type} value={block.type}>
              {block.label}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className="danger-button" onClick={handleDelete}>
        Delete block
      </button>
    </div>
  )
}
