<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; label: string; hint?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
  <label class="flex cursor-pointer items-start justify-between gap-4 py-1.5">
    <span class="min-w-0">
      <span class="block text-[12.5px]">{{ props.label }}</span>
      <span v-if="props.hint" class="block text-[11px] text-muted-foreground">{{ props.hint }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="props.modelValue"
      :aria-label="props.label"
      class="relative mt-0.5 h-[18px] w-[30px] shrink-0 rounded-full border transition-colors"
      :class="props.modelValue ? 'border-transparent bg-primary' : 'border-input bg-muted'"
      @click="emit('update:modelValue', !props.modelValue)"
    >
      <span
        class="absolute top-[1px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-[left]"
        :class="props.modelValue ? 'left-[14px]' : 'left-[1px]'"
        :style="props.modelValue ? { background: 'var(--primary-foreground)' } : undefined"
      />
    </button>
  </label>
</template>
