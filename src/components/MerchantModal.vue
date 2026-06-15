<script setup lang="ts">
import { computed } from 'vue'
import type { RandomEvent, EventOption } from '@/types/game'

interface Props {
  show: boolean
  event: RandomEvent | null
  canAffordOption: (option: EventOption) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  choose: [optionId: string]
}>()

const displayOptions = computed(() => {
  if (!props.event?.options) return []
  return props.event.options.map(option => ({
    ...option,
    disabled: option.id !== 'decline' && !props.canAffordOption(option),
  }))
})

function getOptionIcon(optionId: string): string {
  switch (optionId) {
    case 'trade_wood_for_food':
      return '🍖'
    case 'trade_stone_for_food':
      return '🥩'
    case 'trade_wood_for_health':
      return '💊'
    case 'trade_stone_for_wood':
      return '🪵'
    case 'trade_wood_for_stone':
      return '🪨'
    case 'decline':
      return '👋'
    default:
      return '📦'
  }
}

function getOptionBgClass(optionId: string): string {
  if (optionId === 'decline') return 'bg-gray-700/40 hover:bg-gray-600/60'
  switch (optionId) {
    case 'trade_wood_for_food':
    case 'trade_stone_for_food':
      return 'bg-orange-900/40 hover:bg-orange-800/60'
    case 'trade_wood_for_health':
      return 'bg-red-900/40 hover:bg-red-800/60'
    case 'trade_stone_for_wood':
    case 'trade_wood_for_stone':
      return 'bg-amber-900/40 hover:bg-amber-800/60'
    default:
      return 'bg-gray-700/40 hover:bg-gray-600/60'
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show && event"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-game-card rounded-3xl p-8 max-w-lg w-full border border-game-border shadow-2xl animate-slide-up">
          <div class="text-center mb-6">
            <div class="text-6xl mb-4">🧙‍♂️</div>
            <h2 class="text-2xl font-bold text-white mb-2">旅行商人来访</h2>
            <p class="text-gray-400">{{ event.text }}</p>
          </div>

          <div class="space-y-3">
            <button
              v-for="option in displayOptions"
              :key="option.id"
              @click="!option.disabled && emit('choose', option.id)"
              :disabled="option.disabled"
              :class="[
                getOptionBgClass(option.id),
                'w-full p-4 rounded-xl border border-game-border transition-all duration-200 text-left',
                'flex items-center gap-4',
                option.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:scale-[1.02] hover:shadow-lg cursor-pointer active:scale-[0.98]',
              ]"
            >
              <span class="text-3xl flex-shrink-0">{{ getOptionIcon(option.id) }}</span>
              <div class="flex-1">
                <div class="text-white font-semibold">{{ option.label }}</div>
                <div class="text-gray-400 text-sm">{{ option.description }}</div>
              </div>
              <span v-if="option.disabled" class="text-gray-500 text-sm">资源不足</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>
