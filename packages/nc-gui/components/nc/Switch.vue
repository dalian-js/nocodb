<script lang="ts" setup>
const props = withDefaults(defineProps<{ checked: boolean; disabled?: boolean; size?: 'default' | 'small' }>(), {
  size: 'small',
})

const emit = defineEmits(['change', 'update:checked'])

const checked = useVModel(props, 'checked', emit)

const onChange = (e: boolean) => {
  emit('change', e)
}
</script>

<template>
  <a-switch v-model:checked="checked" :disabled="disabled" class="nc-switch" v-bind="$attrs" :size="size" @change="onChange">
  </a-switch>
  <span v-if="$slots.default" class="cursor-pointer pl-2" @click="checked = !checked">
    <slot />
  </span>
</template>
