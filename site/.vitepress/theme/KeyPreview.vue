<template>
  <div class="key-preview">
    <table v-if="jwks.keys.length > 0">
      <thead>
        <tr>
          <th>kid</th>
          <th>kty</th>
          <th>alg</th>
          <th>use</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="key in jwks.keys" :key="key.kid">
          <td><code>{{ key.kid || '—' }}</code></td>
          <td>{{ key.kty || '—' }}</td>
          <td>{{ key.alg || '—' }}</td>
          <td>{{ key.use || '—' }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="no-keys">No keys published.</p>

    <details v-if="jwks.keys.length > 0" class="raw-jwks">
      <summary>Raw JWKS</summary>
      <pre><code>{{ JSON.stringify(jwks, null, 2) }}</code></pre>
    </details>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  jwks: {
    keys: { kty?: string; kid?: string; alg?: string; use?: string; [key: string]: unknown }[];
  };
}>();
</script>

<style scoped>
.key-preview table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.key-preview th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-weight: 600;
}
.key-preview td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.no-keys {
  color: var(--vp-c-text-3);
  font-style: italic;
}
.raw-jwks {
  margin-top: 16px;
}
.raw-jwks summary {
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
.raw-jwks pre {
  margin-top: 8px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.8rem;
}
</style>
