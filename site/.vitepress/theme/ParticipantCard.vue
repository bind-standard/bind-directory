<template>
  <a :href="`/participants/${slug}`" class="participant-card">
    <div class="card-header">
      <img
        :src="`/logos/${slug}.svg`"
        :alt="`${name} logo`"
        class="card-logo"
        @error="onImgError"
      />
      <span class="type-badge" :class="`type-${type}`">{{ typeLabel }}</span>
    </div>
    <h3 class="card-name">{{ name }}</h3>
    <p class="card-description">{{ description }}</p>
    <span v-if="status !== 'active'" class="status-badge" :class="`status-${status}`">
      {{ status }}
    </span>
  </a>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  slug: string;
  type: string;
  typeLabel: string;
  description: string;
  status: string;
}>();

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement;
  if (img.src.endsWith(".svg")) {
    img.src = img.src.replace(".svg", ".png");
  }
}
</script>

<style scoped>
.participant-card {
  display: block;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.participant-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
.type-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
}
.card-name {
  margin: 0 0 8px;
  font-size: 1.1rem;
}
.card-description {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
.status-badge {
  display: inline-block;
  margin-top: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
}
.status-pending { background: #fef3c7; color: #92400e; }
.status-suspended { background: #fee2e2; color: #991b1b; }
.status-revoked { background: #fecaca; color: #7f1d1d; }
</style>
