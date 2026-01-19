import type { Edge, Node } from 'reactflow'

import type { BlockType, StoryBlockData } from '../models/types'

const TYPE_ORDER: BlockType[] = ['theme', 'location', 'npc', 'event', 'twist']

const TYPE_LABELS: Record<BlockType, string> = {
  theme: 'Tema',
  location: 'Local',
  npc: 'NPC',
  event: 'Evento',
  twist: 'Reviravolta',
}

const sortByTypeAndTitle = (a: Node<StoryBlockData>, b: Node<StoryBlockData>) => {
  const typeDiff = TYPE_ORDER.indexOf(a.data.type) - TYPE_ORDER.indexOf(b.data.type)
  if (typeDiff !== 0) {
    return typeDiff
  }

  return a.data.title.localeCompare(b.data.title)
}

const buildIncomingMap = (edges: Edge[]) => {
  const incoming = new Map<string, string[]>()
  edges.forEach((edge) => {
    const current = incoming.get(edge.target) ?? []
    incoming.set(edge.target, [...current, edge.source])
  })
  return incoming
}

const collectUpstreamIds = (targetId: string, edges: Edge[], maxDepth: number) => {
  const incoming = buildIncomingMap(edges)
  const visited = new Set<string>()
  const queue: Array<{ id: string; depth: number }> = [{ id: targetId, depth: 0 }]

  while (queue.length > 0) {
    const next = queue.shift()
    if (!next) {
      continue
    }

    const { id, depth } = next
    if (depth >= maxDepth) {
      continue
    }

    const parents = incoming.get(id) ?? []
    parents.forEach((parent) => {
      if (visited.has(parent)) {
        return
      }

      visited.add(parent)
      queue.push({ id: parent, depth: depth + 1 })
    })
  }

  return Array.from(visited)
}

export type PromptContext = {
  target: Node<StoryBlockData>
  prompt: string
  contextTitles: string[]
}

export const compilePrompt = (
  targetId: string,
  nodes: Node<StoryBlockData>[],
  edges: Edge[],
  maxDepth = 2
): PromptContext | null => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const target = nodeMap.get(targetId)
  if (!target) {
    return null
  }

  const upstreamIds = collectUpstreamIds(targetId, edges, maxDepth)
  const upstreamNodes = upstreamIds
    .map((id) => nodeMap.get(id))
    .filter((node): node is Node<StoryBlockData> => Boolean(node))
    .sort(sortByTypeAndTitle)

  const contextTitles = upstreamNodes.map((node) => node.data.title)
  const contextLines = upstreamNodes.map(
    (node) => `- ${TYPE_LABELS[node.data.type]}: ${node.data.title}`
  )

  const promptLines = [
    `Bloco: ${TYPE_LABELS[target.data.type]} - ${target.data.title}`,
    'Contexto:',
    ...(contextLines.length > 0 ? contextLines : ['- Nenhum']),
  ]

  return {
    target,
    prompt: promptLines.join('\n'),
    contextTitles,
  }
}
