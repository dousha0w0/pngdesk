<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import AppButton from "./AppButton.vue";

const props = defineProps<{ title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") emit("close");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop fade-in" @pointerdown.self="emit('close')">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        :aria-label="props.title"
        :style="wide ? { width: 'min(620px, 100%)' } : undefined"
      >
        <div class="modal-head">
          <span class="flex-1">{{ title }}</span>
          <AppButton size="icon-sm" variant="ghost" icon="x" @click="emit('close')" />
        </div>
        <div class="modal-body scroll-thin">
          <slot />
        </div>
        <div class="modal-foot">
          <slot name="footer">
            <AppButton size="md" variant="secondary" @click="emit('close')">{{ $t("actions.close") }}</AppButton>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>
