<template>
    <BaseTab tab-name="landing">
<section class="fork-intro" lang="ru">
    <h1>Возможности ezConfigurator</h1>
    <ul class="features">
        <li class="feature done">
            <span class="mark" aria-label="реализовано">✓</span>
            <div>
                <strong>Настройка правил VTX.</strong>
                <p>Правила можно задать прямо на вкладке «Видеопередатчик».</p>
            </div>
        </li>
        <li class="feature todo">
            <span class="mark" aria-label="не реализовано">✗</span>
            <div>
                <strong>Переключение правил VTX во время ARM.</strong>
                <p>Отдельный флажок на той же вкладке разрешает переключать VTX правила.</p>
            </div>
        </li>
        <li class="feature todo">
            <span class="mark" aria-label="не реализовано">✗</span>
            <div>
                <strong>Бесконечный первый этап Failsafe.</strong>
                <p>
                    На вкладке «Failsafe», в настройках второго этапа рядом с длительностью
                    первого, можно включить флажок «Бесконечный первый этап».
                    Тогда перехода ко второму этапу по таймеру не будет.
                </p>
            </div>
        </li>
        <li class="feature todo">
            <span class="mark" aria-label="не реализовано">✗</span>
            <div>
                <strong>Защита от случайного дизарма.</strong>
            </div>
        </li>
        <li class="feature todo">
            <span class="mark" aria-label="не реализовано">✗</span>
            <div>
                <strong>Загрузка кастомных прошивок через программатор.</strong>
            </div>
        </li>
        <li class="feature todo">
            <span class="mark" aria-label="не реализовано">✗</span>
            <div>
                <strong>Снятие защиты с дрона: отдельный режим.</strong>
            </div>
        </li>
    </ul>
</section>

    </BaseTab>
</template>

<script setup lang="ts">
    import BaseTab from "./BaseTab.vue";
</script>

<style scoped>
.fork-intro {
    max-width: 72ch;
    padding: clamp(16px, 4vw, 40px);
    color: var(--text);
    font-size: 15px;
    line-height: 1.6;
}

.fork-intro h1 {
    margin: 0 0 1rem;
    font-size: 1.5rem;
    line-height: 1.25;
}

.fork-intro ul {
    margin: 0;
    padding-inline-start: 1.4em;
    list-style: disc;
}

.fork-intro li + li {
    margin-top: 0.75em;
}
.tab-landing {
    min-height: 100%;
    background: transparent
}
.fork-intro h1::after {
    content: "";
    display: block;
    width: 3rem;
    height: 2px;
    margin-top: 0.55rem;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--primary-500), var(--orb-live-mid));
}
.fork-intro {
    max-width: 720px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    color: #1f2937;
}

.fork-intro h1 {
    margin: 0 0 1.5rem;
    font-size: 1.75rem;
    font-weight: 700;
}

.features {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
}

.feature {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 12px;
    background: #f7f8fa;
    border: 1px solid #e5e7eb;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.feature:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.mark {
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #ffffff;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
}

.done .mark {
    background: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
}

.todo .mark {
    background: #ef4444;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
}

.feature strong {
    display: block;
    margin-bottom: 4px;
    font-size: 1rem;
}

.feature p {
    margin: 0;
    color: #4b5563;
    line-height: 1.5;
}

.todo strong {
    color: #6b7280;
}

.todo p {
    color: #9ca3af;
}

@media (prefers-color-scheme: dark) {
    .fork-intro {
        background: #111827;
        color: #f9fafb;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .feature {
        background: #1f2937;
        border-color: #374151;
    }

    .feature p {
        color: #d1d5db;
    }

    .todo strong {
        color: #9ca3af;
    }

    .todo p {
        color: #6b7280;
    }
}

@media (max-width: 600px) {
    .fork-intro {
        padding: 1.25rem;
        margin: 1rem;
    }
}


</style>
