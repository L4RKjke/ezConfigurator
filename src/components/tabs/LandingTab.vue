<template>
    <BaseTab tab-name="landing">
        <section class="features" lang="ru">
            <p class="intro-text">
                <strong>ezConfigurator</strong> — форк программы <strong>Betaflight Configurator</strong>.
                Полностью повторяет функционал Betaflight Configurator, но добавляет новые возможности.
            </p>
            <h1>Преимущества ezConfigurator</h1>

            <div v-for="section in sections" :key="section.key" class="group">
                <h2 class="group-title">{{ section.title }}</h2>

                <ul class="feature-list">
                    <li
                        v-for="(item, index) in section.items"
                        :key="index"
                        class="feature"
                        :class="{ 'is-open': isOpen(section.key, index) }"
                    >
                        <button
                            type="button"
                            class="feature-toggle"
                            :aria-expanded="isOpen(section.key, index)"
                            :aria-controls="panelId(section.key, index)"
                            @click="toggle(section.key, index)"
                        >
                            <span class="feature-index">{{ index + 1 }}</span>
                            <span class="feature-title">{{ item.title }}</span>
                            <span class="chevron" aria-hidden="true">▾</span>
                        </button>

                        <div
                            v-if="isOpen(section.key, index)"
                            :id="panelId(section.key, index)"
                            class="feature-panel"
                        >
                            <p
                                v-for="(paragraph, pIndex) in item.description"
                                :key="pIndex"
                                class="feature-text"
                            >
                                {{ paragraph }}
                            </p>

                            <pre v-if="item.code" class="code"><code>{{ item.code }}</code></pre>
                        </div>
                    </li>
                </ul>
            </div>
        </section>
    </BaseTab>
</template>

<script setup lang="ts">
    import { reactive } from "vue";
    import BaseTab from "./BaseTab.vue";

    type Feature = {
        title: string;
        description: string[];
        code?: string;
    };

    type Section = {
        key: string;
        title: string;
        items: Feature[];
    };

    // ============================================================================
    // Содержимое блоков. Редактируйте только этот блок.
    // description — массив абзацев, code — необязательный блок CLI-команд.
    // ============================================================================
    const sections: Section[] = [
        {
            key: "firmware",
            title: "Прошивка",
            items: [
                {
                    title: "Лимит VTX-правил увеличен с 10 до 40",
                    description: [
                        "Прошивка Betaflight устанавливает максимальный лимит VTX-правил — 10.",
                        "Прошивка ezBeta увеличивает этот лимит до 40.",
                    ],
                },
                {
                    title: "Количество бендов для сетки увеличено с 8 до 20",
                    description: [
                        "20 бендов вместо 8 — расширенная сетка частот.",
                        "Больше бендов означает больше доступных каналов для выбора при работе с видеопередатчиком.",
                    ],
                },
                {
                    title: "Переключение каналов во время арма",
                    description: [
                        "Позволяет менять канал видеопередатчика, когда дрон армирован.",
                        "По умолчанию поведение соответствует штатной прошивке.",
                    ],
                    code: [
                        "get vtx_allow_vtx_changes_while_armed - текущий статус",
                        "set vtx_allow_vtx_changes_while_armed=OFF - поведение как в штатной прошивке (по умолчанию)",
                        "set vtx_allow_vtx_changes_while_armed=ON - переключение каналов в арме",
                    ].join("\n"),
                },
                {
                    title: "Бесконечный failsafe",
                    description: [
                        "Позволяет удерживать первый этап failsafe без перехода во второй.",
                        "По умолчанию поведение соответствует штатной прошивке.",
                    ],
                    code: [
                        "set failsafe_stage2_disabled=0 - поведение как в штатной прошивке (по умолчанию)",
                        "set failsafe_stage2_disabled=1 - бесконечный 1 этап, перехода во 2 этап не будет",
                    ].join("\n"),
                },
                {
                    title: "Защита от РЭБ: дизарм только при выполнении условий",
                    description: [
                        "Защищает от случайного или вынужденного дизарма, например при помехах от РЭБ.",
                        "Когда функция включена, дизарм возможен только при выполнении заданных условий: положения стиков, уровня газа и высоты.",
                        "disarm_guard_throttle задаёт уровень газа в процентах, при котором дизарм разрешён.",
                        "disarm_guard_alt_m задаёт порог высоты в метрах. Если значение равно 0, дизарм зависит только от положения стиков.",
                    ],
                    code: [
                        "get disarm_guard - текущий статус",
                        "get disarm_guard_alt_m - порог высоты, м",
                        "get disarm_guard_throttle - порог газа, %",
                        "set disarm_guard=OFF - поведение как в штатной прошивке (по умолчанию)",
                        "set disarm_guard=ON - дизарм только при выполнении условий",
                        "set disarm_guard_alt_m=3 - порог высоты 3 м (при 0 дизарм зависит только от стиков)",
                        "set disarm_guard_throttle=3 - уровень газа 3 %",
                    ].join("\n"),
                },
            ],
        },
        {
            key: "configurator",
            title: "Конфигуратор",
            items: [
                {
                    title: "Полная русская локализация интерфейса",
                    description: [
                        "Весь интерфейс конфигуратора переведён на русский язык: меню, вкладки, подсказки и сообщения.",
                    ],
                },
                {
                    title: "Настройка VTX-правил во вкладке видеопередатчика",
                    description: [
                        "VTX-правила настраиваются прямо во вкладке видеопередатчика, без ручного ввода CLI-команд.",
                        "Доступно до 40 правил, что соответствует лимиту прошивки ezBeta.",
                    ],
                },
                {
                    title: "Работа с обычными прошивками и прошивками TBF",
                    description: [
                        "Конфигуратор работает как с обычными прошивками Betaflight, так и с прошивками TBF.",
                        "Не нужно переключать программу или менять настройки при смене прошивки.",
                    ],
                },
            ],
        },
    ];

    // ============================================================================
    // Состояние раскрытия панелей
    // ============================================================================
    const openState = reactive<Record<string, boolean>>({});

    function stateKey(sectionKey: string, index: number): string {
        return sectionKey + "-" + index;
    }

    function isOpen(sectionKey: string, index: number): boolean {
        return !!openState[stateKey(sectionKey, index)];
    }

    function toggle(sectionKey: string, index: number): void {
        const key = stateKey(sectionKey, index);
        openState[key] = !openState[key];
    }

    function panelId(sectionKey: string, index: number): string {
        return "feature-panel-" + stateKey(sectionKey, index);
    }
</script>

<style scoped>
.tab-landing {
    min-height: 100%;
    background: transparent;
}

.features {
    max-width: 900px;
    margin: 2rem auto;
    padding: clamp(16px, 3vw, 32px);
    color: var(--text, #1f2937);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
}

/* ---------- Интро-блок ---------- */
.intro-text {
    margin: 0 0 1.75rem;
    padding: 12px 14px;
    border-radius: 8px;
    background: var(--surface-muted, rgba(0, 0, 0, 0.04));
    border-left: 3px solid var(--primary-500, #3b82f6);
    color: var(--text, #1f2937);
    font-size: 0.95rem;
    line-height: 1.55;
}

.intro-text strong {
    font-weight: 600;
}

/* ---------- Заголовки ---------- */
.features h1 {
    margin: 0 0 1.5rem;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.25;
}

.features h1::after {
    content: "";
    display: block;
    width: 3rem;
    height: 2px;
    margin-top: 0.55rem;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--primary-500, #3b82f6), var(--orb-live-mid, #6366f1));
}

.group {
    margin-bottom: 1.75rem;
}

.group-title {
    margin: 0 0 0.75rem;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary, #4b5563);
}

/* ---------- Список фич ---------- */
.feature-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.feature {
    border-radius: 8px;
    background: var(--surface, #ffffff);
    border: 1px solid rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

.feature.is-open {
    border-color: rgba(59, 130, 246, 0.35);
}

.feature-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.feature-toggle:focus-visible {
    outline: 2px solid var(--primary-500, #3b82f6);
    outline-offset: -2px;
}

.feature-index {
    flex: 0 0 22px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-size: 0.7rem;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-secondary, #6b7280);
}

.feature-title {
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 500;
    color: var(--text, #1f2937);
}

.chevron {
    flex: 0 0 auto;
    color: var(--text-secondary, #6b7280);
    transition: transform 0.2s ease;
}

.feature.is-open .chevron {
    transform: rotate(180deg);
}

.feature-panel {
    padding: 0 12px 12px 44px;
}

.feature-text {
    margin: 0 0 6px;
    color: var(--text-secondary, #4b5563);
}

.feature-text:last-child {
    margin-bottom: 0;
}

.code {
    margin: 8px 0 0;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.04);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.72rem;
    line-height: 1.45;
    color: var(--text, #1f2937);
    overflow-x: auto;
    white-space: pre;
}

.code code {
    font-family: inherit;
    background: transparent;
    padding: 0;
    color: inherit;
}

/* ============================================================
   Тёмная тема — по классу/атрибуту, а не по media-запросу.
   Поддержаны оба популярных варианта:
     • .dark        — @nuxtjs/color-mode / Nuxt UI (по умолчанию)
     • [data-theme="dark"] — альтернативные обёртки
   ============================================================ */
:global(.dark) .features,
:global([data-theme="dark"]) .features {
    color: var(--text, #f9fafb);
}

:global(.dark) .intro-text,
:global([data-theme="dark"]) .intro-text {
    background: var(--surface-muted, rgba(255, 255, 255, 0.05));
    border-left-color: var(--primary-500, #60a5fa);
    color: var(--text, #f9fafb);
}

:global(.dark) .group-title,
:global(.dark) .feature-index,
:global(.dark) .chevron,
:global(.dark) .feature-text,
:global([data-theme="dark"]) .group-title,
:global([data-theme="dark"]) .feature-index,
:global([data-theme="dark"]) .chevron,
:global([data-theme="dark"]) .feature-text {
    color: var(--text-secondary, #9ca3af);
}

:global(.dark) .feature,
:global([data-theme="dark"]) .feature {
    background: var(--surface, #1f2937);
    border-color: rgba(255, 255, 255, 0.08);
}

:global(.dark) .feature.is-open,
:global([data-theme="dark"]) .feature.is-open {
    border-color: rgba(96, 165, 250, 0.45);
}

:global(.dark) .feature-index,
:global([data-theme="dark"]) .feature-index {
    background: rgba(255, 255, 255, 0.06);
}

:global(.dark) .code,
:global([data-theme="dark"]) .code {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text, #f9fafb);
}
</style>