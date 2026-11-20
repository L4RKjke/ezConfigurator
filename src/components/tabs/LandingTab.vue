<template>
    <BaseTab tab-name="landing">
        <section class="fork-intro" lang="ru">
            <h1>Возможности ezConfigurator</h1>
            <ul>
                <li>
                    <strong>Настройка правил VTX.</strong>
                    Правила можно задать прямо на вкладке «Видеопередатчик».
                </li>
                <li>
                    <strong>Переключение правил VTX во время ARM.</strong>
                    Отдельный флажок на той же вкладке разрешает переключать VTX правила.
                </li>
                <li>
                    <strong>Бесконечный первый этап Failsafe.</strong>
                    На вкладке «Failsafe», в настройках второго этапа рядом с длительностью
                    первого, можно включить флажок «Бесконечный первый этап».
                    Тогда перехода ко второму этапу по таймеру не будет.
                </li>
                <li><strong>Защита от случайного дизарма.</strong></li>
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

</style>
