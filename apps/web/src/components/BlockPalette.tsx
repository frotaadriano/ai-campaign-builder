import { BLOCK_TYPES } from '../models/types'
import { useCanvasStore } from '../state/store'

export const BlockPalette = () => {
  const addBlock = useCanvasStore((state) => state.addBlock)

  return (
    <div className="panel panel--palette">
      <div className="panel__title">Blocos de historia</div>
      <div className="panel__subtitle">Arraste a historia para moldar.</div>
      <div className="palette-list">
        {BLOCK_TYPES.map((block) => (
          <button
            key={block.type}
            type="button"
            className={`palette-card palette-card--${block.type}`}
            onClick={() => addBlock(block.type)}
          >
            <div className="palette-card__label">{block.label}</div>
            <div className="palette-card__description">{block.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
