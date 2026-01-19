import type { Edge, Node } from 'reactflow'

import type { BlockType, StoryBlockData } from '../models/types'
import { compilePrompt } from './promptCompiler'

const ADJECTIVES = ['sombrio', 'antigo', 'inquieto', 'velado', 'misterioso']
const MOTIFS = ['juramento', 'ruina', 'rumor', 'rito', 'sombra']
const VERBS = ['puxa', 'guia', 'fratura', 'ecoa', 'muda']

const DND_TITLES: Record<BlockType, string[]> = {
  theme: [
    'Sombras de Netheril',
    'Culto do Dragao',
    'Segredos de Waterdeep',
    'Ecos de Vecna',
  ],
  location: [
    'Neverwinter',
    'Waterdeep',
    'Baldur\'s Gate',
    'Silverymoon',
    'Candlekeep',
  ],
  npc: [
    'Volo Geddarm',
    'Laeral Silverhand',
    'Mirt, o Sr. Moeda',
    'Elminster Aumar',
  ],
  event: [
    'Festival de Midwinter',
    'Ataque dos drows',
    'Ritual da Lua Nova',
    'Cerco de Luskan',
  ],
  twist: [
    'O aliado e um doppelganger',
    'A reliquia e de Netheril',
    'A ordem guarda um segredo',
    'O vilao serve Asmodeus',
  ],
}

const pickTitle = (options: string[], seed: number, blocked: Set<string>) => {
  if (options.length === 0) {
    return null
  }
  for (let offset = 0; offset < options.length; offset += 1) {
    const candidate = options[(seed + offset) % options.length]
    if (!blocked.has(candidate.toLowerCase())) {
      return candidate
    }
  }
  return options[seed % options.length]
}

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const pick = (items: string[], seed: number, offset: number) =>
  items[(seed + offset) % items.length]

export type GeneratedBlock = {
  id: string
  title?: string
  content: string
}

export const generateMock = (
  targetIds: string[],
  nodes: Node<StoryBlockData>[],
  edges: Edge[]
): GeneratedBlock[] => {
  return targetIds
    .map((targetId) => compilePrompt(targetId, nodes, edges))
    .filter((context): context is NonNullable<typeof context> => Boolean(context))
    .map((context) => {
      const seed = hashString(context.prompt)
      const adjective = pick(ADJECTIVES, seed, 1)
      const motif = pick(MOTIFS, seed, 3)
      const verb = pick(VERBS, seed, 5)
      const titles = DND_TITLES[context.target.data.type]
      const blocked = new Set(
        [context.target.data.title, ...context.contextTitles].map((item) => item.toLowerCase())
      )
      const title =
        titles && titles.length > 0
          ? pickTitle(titles, seed + 7, blocked) ?? context.target.data.title
          : context.target.data.title
      const contextLine =
        context.contextTitles.length > 0
          ? `Influenciado por ${context.contextTitles.join(', ')}.`
          : 'Sem contexto conectado ainda.'

      return {
        id: context.target.id,
        title,
        content: `${title} vira um ${motif} ${adjective} que ${verb} a historia. ${contextLine}`,
      }
    })
}
