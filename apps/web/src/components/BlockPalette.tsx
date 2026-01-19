import { useMemo, useState } from 'react'

import { BLOCK_TYPES, type BlockType } from '../models/types'
import { useCanvasStore } from '../state/store'

const SUGGESTIONS: Record<BlockType, string[][]> = {
  theme: [
    ['Sombras sobre Waterdeep', 'Intrigas de Neverwinter', 'Ecos de Netheril'],
    ['Segredos de Candlekeep', 'Alianca com Zhentarim', 'Acordo com Harpers'],
    ['Ruinas do Culto do Dragao', 'A sombra de Vecna', 'A queda de Luskan'],
  ],
  location: [
    ['Docas de Waterdeep', 'Neverwinter no inverno', 'Mercado das Sombras'],
    ['Ruas de Baldur\'s Gate', 'Biblioteca de Candlekeep', 'Porto de Luskan'],
    ['Floresta de Ardeep', 'Templo de Oghma', 'Ponte dos Arcos'],
  ],
  npc: [
    ['Eryndor, Mensageiro de Waterdeep', 'Thalindra, Corretora das Sombras'],
    ['Mirt, o Sr. Moeda', 'Laeral Silverhand', 'Volo Geddarm'],
    ['Jhara, Caçadora de Relquias', 'Kael, Espiao de Neverwinter'],
  ],
  event: [
    ['Festival da Lua Nova', 'Ataque nas Docas', 'Duelo no Mercado'],
    ['Ritual em Neverwinter', 'Caravana desaparecida', 'Sombras no porto'],
    ['Conselho dos Lordes', 'Cerco de Luskan', 'Assalto ao armazem'],
  ],
  twist: [
    ['O aliado e um doppelganger', 'A reliquia esta amaldiçoada'],
    ['A ordem guarda um segredo', 'O vilao serve Asmodeus'],
    ['O mapa e falso', 'O heroi e o herdeiro perdido'],
  ],
}

const buildInitialState = <T,>(value: T) => {
  return BLOCK_TYPES.reduce((acc, block) => {
    acc[block.type] = value
    return acc
  }, {} as Record<BlockType, T>)
}

export const BlockPalette = () => {
  const addBlock = useCanvasStore((state) => state.addBlock)
  const addBlockWithTitle = useCanvasStore((state) => state.addBlockWithTitle)
  const [expanded, setExpanded] = useState<Record<BlockType, boolean>>(
    buildInitialState(false)
  )
  const [variantIndex, setVariantIndex] = useState<Record<BlockType, number>>(
    buildInitialState(0)
  )

  const suggestionsByType = useMemo(() => {
    return BLOCK_TYPES.reduce((acc, block) => {
      const lists = SUGGESTIONS[block.type]
      const index = variantIndex[block.type] % lists.length
      acc[block.type] = lists[index].slice(0, 5)
      return acc
    }, {} as Record<BlockType, string[]>)
  }, [variantIndex])

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
            <div className="palette-card__main">
              <div className="palette-card__label">{block.label}</div>
              <div className="palette-card__description">{block.description}</div>
            </div>
            <div className="palette-card__actions">
              <button
                type="button"
                className="link-button"
                onClick={(event) => {
                  event.stopPropagation()
                  setExpanded((state) => ({
                    ...state,
                    [block.type]: !state[block.type],
                  }))
                }}
              >
                {expanded[block.type] ? 'Ocultar sugestoes' : 'Mostrar sugestoes'}
              </button>
              <button
                type="button"
                className="link-button"
                onClick={(event) => {
                  event.stopPropagation()
                  setVariantIndex((state) => ({
                    ...state,
                    [block.type]: (state[block.type] + 1) % SUGGESTIONS[block.type].length,
                  }))
                }}
              >
                Gerar mais
              </button>
            </div>
            {expanded[block.type] ? (
              <div className="palette-suggestions">
                {suggestionsByType[block.type].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="suggestion-chip"
                    onClick={(event) => {
                      event.stopPropagation()
                      addBlockWithTitle(block.type, suggestion)
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
