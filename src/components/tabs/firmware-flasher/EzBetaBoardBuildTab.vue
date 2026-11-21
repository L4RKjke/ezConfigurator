<template>
    <div class="ezbeta-board-build flex flex-col gap-4">
        <!-- ============== Версия прошивки ============== -->
        <section class="rounded-lg border border-default bg-elevated/30 p-4">
            <h3 class="text-sm font-semibold mb-2">Выбор версии прошивки</h3>
            <div class="flex flex-wrap items-center gap-3">
                <USelectMenu
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
                <USelectMenu
                    :key="'board-' + state.boardFilter"
                    v-model="state.selectedBoard"
                    :items="boardOptions"
                    :placeholder="state.loading ? 'Загрузка…' : '—'"
                    :disabled="state.loading"
                    class="min-w-[320px]"
                />
                <UButton variant="outline" @click="onDetectBoard">Определить</UButton>
                <span class="text-xs text-muted">Плат: {{ state.allBoards.length }}</span>
            </div>
        </section>

        <!-- ============== Конфигурация сборки ============== -->
        <section class="rounded-lg border border-default bg-elevated/30 p-4 flex flex-col gap-4">
            <h3 class="text-sm font-semibold">Конфигурация сборки</h3>

            <label class="grid grid-cols-[200px_1fr] items-center gap-3 text-sm">
                <span class="text-muted">Протокол приёмника</span>
                <USelectMenu v-model="state.selectedRadio" :items="radioOptions" />
            </label>

            <label class="grid grid-cols-[200px_1fr] items-center gap-3 text-sm">
                <span class="text-muted">Протокол OSD</span>
                <USelectMenu v-model="state.selectedOsd" :items="osdOptions" />
            </label>

            <label class="grid grid-cols-[200px_1fr] items-center gap-3 text-sm">
                <span class="text-muted">Протокол телеметрии</span>
                <div class="flex items-center gap-3">
                    <USelectMenu
                        v-model="state.selectedTelemetry"
                        :items="telemetryOptions"
                        :disabled="!telemetrySupported"
                        clearable
                        placeholder="Не выбрано"
                        class="min-w-[280px]"
                    />
                    <span v-if="!telemetrySupported" class="text-xs text-muted">{{ telemetryHint }}</span>
                </div>
            </label>

            <label class="grid grid-cols-[200px_1fr] items-center gap-3 text-sm">
                <span class="text-muted">Протокол двигателей</span>
                <USelectMenu v-model="state.selectedMotor" :items="motorOptions" />
            </label>

            <div>
                <div class="text-sm font-semibold mb-2">Прочие настройки</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    <UCheckbox
                        v-for="o in otherOptions"
                        :key="o.name"
                        v-model="state.selectedOther[o.name]"
                        :label="o.name + ezBetaHintText(o)"
                    />
                </div>
            </div>

            <div>
                <div class="text-sm font-semibold mb-2">Экспертные настройки</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    <UCheckbox
                        v-for="o in expertOptions"
                        :key="o.name"
                        v-model="state.selectedExpert[o.name]"
                        :label="o.name + ezBetaHintText(o)"
                    />
                </div>
            </div>

            <div>
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-sm font-semibold">ENABLE-флаги</span>
                    <UButton size="xs" variant="outline" @click="addCustomFlag">+ ENABLE-флаг</UButton>
                </div>
                <div v-for="(flag, idx) in state.customFlags" :key="idx" class="flex items-center gap-2 mb-1">
                    <UInput v-model="flag.name" placeholder="ENABLE_..." class="w-56" />
                    <span>=</span>
                    <UInput v-model="flag.value" placeholder="значение (необязательно)" class="w-56" />
                    <UButton size="xs" variant="ghost" icon="i-lucide-x" @click="removeCustomFlag(idx)" />
                </div>
            </div>

            <!-- Превью того, что уйдёт в POST /build -->
            <div>
                <div class="text-sm font-semibold mb-2">Итоговые опции (уйдут в /build)</div>
                <pre
                    class="rounded-md border border-default bg-default p-3 text-xs whitespace-pre-wrap break-all max-h-48 overflow-auto"
                >{{ optionsPreview.error ? "" : optionsPreview.text }}</pre>
                <div v-if="optionsPreview.error" class="mt-1 text-xs text-red-500">
                    {{ optionsPreview.error }}
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import {
    EZBETA_OSD_NAMES,
    collectEzBetaOptions,
    ezBetaGroupOptions,
    ezBetaHintText,
    findEzBetaOption,
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
    const filtered = state.allBoards.filter((b) => b.toLowerCase().includes(filter));
    // Текущий выбор всегда оставляем в списке, чтобы USelectMenu не терял value
    if (
        state.selectedBoard &&
        !filtered.includes(state.selectedBoard) &&
        state.allBoards.includes(state.selectedBoard)
    ) {
        filtered.push(state.selectedBoard);
    }
    return filtered.map((b) => ({
        label: b + (unified.has(b) ? "" : " (legacy)"),
        value: b,
    }));
});

const radioOptions = computed(() => ezBetaGroupOptions("radio").map(toOption));
const motorOptions = computed(() => ezBetaGroupOptions("motor").map(toOption));
const telemetryOptions = computed(() => ezBetaGroupOptions("telemetry").map(toOption));
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

const telemetrySupported = computed(() => {
    const radio = findEzBetaOption(state.selectedRadio);
    return !!radio && radio.flags.includes("USE_TELEMETRY");
});

const telemetryHint = computed(() => {
    if (!state.selectedRadio) return "Сначала выберите протокол приёмника";
    return "Выбранный протокол приёмника не поддерживает телеметрию";
});

/**
 * Живое превью того, что уйдёт в POST /build {options}.
 * Ровно тот же вызов, что делает handleLoadRemoteFile в FirmwareFlasherTab,
 * поэтому любая ошибка валидации (невалидный ENABLE, дубликат) видна сразу.
 */
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

watch(telemetrySupported, (ok) => {
    if (!ok) state.selectedTelemetry = null;
});
</script>