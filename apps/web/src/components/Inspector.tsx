import { BLOCK_TYPES, type BlockType } from '../models/types'
import { useCanvasStore } from '../state/store'

export const Inspector = () => {
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId)
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds)
  const selectedNode = useCanvasStore((state) =>
    state.nodes.find((node) => node.id === selectedNodeId)
  )
  const updateBlock = useCanvasStore((state) => state.updateBlock)
  const removeNodes = useCanvasStore((state) => state.removeNodes)
  const isMultiSelect = selectedNodeIds.length > 1

  if (!selectedNode) {
    return (
      <div className="panel panel--inspector">
        <div className="panel__title">Detalhes</div>
        <div className="panel__empty">Selecione um bloco para editar.</div>
      </div>
    )
  }

  const handleDelete = () => {
    if (isMultiSelect) {
      removeNodes(selectedNodeIds)
      return
    }

    removeNodes([selectedNode.id])
  }

  return (
    <div className="panel panel--inspector">
      <div className="panel__title">Detalhes</div>
      {isMultiSelect ? (
        <div className="panel__empty">
          {selectedNodeIds.length} blocos selecionados. Edite um por vez.
        </div>
      ) : null}
      <div className="field">
        <label className="field__label" htmlFor="block-title">
          Titulo
        </label>
        <input
          id="block-title"
          className="field__input"
          type="text"
          value={selectedNode.data.title}
          onChange={(event) => updateBlock(selectedNode.id, { title: event.target.value })}
          disabled={isMultiSelect}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="block-type">
          Tipo
        </label>
        <select
          id="block-type"
          className="field__select"
          value={selectedNode.data.type}
          onChange={(event) =>
            updateBlock(selectedNode.id, { type: event.target.value as BlockType })
          }
          disabled={isMultiSelect}
        >
          {BLOCK_TYPES.map((block) => (
            <option key={block.type} value={block.type}>
              {block.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="block-content">
          Texto gerado
        </label>
        <textarea
          id="block-content"
          className="field__textarea"
          rows={6}
          value={selectedNode.data.content ?? ''}
          readOnly
          placeholder="Use Regenerar para preencher este bloco."
        />
      </div>
      <button type="button" className="danger-button" onClick={handleDelete}>
        Remover bloco
      </button>
    </div>
  )
}
