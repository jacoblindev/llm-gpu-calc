import type { AppState } from '@app/state'
import { computeDeploymentSuggestions } from '@app/controller'

export interface SuggestionAction {
  field: 'max_model_len' | 'max_num_seqs'
  current: number
  suggested: number
  delta: number
  canApply: boolean
}

export interface InsightSuggestion {
  id: string
  name: string
  modelName?: string
  actions: SuggestionAction[]
  impactScore: number
}

interface BuildSuggestionsInput {
  state: AppState
}

function createAction(field: SuggestionAction['field'], current: number, suggested: number): SuggestionAction {
  const delta = suggested - current
  const canApply = suggested > 0 && Math.abs(delta) > 0
  return { field, current, suggested, delta, canApply }
}

export function buildInsightSuggestions({ state }: BuildSuggestionsInput): InsightSuggestion[] {
  const modelsById = new Map(state.models.map((m) => [m.id, m]))
  const suggestions: InsightSuggestion[] = []

  for (const deployment of state.deployments) {
    const next = computeDeploymentSuggestions(state, deployment.id)
    const len = createAction('max_model_len', deployment.maxModelLen, next.maxModelLen)
    const seqs = createAction('max_num_seqs', deployment.maxNumSeqs, next.maxNumSeqs)
    const actionable = [len, seqs].filter((action) => action.canApply)
    if (!actionable.length) continue

    const model = modelsById.get(deployment.modelId)
    const impactScore = actionable.reduce((sum, action) => sum + Math.abs(action.delta), 0)

    suggestions.push({
      id: deployment.id,
      name: deployment.id,
      modelName: model?.name,
      actions: actionable,
      impactScore,
    })
  }

  return suggestions.sort((a, b) => {
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore
    const nameA = a.modelName ?? a.name
    const nameB = b.modelName ?? b.name
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
  })
}
