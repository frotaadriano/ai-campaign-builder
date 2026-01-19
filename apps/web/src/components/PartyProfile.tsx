import { useMemo, type ChangeEvent } from 'react'

import type { PartyProfile } from '../models/types'
import { useCanvasStore } from '../state/store'

export const PartyProfilePanel = () => {
  const partyProfile = useCanvasStore((state) => state.partyProfile)
  const updatePartyProfile = useCanvasStore((state) => state.updatePartyProfile)

  const filledCount = useMemo(() => {
    return Object.values(partyProfile).filter((value) => value && value.trim()).length
  }, [partyProfile])

  const handleChange =
    (field: keyof PartyProfile) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updatePartyProfile({ [field]: event.target.value })
  }

  const handleClear = () => {
    updatePartyProfile({
      groupName: '',
      averageLevel: '',
      partySize: '',
      classes: '',
      goals: '',
      summary: '',
    })
  }

  return (
    <div className="panel panel--profile">
      <div className="panel__title">Perfil do grupo</div>
      <div className="panel__subtitle">
        Base para ajustar o desafio e o tom da campanha.
      </div>
      <div className="profile-status">
        {filledCount === 0 ? 'Nenhuma informacao' : `${filledCount} campos preenchidos`}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="group-name">Nome do grupo</label>
        <input
          id="group-name"
          className="field__input"
          type="text"
          value={partyProfile.groupName ?? ''}
          onChange={handleChange('groupName')}
          placeholder="Companhia do Dragao"
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="group-level">Nivel medio</label>
        <input
          id="group-level"
          className="field__input"
          type="text"
          value={partyProfile.averageLevel ?? ''}
          onChange={handleChange('averageLevel')}
          placeholder="5"
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="group-size">Tamanho do grupo</label>
        <input
          id="group-size"
          className="field__input"
          type="text"
          value={partyProfile.partySize ?? ''}
          onChange={handleChange('partySize')}
          placeholder="4"
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="group-classes">Classes/arquitipos</label>
        <input
          id="group-classes"
          className="field__input"
          type="text"
          value={partyProfile.classes ?? ''}
          onChange={handleChange('classes')}
          placeholder="Guerreiro, Clerigo, Ladino"
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="group-goals">Objetivo atual</label>
        <input
          id="group-goals"
          className="field__input"
          type="text"
          value={partyProfile.goals ?? ''}
          onChange={handleChange('goals')}
          placeholder="Investigar o Culto do Dragao"
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="group-summary">Resumo do grupo</label>
        <textarea
          id="group-summary"
          className="field__textarea"
          rows={4}
          value={partyProfile.summary ?? ''}
          onChange={handleChange('summary')}
          placeholder="Breve contexto do grupo e da ultima campanha."
        />
      </div>
      <button type="button" className="ghost-button" onClick={handleClear}>
        Limpar perfil
      </button>
    </div>
  )
}
