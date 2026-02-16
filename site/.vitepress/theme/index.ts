import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import Footer from "./Footer.vue";
import KeyPreview from "./KeyPreview.vue";
import ParticipantCard from "./ParticipantCard.vue";
import ParticipantProfile from "./ParticipantProfile.vue";

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "layout-bottom": () => h(Footer),
    });
  },
  enhanceApp({ app }) {
    app.component("ParticipantCard", ParticipantCard);
    app.component("ParticipantProfile", ParticipantProfile);
    app.component("KeyPreview", KeyPreview);
  },
};
