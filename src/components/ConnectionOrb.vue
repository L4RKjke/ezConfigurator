<script setup lang="ts">
import { computed } from "vue";
import { useConnectionStore } from "@/stores/connection";

const connection = useConnectionStore();

const connected = computed(() => connection.connectionValid && !connection.virtualMode);

const caption = computed(() => {
    if (connected.value) return "Дрон подключён";
    if (connection.virtualMode) return "Виртуальный контроллер";
    if (connection.connectingTo) return "Подключение…";
    return "Дрон не подключён";
});
</script>

<template>
    <figure class="connection-orb" :class="{ 'is-connected': connected }">
        <div class="sphere" aria-hidden="true">
            <div class="flow">
                <div class="palette idle"></div>
                <div class="palette live"></div>
            </div>
        </div>
        <figcaption role="status">{{ caption }}</figcaption>
    </figure>
</template>

<style scoped>
.connection-orb {
    display: grid;
    justify-items: center;
    gap: 1rem;
    margin: 0;
    padding: 1.5rem 1rem;
    color: var(--text);
}

.sphere {
    position: relative;
    width: clamp(7rem, 18vw, 12rem);
    aspect-ratio: 1;
    overflow: hidden;
    isolation: isolate;
    border-radius: 50%;
    background: var(--orb-idle-dark);
    box-shadow: 0 0.7rem 1.2rem -0.7rem rgb(0 0 0 / 45%);
}

/* Градиент вращается, а блик и тень остаются на месте. */
.flow {
    position: absolute;
    inset: -26%;
    animation: orb-turn 22s linear infinite;
}

.palette {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse at 30% 32%, var(--light), transparent 43%),
        radial-gradient(ellipse at 68% 58%, var(--mid) 5%, transparent 50%),
        linear-gradient(135deg, var(--mid), var(--dark) 72%);
}

.idle {
    --light: var(--orb-idle-light);
    --mid: var(--orb-idle-mid);
    --dark: var(--orb-idle-dark);
}

.live {
    --light: var(--orb-live-light);
    --mid: var(--orb-live-mid);
    --dark: var(--orb-live-dark);
    opacity: 0;
    transition: opacity 900ms ease-in-out;
}

.is-connected .live {
    opacity: 1;
}

.sphere::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background:
        radial-gradient(ellipse at 29% 23%, rgb(255 255 255 / 68%), transparent 23%),
        radial-gradient(circle at 35% 30%, transparent 38%, rgb(0 0 0 / 48%) 96%);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 18%);
}

.connection-orb figcaption {
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
}

@keyframes orb-turn {
    to {
        transform: rotate(1turn);
    }
}

@media (prefers-reduced-motion: reduce) {
    .flow {
        animation: none;
    }

    .live {
        transition: none;
    }
}
</style>
