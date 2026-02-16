<template>
  <div class="participant-profile">
    <div class="profile-header">
      <img
        :src="`/logos/${slug}.svg`"
        :alt="`${manifest.organization.name} logo`"
        class="profile-logo"
        @error="onImgError"
      />
      <div>
        <h1 class="profile-name">{{ manifest.displayName || manifest.organization.name }}</h1>
        <div class="profile-meta">
          <span class="type-badge">{{ typeLabel }}</span>
          <span class="status-badge" :class="`status-${manifest.status}`">{{ manifest.status }}</span>
        </div>
      </div>
    </div>

    <p class="profile-description">{{ manifest.description }}</p>

    <div class="profile-details">
      <div class="detail-section">
        <h3>Details</h3>
        <table>
          <tr>
            <td>Legal Name</td>
            <td>{{ manifest.organization.name }}</td>
          </tr>
          <tr>
            <td>Issuer (iss)</td>
            <td><code>{{ iss }}</code></td>
          </tr>
          <tr v-if="website">
            <td>Website</td>
            <td><a :href="website" target="_blank" rel="noopener">{{ website }}</a></td>
          </tr>
          <tr>
            <td>Joined</td>
            <td>{{ manifest.joinedAt }}</td>
          </tr>
          <tr v-if="manifest.organization.linesOfBusiness?.length">
            <td>Lines of Business</td>
            <td>{{ manifest.organization.linesOfBusiness.map(lob => lob.text || lob.coding?.[0]?.display || lob.coding?.[0]?.code).join(', ') }}</td>
          </tr>
        </table>
      </div>

      <div v-if="manifest.organization.address?.length" class="detail-section">
        <h3>Address</h3>
        <ul>
          <li v-for="(a, i) in manifest.organization.address" :key="i">
            <span v-if="a.city">{{ a.city }}</span><span v-if="a.city && a.state">, </span><span v-if="a.state">{{ a.state }}</span><span v-if="(a.city || a.state) && a.country"> — </span>{{ a.country }}
          </li>
        </ul>
      </div>

      <div v-if="manifest.organization.territories?.length" class="detail-section">
        <h3>Territories</h3>
        <ul>
          <li v-for="t in manifest.organization.territories" :key="t">{{ t }}</li>
        </ul>
      </div>

      <div v-if="contactPoints.length" class="detail-section">
        <h3>Contacts</h3>
        <div v-for="(c, i) in contactPoints" :key="i" class="contact-item">
          <span v-if="c.system === 'email'">
            <a :href="`mailto:${c.value}`">{{ c.value }}</a>
          </span>
          <span v-else-if="c.system === 'phone'">
            {{ c.value }}
          </span>
          <span v-else-if="c.system === 'url'">
            <a :href="c.value" target="_blank" rel="noopener">{{ c.value }}</a>
          </span>
          <span v-else>{{ c.value }}</span>
          <span v-if="c.use" class="contact-role"> ({{ c.use }})</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Public Keys (JWKS)</h3>
      <p>
        <a :href="`/${slug}/.well-known/jwks.json`" target="_blank" rel="noopener">
          <code>{{ slug }}/.well-known/jwks.json</code>
        </a>
      </p>
      <KeyPreview :jwks="jwks" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const TYPE_LABELS: Record<string, string> = {
  insurer: "Insurer",
  broker: "Broker",
  mga: "MGA",
  tpa: "TPA",
  reinsurer: "Reinsurer",
  expert: "Expert",
  counsel: "Counsel",
  "tech-provider": "Technology Provider",
  "industry-body": "Industry Body",
};

const props = defineProps<{
  manifest: {
    schemaVersion: string;
    slug: string;
    displayName?: string;
    description: string;
    jwksUrl?: string;
    joinedAt: string;
    status: string;
    organization: {
      resourceType: string;
      name: string;
      status: string;
      type: {
        coding?: { system?: string; code: string; display?: string }[];
        text?: string;
      };
      address?: {
        use?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country: string;
      }[];
      contact?: { system: string; value: string; use?: string }[];
      linesOfBusiness?: { coding?: { code: string; display?: string }[]; text?: string }[];
      territories?: string[];
    };
  };
  iss: string;
  jwks: {
    keys: { kty?: string; kid?: string; alg?: string; use?: string; [key: string]: unknown }[];
  };
  slug: string;
}>();

const orgTypeCode = props.manifest.organization.type.coding?.[0]?.code ?? "";
const typeLabel = TYPE_LABELS[orgTypeCode] || orgTypeCode;

const website = computed(
  () => props.manifest.organization.contact?.find((c) => c.system === "url")?.value,
);

const contactPoints = computed(() =>
  (props.manifest.organization.contact ?? []).filter((c) => c.system !== "url"),
);

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement;
  if (img.src.endsWith(".svg")) {
    img.src = img.src.replace(".svg", ".png");
  }
}
</script>

<style scoped>
.participant-profile {
  max-width: 800px;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}
.profile-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
}
.profile-name {
  margin: 0 0 8px;
}
.profile-meta {
  display: flex;
  gap: 8px;
}
.type-badge {
  font-size: 0.8rem;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 4px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.status-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 4px;
  text-transform: uppercase;
}
.status-active { background: #d1fae5; color: #065f46; }
.status-pending { background: #fef3c7; color: #92400e; }
.status-suspended { background: #fee2e2; color: #991b1b; }
.status-revoked { background: #fecaca; color: #7f1d1d; }
.profile-description {
  font-size: 1.05rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin-bottom: 32px;
}
.profile-details {
  display: grid;
  gap: 24px;
}
.detail-section {
  margin-bottom: 16px;
}
.detail-section h3 {
  margin: 0 0 12px;
  font-size: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 8px;
}
.detail-section table {
  width: 100%;
  border-collapse: collapse;
}
.detail-section td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  vertical-align: top;
}
.detail-section td:first-child {
  font-weight: 500;
  white-space: nowrap;
  width: 160px;
  color: var(--vp-c-text-2);
}
.detail-section ul {
  margin: 0;
  padding-left: 20px;
}
.detail-section li {
  margin-bottom: 4px;
}
.contact-item {
  margin-bottom: 12px;
}
.contact-role {
  color: var(--vp-c-text-2);
}
</style>
