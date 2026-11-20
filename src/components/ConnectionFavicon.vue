<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useConnectionStore } from "../stores/connection";

const connection = useConnectionStore();

const states = {
    offline:    { light: "#dce5ed", base: "#77899a", edge: "#425364", label: "Нет подключения" },
    connecting: { light: "#e0f1ff", base: "#68a7f5", edge: "#275f9f", label: "Подключение…" },
    online:     { light: "#c4fff0", base: "#45cbb8", edge: "#155466", label: "Подключено" },
} as const;

onMounted(() => {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/svg+xml";
    icon.sizes.add("any");

    // Заменяем старые favicon, не трогая manifest и apple-touch-icon.
    document.head.querySelectorAll('link[rel~="icon"]').forEach((old) => old.remove());
    document.head.append(icon);

    watch(
        () => connection.connectionValid ? "online"
            : connection.connectingTo ? "connecting"
            : "offline",
        (state) => {
            const { light, base, edge, label } = states[state];
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                    <defs>
                        <radialGradient id="orb" cx="35%" cy="28%" r="75%">
                            <stop stop-color="${light}"/>
                            <stop offset=".48" stop-color="${base}"/>
                            <stop offset="1" stop-color="${edge}"/>
                        </radialGradient>
                    </defs>
                    <circle cx="16" cy="16" r="14" fill="url(#orb)"
                            stroke="${edge}" stroke-width="1.5"/>
                </svg>`;

            icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
            document.title = `ezConfigurator — ${label}`;
        },
        { immediate: true },
    );
});
</script>

<template>
    <!-- Индикатор отображается только во вкладке браузера. -->
</template>
