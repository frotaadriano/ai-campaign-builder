import type { Edge, Node } from 'reactflow'

import type { StoryBlockData } from '../models/types'
import { compilePrompt } from './promptCompiler'

const ADJECTIVES = ['sombrio', 'antigo', 'inquieto', 'velado', 'misterioso']
const MOTIFS = ['juramento', 'ruina', 'rumor', 'rito', 'sombra']
const VERBS = ['puxa', 'guia', 'fratura', 'ecoa', 'muda']

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
      const contextLine =
        context.contextTitles.length > 0
          ? `Influenciado por ${context.contextTitles.join(', ')}.`
          : 'Sem contexto conectado ainda.'

      return {
        id: context.target.id,
        content: `${context.target.data.title} vira um ${motif} ${adjective} que ${verb} a historia. ${contextLine}`,
      }
    })
}
