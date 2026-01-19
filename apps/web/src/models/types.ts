export type BlockType = 'theme' | 'location' | 'npc' | 'event' | 'twist'

export type BlockTypeDefinition = {
  type: BlockType
  label: string
  description: string
}

export const BLOCK_TYPES: BlockTypeDefinition[] = [
  {
    type: 'theme',
    label: 'Tema',
    description: 'A ideia central ou o clima que amarra a historia.',
  },
  {
    type: 'location',
    label: 'Local',
    description: 'Um lugar que ancora encontros ou descobertas.',
  },
  {
    type: 'npc',
    label: 'NPC',
    description: 'Um personagem com objetivos, segredos ou conflitos.',
  },
  {
    type: 'event',
    label: 'Evento',
    description: 'Um momento que muda o rumo da historia.',
  },
  {
    type: 'twist',
    label: 'Reviravolta',
    description: 'Uma revelacao que muda o que os jogadores achavam.',
  },
]

export type StoryBlockData = {
  type: BlockType
  title: string
  summary?: string
  content?: string
}
