<template>
    <div class="ezbeta-board-build flex flex-col gap-4">
        <!-- ============== Версия прошивки ============== -->
        <section class="rounded-lg border border-default bg-elevated/30 p-4">
            <h3 class="text-sm font-semibold mb-2">Выбор версии прошивки</h3>
            <div class="flex flex-wrap items-center gap-3">
                <USelect
                    v-model="state.selectedVersion"
                    :items="versionOptions"
                    :placeholder="state.loading ? 'Загрузка…' : '—'"
                    :disabled="state.loading || versionOptions.length === 0"
                    class="min-w-[280px]"
                />
                <span v-if="releaseInfo" class="text-xs text-muted">{{ releaseInfo }}</span>
            </div>
        </section>

        <!-- ============== Плата ============== -->
        <section class="rounded-lg border border-default bg-elevated/30 p-4">
            <h3 class="text-sm font-semibold mb-2">Выбор платы</h3>
            <div class="flex flex-wrap items-center gap-3">
                <UInput v-model="state.boardFilter" placeholder="Поиск платы..." />
                <!-- Нативный <select>: USelect не перерисовывает options при изменении items -->
                <select
                    v-model="state.selectedBoard"
                    :disabled="state.loading"
                    class="min-w-[280px] rounded-md border border-default bg-default px-3 py-2 text-sm text-default focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                >
                    <option value="">—</option>
                    <option v-for="b in boardOptions" :key="b.value" :value="b.value">
                        {{ b.label }}
                    </option>
                </select>
                <UButton variant="outline" @click="onDetectBoard">Определить</UButton>
                <span class="text-xs text-muted">Плат: {{ state.allBoards.length }}</span>
            </div>
        </section>

        <!-- ============== Конфигурация сборки ============== -->
        <section class="rounded-lg border border-default bg-elevated/30 p-4 flex flex-col gap-3">
            <h3 class="text-sm font-semibold">Конфигурация сборки</h3>

            <label class="grid grid-cols-[180px_1fr] items-center gap-3 text-sm">
                <span class="text-muted">Приёмник</span>
                <USelect v-model="state.selectedRadio" :items="radioOptions" size="sm" class="max-w-xs" />
            </label>

            <label class="grid grid-cols-[180px_1fr] items-center gap-3 text-sm">
                <span class="text-muted">OSD</span>
                <USelect v-model="state.selectedOsd" :items="osdOptions" size="sm" class="max-w-xs" />
            </label>

            <label class="grid grid-cols-[180px_1fr] items-center gap-3 text-sm">
                <span class="text-muted">Телеметрия</span>
                <div class="flex items-center gap-3">
                    <USelect
                        v-model="state.selectedTelemetry"
                        :items="telemetryOptions"
                        :disabled="!telemetrySupported"
                        clearable
                        size="sm"
                        placeholder="Не выбрано"
                        class="max-w-xs min-w-[220px]"
                    />
                    <span v-if="!telemetrySupported" class="text-xs text-muted">{{ telemetryHint }}</span>
                </div>
            </label>

            <label class="grid grid-cols-[180px_1fr] items-center gap-3 text-sm">
                <span class="text-muted">Моторы</span>
                <USelect v-model="state.selectedMotor" :items="motorOptions" size="sm" class="max-w-xs" />
            </label>

            <!-- ===== Компактные чекбоксы, как в обычном конфигураторе ===== -->
            <div>
                <div class="text-sm font-semibold mb-1">Прочие настройки</div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-0.5">
                    <label
                        v-for="o in otherOptions"
                        :key="o.name"
                        :title="o.name + ezBetaHintText(o)"
                        class="flex items-center gap-1.5 text-xs cursor-pointer py-0.5 select-none"
                    >
                        <input
                            type="checkbox"
                            v-model="state.selectedOther[o.name]"
                            class="w-3.5 h-3.5 rounded border-default accent-primary flex-shrink-0"
                        />
                        <span class="truncate">{{ o.name }}</span>
                        <span v-if="o.introduced" class="text-[10px] text-muted">[new]</span>
                    </label>
                </div>
            </div>

            <div>
                <div class="text-sm font-semibold mb-1">Экспертные настройки</div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-0.5">
                    <label
                        v-for="o in expertOptions"
                        :key="o.name"
                        :title="o.name + ezBetaHintText(o)"
                        class="flex items-center gap-1.5 text-xs cursor-pointer py-0.5 select-none"
                    >
                        <input
                            type="checkbox"
                            v-model="state.selectedExpert[o.name]"
                            class="w-3.5 h-3.5 rounded border-default accent-primary flex-shrink-0"
                        />
                        <span class="truncate">{{ o.name }}</span>
                    </label>
                </div>
            </div>

            <div>
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-sm font-semibold">ENABLE-флаги</span>
                    <UButton size="xs" variant="outline" @click="addCustomFlag">+ ENABLE-флаг</UButton>
                </div>
                <div v-for="(flag, idx) in state.customFlags" :key="idx" class="flex items-center gap-2 mb-1">
                    <UInput v-model="flag.name" placeholder="ENABLE_..." size="sm" class="w-56" />
                    <span class="text-xs">=</span>
                    <UInput v-model="flag.value" placeholder="значение" size="sm" class="w-56" />
                    <UButton size="xs" variant="ghost" icon="i-lucide-x" @click="removeCustomFlag(idx)" />
                </div>
            </div>

            <!-- Превью того, что уйдёт в POST /build -->
            <div>
                <div class="text-sm font-semibold mb-1">Итоговые опции (уйдут в /build)</div>
                <pre
                    class="rounded-md border border-default bg-default p-2 text-xs whitespace-pre-wrap break-all max-h-48 overflow-auto"
                >{{ optionsPreview.error ? "" : optionsPreview.text }}</pre>
                <div v-if="optionsPreview.error" class="mt-1 text-xs text-red-500">
                    {{ optionsPreview.error }}
                </div>
            </div>
        </section>

        <!-- ===== Лог сборки (виден в board-build) ===== -->
        <section
            v-if="state.statusLog.length > 0"
            class="rounded-lg border border-default bg-elevated/30 p-4"
        >
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold">Лог сборки</h3>
                <UButton size="xs" variant="ghost" @click="clearLog">Очистить</UButton>
            </div>
            <pre
                class="text-xs whitespace-pre-wrap max-h-60 overflow-auto font-mono"
            >{{ state.statusLog.join("\n") }}</pre>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import {
    EZBETA_OSD_NAMES,
    EZBETA_RADIO_TELEMETRY_MAP,
    ezBetaGroupOptions,
    ezBetaHintText,
    findEzBetaOption,
    getEzBetaTelemetryMode,
    type EzBetaOption,
} from "@/js/ezbeta/catalog";
import type { EzBetaState } from "./ezbetaState";

interface Props {
    state: EzBetaState;
    onDetectBoard: () => void;
}

const props = defineProps<Props>();
const { state } = props;
const onDetectBoard = props.onDetectBoard;

const versionOptions = computed(() =>
    state.releases.map((r) => ({
        label: `${r.tag_name}${r.prerelease ? " (pre)" : ""}  ${r.published_at?.slice(0, 10) ?? ""}`,
        value: r.tag_name,
    })),
);

const releaseInfo = computed(() => {
    const rel = state.releases.find((r) => r.tag_name === state.selectedVersion);
    return rel ? `Ассетов: ${rel.assets.length}` : "";
});

const boardOptions = computed(() => {
    const filter = state.boardFilter.trim().toLowerCase();
    const unified = new Set(state.targets?.unified ?? []);
    return state.allBoards
        .filter((b) => b.toLowerCase().includes(filter))
        .map((b) => ({
            label: b + (unified.has(b) ? "" : " (legacy)"),
            value: b,
        }));
});

const radioOptions = computed(() => ezBetaGroupOptions("radio").map(toOption));
const motorOptions = computed(() => ezBetaGroupOptions("motor").map(toOption));
const telemetryMode = computed(() => getEzBetaTelemetryMode(props.state.selectedRadio));
const telemetryOptions = computed(() => {
    const allowed = EZBETA_RADIO_TELEMETRY_MAP[props.state.selectedRadio] ?? [];
    const compatible = allowed.length
        ? ezBetaGroupOptions("telemetry").filter((o) => allowed.includes(o.name))
        : ezBetaGroupOptions("telemetry"); // fallback для будущих радио
    return [
        { label: "Не выбрано", value: "" },
        ...compatible.map(toOption),
    ];
});
const osdOptions = computed(() =>
    EZBETA_OSD_NAMES
        .map((n) => findEzBetaOption(n))
        .filter((o): o is EzBetaOption => !!o)
        .map(toOption),
);

const otherOptions = computed(() =>
    ezBetaGroupOptions("other").filter(
        (o) => !(EZBETA_OSD_NAMES as readonly string[]).includes(o.name),
    ),
);
const expertOptions = computed(() => ezBetaGroupOptions("other", true).filter((o) => o.expert));

const telemetrySupported = computed(() => telemetryMode.value === "external");

const telemetryHint = computed(() => {
    switch (telemetryMode.value) {
        case "no-radio":
            return "Сначала выберите протокол приёмника";
        case "builtin":
            return "Телеметрия встроена в протокол приёмника — отдельный слот не нужен";
        case "none":
            return "Выбранный протокол приёмника не поддерживает телеметрию";
        default:
            return "";
    }
});

const optionsPreview = computed(() => {
    try {
        const list = collectEzBetaOptions({
            selectedRadio: state.selectedRadio,
            selectedOsd: state.selectedOsd,
            selectedTelemetry: state.selectedTelemetry,
            selectedMotor: state.selectedMotor,
            selectedOther: state.selectedOther,
            selectedExpert: state.selectedExpert,
            customFlags: state.customFlags,
        });
        return { text: list.join(" ") || "(нет опций)", error: "" };
    } catch (e) {
        return { text: "", error: (e as Error).message };
    }
});

function toOption(o: EzBetaOption) {
    return { label: o.name + ezBetaHintText(o), value: o.name };
}

function addCustomFlag() {
    state.customFlags.push({ name: "ENABLE_OSD_CUSTOM_TEXT", value: "" });
}
function removeCustomFlag(idx: number) {
    state.customFlags.splice(idx, 1);
}
function clearLog() {
    state.statusLog.splice(0, state.statusLog.length);
}

watch(
    [() => props.state.selectedRadio, telemetryMode],
    () => {
        if (telemetryMode.value !== "external") {
            // Встроенная / отсутствующая телеметрия — внешний слот не нужен.
            props.state.selectedTelemetry = "";
            return;
        }
        const allowed = EZBETA_RADIO_TELEMETRY_MAP[props.state.selectedRadio] ?? [];
        if (
            props.state.selectedTelemetry &&
            allowed.length > 0 &&
            !allowed.includes(props.state.selectedTelemetry)
        ) {
            props.state.selectedTelemetry = "";
        }
    },
    { immediate: true },
);
</script>