import { Handle, Position, type NodeProps } from 'reactflow'

import type { StoryBlockData } from '../models/types'

const TYPE_LABELS: Record<StoryBlockData['type'], string> = {
  theme: 'Theme',
  location: 'Location',
  npc: 'NPC',
  event: 'Event',
  twist: 'Twist',
}

export const StoryNode = ({ data, selected }: NodeProps<StoryBlockData>) => {
  return (
    <div className={`story-node story-node--${data.type} ${selected ? 'is-selected' : ''}`}>
      <div className="story-node__header">
        <span className="story-node__type">{TYPE_LABELS[data.type]}</span>
      </div>
      <div className="story-node__title">{data.title}</div>
      <Handle className="story-node__handle" type="target" position={Position.Left} />
      <Handle className="story-node__handle" type="source" position={Position.Right} />
    </div>
  )
}
