import { ref, computed, watch } from 'vue'
import type { GameState, LogEntry, RandomEvent, ActionType, ActionEffect, ActiveChoiceEvent, EventOption } from '@/types/game'
import { randomEvents } from '@/data/events'

const STORAGE_KEY_HIGH_SCORE = 'survival_game_high_score'
const MAX_STAT = 100

const actionEffects: Record<ActionType, ActionEffect> = {
  gatherWood: {
    health: -5, hunger: 5, thirst: 3, wood: 10, stone: 0 },
  gatherStone: {
    health: -8, hunger: 6, thirst: 4, wood: 0, stone: 8 },
  hunt: {
    health: 15, hunger: -20, thirst: 5, wood: -5, stone: 0 },
  drink: {
    health: 0, hunger: 2, thirst: -25, wood: -3, stone: 0 },
}

const actionNames: Record<ActionType, string> = {
  gatherWood: '采集木头',
  gatherStone: '采集石头',
  hunt: '打猎',
  drink: '喝水',
}

export function useGame() {
  const state = ref<GameState>({
    health: 80,
    hunger: 30,
    thirst: 30,
    wood: 10,
    stone: 5,
    turn: 0,
    isGameOver: false,
    logs: [],
  })

  const highScore = ref<number>(0)
  const activeChoiceEvent = ref<ActiveChoiceEvent | null>(null)
  let logIdCounter = 0

  const canAct = computed(() => !state.value.isGameOver && !activeChoiceEvent.value)

  function loadHighScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIGH_SCORE)
      if (saved) {
        highScore.value = parseInt(saved, 10) || 0
      }
    } catch (e) {
      highScore.value = 0
    }
  }

  function saveHighScore() {
    if (state.value.turn > highScore.value) {
      highScore.value = state.value.turn
      try {
        localStorage.setItem(STORAGE_KEY_HIGH_SCORE, String(highScore.value))
      } catch (e) {
        // ignore
      }
    }
  }

  function addLog(text: string, type: LogEntry['type'] = 'action') {
    state.value.logs.unshift({
      id: ++logIdCounter,
      text,
      type,
      turn: state.value.turn,
    })
    if (state.value.logs.length > 50) {
      state.value.logs.pop()
    }
  }

  function clampStat(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  function applyEffects(effects: ActionEffect) {
    if (effects.health !== undefined) {
      state.value.health = clampStat(state.value.health + effects.health, 0, MAX_STAT)
    }
    if (effects.hunger !== undefined) {
      state.value.hunger = clampStat(state.value.hunger + effects.hunger, 0, MAX_STAT)
    }
    if (effects.thirst !== undefined) {
      state.value.thirst = clampStat(state.value.thirst + effects.thirst, 0, MAX_STAT)
    }
    if (effects.wood !== undefined) {
      state.value.wood = Math.max(0, state.value.wood + effects.wood)
    }
    if (effects.stone !== undefined) {
      state.value.stone = Math.max(0, state.value.stone + effects.stone)
    }
  }

  function getNormalEvents(): RandomEvent[] {
    return randomEvents.filter(e => !e.isChoice)
  }

  function getChoiceEvents(): RandomEvent[] {
    return randomEvents.filter(e => e.isChoice)
  }

  function getRandomNormalEvent(): RandomEvent {
    const normalEvents = getNormalEvents()
    const index = Math.floor(Math.random() * normalEvents.length)
    return normalEvents[index]
  }

  function canAffordOption(option: EventOption): boolean {
    const effects = option.effects
    if (effects.wood !== undefined && state.value.wood + effects.wood < 0) {
      return false
    }
    if (effects.stone !== undefined && state.value.stone + effects.stone < 0) {
      return false
    }
    return true
  }

  function rollChoiceEvent(): RandomEvent | null {
    const choiceChance = 0.18
    if (Math.random() > choiceChance) return null

    const choiceEvents = getChoiceEvents()
    if (choiceEvents.length === 0) return null

    const index = Math.floor(Math.random() * choiceEvents.length)
    return choiceEvents[index]
  }

  function checkGameOver() {
    if (state.value.health <= 0 || state.value.hunger >= MAX_STAT || state.value.thirst >= MAX_STAT) {
      state.value.isGameOver = true
      saveHighScore()
      addLog('你没能在荒野中生存下来...', 'system')
    }
  }

  function canPerformAction(action: ActionType): boolean {
    if (state.value.isGameOver) return false
    const effects = actionEffects[action]
    if (effects.wood !== undefined && state.value.wood + effects.wood < 0) {
      return false
    }
    if (effects.stone !== undefined && state.value.stone + effects.stone < 0) {
      return false
    }
    return true
  }

  function performAction(action: ActionType) {
    if (!canPerformAction(action)) return

    const effects = actionEffects[action]
    applyEffects(effects)
    state.value.turn++

    addLog(`第 ${state.value.turn} 回合：${actionNames[action]}`, 'action')

    const choiceEvent = rollChoiceEvent()
    if (choiceEvent && choiceEvent.options) {
      activeChoiceEvent.value = {
        event: choiceEvent,
        turn: state.value.turn,
      }
      addLog(choiceEvent.text, 'event')
      return
    }

    const event = getRandomNormalEvent()
    applyEffects(event.effects)

    const eventLogType = event.type === 'good' ? 'good' : event.type === 'bad' ? 'bad' : 'event'
    addLog(event.text, eventLogType)

    checkGameOver()
  }

  function resolveChoice(optionId: string) {
    if (!activeChoiceEvent.value) return

    const event = activeChoiceEvent.value.event
    const option = event.options?.find(o => o.id === optionId)
    if (!option) return

    if (!canAffordOption(option)) return

    applyEffects(option.effects)

    if (optionId === 'decline') {
      addLog(`你婉拒了商人的交易提议。`, 'event')
    } else {
      addLog(`你选择了「${option.label}」交易。`, 'good')
    }

    activeChoiceEvent.value = null

    checkGameOver()
  }

  function gatherWood() {
    performAction('gatherWood')
  }

  function gatherStone() {
    performAction('gatherStone')
  }

  function hunt() {
    performAction('hunt')
  }

  function drink() {
    performAction('drink')
  }

  function restart() {
    state.value = {
      health: 80,
      hunger: 30,
      thirst: 30,
      wood: 10,
      stone: 5,
      turn: 0,
      isGameOver: false,
      logs: [],
    }
    activeChoiceEvent.value = null
    logIdCounter = 0
    addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')
  }

  loadHighScore()
  addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')

  return {
    state,
    highScore,
    canAct,
    activeChoiceEvent,
    canPerformAction,
    canAffordOption,
    gatherWood,
    gatherStone,
    hunt,
    drink,
    resolveChoice,
    restart,
  }
}
