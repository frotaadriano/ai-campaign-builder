export type BlockType = 'theme' | 'location' | 'npc' | 'event' | 'twist'

export type BlockTypeDefinition = {
  type: BlockType
  label: string
  description: string
}

export const BLOCK_TYPES: BlockTypeDefinition[] = [
  {
    type: 'theme',
    label: 'Theme',
    description: 'The core idea or mood that ties the story together.',
  },
  {
    type: 'location',
    label: 'Location',
    description: 'A place that anchors encounters or discoveries.',
  },
  {
    type: 'npc',
    label: 'NPC',
    description: 'A character with goals, secrets, or conflicts.',
  },
  {
    type: 'event',
    label: 'Event',
    description: 'A moment that changes the direction of the story.',
  },
  {
    type: 'twist',
    label: 'Twist',
    description: 'A reveal that reframes what the players thought.',
  },
]

export type StoryBlockData = {
  type: BlockType
  title: string
  summary?: string
}
