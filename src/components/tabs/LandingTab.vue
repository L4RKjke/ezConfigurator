<template>
    <BaseTab tab-name="landing">
        <section class="kanban" lang="ru">
            <h1>Дорожная карта ezConfigurator</h1>

            <div class="columns">
                <div
                    v-for="column in columns"
                    :key="column.key"
                    class="column"
                    :class="`column-${column.key}`"
                >
                    <header class="column-header">
                        <h2>{{ column.title }}</h2>
                        <span class="count">{{ column.items.length }}</span>
                    </header>

                    <ul class="cards">
                        <li
                            v-for="(card, index) in column.items"
                            :key="index"
                            class="card"
                        >
                            <div class="card-index">{{ index + 1 }}</div>

                            <div class="card-body">
                                <p v-if="card.title" class="card-title">
                                    {{ card.title }}
                                </p>

                                <template v-if="card.subsections">
                                    <div
                                        v-for="(sub, subIndex) in card.subsections"
                                        :key="subIndex"
                                        class="subsection"
                                    >
                                        <p class="subsection-title">{{ sub.title }}</p>
                                        <pre v-if="sub.code" class="code"><code>{{ sub.code }}</code></pre>
                                    </div>
                                </template>

                                <pre v-else-if="card.code" class="code"><code>{{ card.code }}</code></pre>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    </BaseTab>
</template>

<script setup lang="ts">
    import BaseTab from "./BaseTab.vue";

    type CardSection = {
        title: string;
        code?: string;
    };

    type Card = {
        title?: string;
        code?: string;
        subsections?: CardSection[];
    };

    type Column = {
        key: string;
        title: string;
        items: Card[];
    };

    // ============================================================================
    // Содержимое колонок. Редактируйте только этот блок.
    // key: "backlog" | "todo" | "done" — влияет на цвет номера и бейджа.
    // В карточке допустимо: title, code, subsections[{title, code}].
    // ============================================================================
    const columns: Column[] = [
        {
            key: "backlog",
            title: "Backlog",
            items: [
                { title: "Снятие защиты с дрона как отдельный режим" },
                { title: "Добавление каталога передатчиков во вкладку «Видеопередатчик»" },
            ],
        },
        {
            key: "todo",
            title: "TODO",
            items: [
                {
                    title: "Добавить тумблеры в UI для редактирования",
                    subsections: [
                        {
                            title: "Переключение каналов во время арма",
                            code: [
                                "set vtx_allow_vtx_changes_while_armed=OFF",
                                "set vtx_allow_vtx_changes_while_armed=ON",
                            ].join("\n"),
                        },
                        {
                            title: "Бесконечный failsafe",
                            code: [
                                "set failsafe_stage2_disabled=0",
                                "set failsafe_stage2_disabled=1",
                            ].join("\n"),
                        },
                    ],
                },
            ],
        },
        {
            key: "done",
            title: "Done",
            items: [
                { title: "Программатор для кастомных прошивок" },
                { title: "Настройка правил в видеопередатчике" },
                { title: "Кол-во VTX rules: 10 → 40" },
                { title: "Кол-во бендов для сетки: 8 → 20" },
                {
                    title: "Переключение каналов во время арма",
                    code: [
                        "get vtx_allow_vtx_changes_while_armed",
                        "set vtx_allow_vtx_changes_while_armed=OFF",
                        "set vtx_allow_vtx_changes_while_armed=ON",
                    ].join("\n"),
                },
                {
                    title: "Бесконечный failsafe",
                    code: [
                        "set failsafe_stage2_disabled",
                        "set failsafe_stage2_disabled=0",
                        "set failsafe_stage2_disabled=1",
                    ].join("\n"),
                },
            ],
        },
    ];
</script>

<style scoped>
.tab-landing {
    min-height: 100%;
    background: transparent;
}

.kanban {
    max-width: 1100px;
    margin: 2rem auto;
    padding: clamp(16px, 3vw, 32px);
    color: var(--text, #1f2937);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
}

.kanban h1 {
    margin: 0 0 1.5rem;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.25;
}

.kanban h1::after {
    content: "";
    display: block;
    width: 3rem;
    height: 2px;
    margin-top: 0.55rem;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--primary-500, #3b82f6), var(--orb-live-mid, #6366f1));
}

.columns {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
}

.column {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.06);
}

.column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 2px;
}

.column-header h2 {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary, #4b5563);
}

.count {
    display: inline-grid;
    place-items: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 11px;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.06);
    color: var(--text-secondary, #4b5563);
}

.column-backlog .count { background: #e5e7eb; color: #374151; }
.column-todo .count    { background: #fef3c7; color: #92400e; }
.column-done .count    { background: #d1fae5; color: #065f46; }

.cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.card {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--surface, #ffffff);
    border: 1px solid rgba(0, 0, 0, 0.08);
}

.card-index {
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

.column-todo .card-index { background: #fef3c7; color: #92400e; }
.column-done .card-index { background: #d1fae5; color: #065f46; }

.card-body {
    flex: 1 1 auto;
    min-width: 0;
}

.card-title {
    margin: 0;
    font-weight: 500;
    color: var(--text, #1f2937);
}

.subsection {
    margin-top: 8px;
}

.subsection:first-child {
    margin-top: 0;
}

.subsection-title {
    margin: 0 0 4px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary, #4b5563);
}

.code {
    margin: 6px 0 0;
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

@media (max-width: 900px) {
    .columns {
        grid-template-columns: 1fr;
    }
}

@media (prefers-color-scheme: dark) {
    .kanban {
        color: var(--text, #f9fafb);
    }

    .column {
        background: rgba(255, 255, 255, 0.02);
        border-color: rgba(255, 255, 255, 0.06);
    }

    .column-header h2,
    .subsection-title,
    .card-index,
    .count {
        color: var(--text-secondary, #9ca3af);
    }

    .card {
        background: var(--surface, #1f2937);
        border-color: rgba(255, 255, 255, 0.08);
    }

    .card-index {
        background: rgba(255, 255, 255, 0.06);
    }

    .code {
        background: rgba(255, 255, 255, 0.06);
    }

    .column-backlog .count { background: #374151; color: #d1d5db; }
    .column-todo .count    { background: #78350f; color: #fef3c7; }
    .column-done .count    { background: #064e3b; color: #d1fae5; }

    .column-todo .card-index { background: #78350f; color: #fef3c7; }
    .column-done .card-index { background: #064e3b; color: #d1fae5; }
}
</style>