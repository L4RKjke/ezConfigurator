<template>
    <div class="ezbeta-board-build flex flex-col gap-4">
        <!-- ============== Версия прошивки ============== -->
        <section class="rounded-lg border border-default bg-elevated/30 p-4">
            <h3 class="text-sm font-semibold mb-2">{{ $t("firmwareFlasherVersionSelectionHeader") }}</h3>
            <div class="flex flex-wrap items-center gap-3">
                <USelect
                    v-model="state.selectedVersion"
                    :items="versionOptions"
                    :placeholder="state.loading ? $t('loading') : '—'"
                    :disabled="state.loading || versionOptions.length === 0"
                    class="min-w-[280px]"
                />
                <span v-if="releaseInfo" class="text-xs text-muted">{{ releaseInfo }}</span>
            </div>
        </section>

        <!-- ============== Плата ============== -->
        <section class="rounded-lg border border-default bg-elevated/30 p-4">
            <h3 class="text-sm font-semibold mb-2">{{ $t("firmwareFlasherBoardSelectionHeader") }}</h3>
            <div class="flex flex-wrap items-center gap-3">
                <UInput v-model="state.boardFilter" :placeholder="$t('firmwareFlasherBoardSearchPlaceholder')" />
                <USelect
                    v-model="state.selectedBoard"
                    :items="boardOptions"
                    :placeholder="state.loading ? $t('loading') : '—'"
                    :disabled="state.loading"
                    class="min-w-[280px]"
                />
                <UButton variant="outline" @click="props.onDetectBoard">{{ $t("firmwareFlasherButtonDetectBoard") }}</UButton>
                <span class="text-xs text-muted">Плат: {{ state.allBoards.length }}</span>
            </div>
        </section>

        <!-- ============== Конфигурация сборки ============== -->
        <section class="rounded-lg border border-default bg-elevated/30 p-4 flex flex-col gap-4">
            <h3 class="text-sm font-semibold">{{ $t("firmwareFlasherBuildConfiguration") }}</h3>

            <FormRow label="Протокол приёмника">
                <USelect v-model="state.selectedRadio" :items="radioOptions" />
            </FormRow>

            <FormRow label="Протокол OSD">
                <USelect v-model="state.selectedOsd" :items="osdOptions" />
            </FormRow>

            <FormRow label="Протокол телеметрии">
                <div class="flex items-center gap-3">
                    <USelect
                        v-model="state.selectedTelemetry"
                        :items="telemetryOptions"
                        :disabled="!telemetrySupported"
                        class="min-w-[280px]"
                    />
                    <span v-if="!telemetrySupported" class="text-xs text-muted">
                        {{ telemetryHint }}
                    </span>
                </div>
            </FormRow>

            <FormRow label="Протокол двигателей">
                <USelect v-model="state.selectedMotor" :items="motorOptions" />
            </FormRow>

            <div>
                <div class="text-sm font-semibold mb-2">Прочие настройки</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    <UCheckbox
                        v-for="o in otherOptions"
                        :key="o.name"
                        v-model="state.selectedOther[o.name]"
                        :label="o.name + hint(o)"
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
                        :label="o.name + hint(o)"
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
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { i18n } from "@/js/localization";
import {
    EZBETA_OSD_NAMES,
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

// Простой renderless-helper: подпись + слот
const FormRow = {
    props: { label: { type: String, required: true } },
    template: `<label class="grid grid-cols-[200px_1fr] items-center gap-3 text-sm">
        <span class="text-muted">{{ label }}</span>
        <slot />
    </label>`,
};

defineOptions({ components: { FormRow } });
const props = defineProps<Props>();

const $t = (key: string, params?: Record<string, unknown>) => i18n.getMessage(key, params);

const versionOptions = computed(() =>
    props.state.releases.map((r) => ({
        label: `${r.tag_name}${r.prerelease ? " (pre)" : ""}  ${r.published_at?.slice(0, 10) ?? ""}`,
        value: r.tag_name,
    })),
);

const releaseInfo = computed(() => {
    const rel = props.state.releases.find((r) => r.tag_name === props.state.selectedVersion);
    return rel ? `Ассетов: ${rel.assets.length}` : "";
});

const boardOptions = computed(() => {
    const filter = props.state.boardFilter.trim().toLowerCase();
    const unified = new Set(props.state.targets?.unified ?? []);
    return props.state.allBoards
        .filter((b) => b.toLowerCase().includes(filter))
        .map((b) => ({
            label: b + (unified.has(b) ? "" : " (legacy)"),
            value: b,
        }));
});

const radioOptions = computed(() => ezBetaGroupOptions("radio").map(toOption));
const telemetryOptions = computed(() => [
    { label: "Не выбрано", value: "" },
    ...ezBetaGroupOptions("telemetry").map(toOption),
]);
const motorOptions = computed(() => ezBetaGroupOptions("motor").map(toOption));
const osdOptions = computed(() =>
    EZBETA_OSD_NAMES.map((n) => findEzBetaOption(n))
        .filter((o): o is EzBetaOption => !!o)
        .map(toOption),
);

const otherOptions = computed(() =>
    ezBetaGroupOptions("other").filter((o) => !EZBETA_OSD_NAMES.includes(o.name as never)),
);
const expertOptions = computed(() => ezBetaGroupOptions("other", true).filter((o) => o.expert));

const telemetrySupported = computed(() => {
    const radio = findEzBetaOption(props.state.selectedRadio);
    return !!radio && radio.flags.includes("USE_TELEMETRY");
});

const telemetryHint = computed(() => {
    if (!props.state.selectedRadio) return "Сначала выберите протокол приёмника";
    return "Выбранный протокол приёмника не поддерживает телеметрию";
});

function toOption(o: EzBetaOption) {
    return { label: o.name + ezBetaHintText(o), value: o.name };
}

function hint(o: EzBetaOption): string {
    return ezBetaHintText(o);
}

function addCustomFlag() {
    props.state.customFlags.push({ name: "ENABLE_OSD_CUSTOM_TEXT", value: "" });
}
function removeCustomFlag(idx: number) {
    props.state.customFlags.splice(idx, 1);
}

// При смене radio сбрасываем телеметрию, если она больше не поддерживается
import { watch } from "vue";
watch(telemetrySupported, (ok) => {
    if (!ok) props.state.selectedTelemetry = "";
});
</script>