import { Handle, Position, type NodeProps } from 'reactflow'

import type { StoryBlockData } from '../models/types'
import { useCanvasStore } from '../state/store'

const TYPE_LABELS: Record<StoryBlockData['type'], string> = {
  theme: 'Theme',
  location: 'Location',
  npc: 'NPC',
  event: 'Event',
  twist: 'Twist',
}

export const StoryNode = ({ id, data, selected }: NodeProps<StoryBlockData>) => {
  const isDirty = useCanvasStore((state) => state.dirtyNodeIds.includes(id))
  const content = data.content?.trim()

  return (
    <div className={`story-node story-node--${data.type} ${selected ? 'is-selected' : ''}`}>
      <div className="story-node__header">
        <span className="story-node__type">{TYPE_LABELS[data.type]}</span>
        {isDirty ? <span className="story-node__badge">Dirty</span> : null}
      </div>
      <div className="story-node__title">{data.title}</div>
      {content ? <div className="story-node__content">{content}</div> : null}
      <Handle className="story-node__handle" type="target" position={Position.Left} />
      <Handle className="story-node__handle" type="source" position={Position.Right} />
    </div>
  )
}
