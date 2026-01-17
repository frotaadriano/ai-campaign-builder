import { BlockPalette } from '../components/BlockPalette'
import { Inspector } from '../components/Inspector'
import { Canvas } from '../canvas/Canvas'

export const App = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">AI Campaign Builder</div>
          <div className="app-subtitle">Phase 1 - Canvas Foundation</div>
        </div>
        <div className="app-tag">Story sculpting in motion</div>
      </header>
      <div className="app-body">
        <BlockPalette />
        <div className="canvas-wrap">
          <Canvas />
        </div>
        <Inspector />
      </div>
    </div>
  )
}
