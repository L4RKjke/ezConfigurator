<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import UiBox from "../elements/UiBox.vue";
import { useConnectionStore } from "@/stores/connection";
import {
    GROUPS, MAX_RULES, calculatePwmRange, emptyRule, kind,
    signature, validPwm, type Group, type Rule,
} from "@/js/vtxRules/model";
import {
    applyRules, installRulesSession, loadRules, RECONNECT_PENDING, recoveryRequired,
    rulesBusy, saveRules, withRulesLock,
} from "@/js/vtxRules/session";

interface Option { value: number; label: string }
interface EditRow extends Rule { group: Group }

const props = defineProps<{
    mainDirty: boolean;
    mainSaving: boolean;
    powers: Option[];
    bands: Option[];
    channelsFor: (band: number) => Option[];
    drainStatus: () => Promise<void>;
}>();

installRulesSession();
const connection = useConnectionStore();

const APPLY_DELAY_MS = 500;
const order: Group[] = ["channel", "power"];
const names = { power: "Мощность", channel: "Каналы" };

const base = ref<Rule[]>([]);
const edits = ref<EditRow[]>([]);
const message = ref("Чтение правил с FC…");
const ready = ref(false);
const waiting = ref(false);
const errorText = ref("");
let applyTimer: ReturnType<typeof setTimeout> | undefined;

const settings = reactive({
    power: { auto: false, common: false, aux: 0 },
    channel: { auto: false, common: false, aux: 0 },
});

const auxOptions = Array.from({ length: 14 }, (_, value) => ({
    value, label: `AUX ${value + 1}`,
}));
const powers = computed(() => props.powers.filter(o => o.value > 0));
const bands = computed(() => props.bands.filter(o => o.value > 0));
const locked = computed(() =>
    rulesBusy.value || props.mainSaving || waiting.value || recoveryRequired.value,
);
const editable = computed(() => ready.value && !locked.value);
const groupRows = (g: Group) => edits.value.filter(r => r.group === g);

// Повторяющиеся значения в пределах одной группы подсвечиваем у всех
// участников повтора, чтобы было видно «пару», а не только первый дубль.
const duplicatePowers = computed(() => {
    const count = new Map<number, number>();
    groupRows("power").forEach(r => count.set(r.power, (count.get(r.power) ?? 0) + 1));
    return new Set([...count].filter(([, n]) => n > 1).map(([power]) => power));
});

const duplicateChannels = computed(() => {
    const count = new Map<string, number>();
    groupRows("channel").forEach(r => {
        const key = `${r.band}:${r.channel}`;
        count.set(key, (count.get(key) ?? 0) + 1);
    });
    return new Set([...count].filter(([, n]) => n > 1).map(([key]) => key));
});

const isDupPower = (r: EditRow) => r.group === "power" && duplicatePowers.value.has(r.power);
const isDupChannel = (r: EditRow) => r.group === "channel" && duplicateChannels.value.has(`${r.band}:${r.channel}`);

const hasDuplicates = computed(() => duplicatePowers.value.size > 0 || duplicateChannels.value.size > 0);


const reserved = computed(() => base.value.filter(r => kind(r) === "reserved"));
const limit = computed(() => Math.min(MAX_RULES, base.value.length - reserved.value.length));
const free = computed(() => Math.max(0, limit.value - edits.value.length));

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function buildTable(): Rule[] {
    const result = base.value.map(r => kind(r) === "reserved" ? { ...r } : emptyRule(r.slot));
    for (const r of edits.value) {
        const { group: _group, ...wire } = r;
        result[r.slot] = wire;
    }
    return result;
}

const dirty = computed(() => ready.value && signature(buildTable()) !== signature(base.value));

// Применение доступно автоматически, если нет блокировок и основная форма не изменена.
const canApply = computed(() =>
    ready.value && !locked.value && !props.mainDirty && dirty.value,
);
// Сохранение на FC доступно по кнопке при тех же условиях, но без требования dirty.
const canSave = computed(() => ready.value && !locked.value && !props.mainDirty);

function pwm(g: Group) {
    if (!settings[g].auto) return;
    const items = groupRows(g);
    items.forEach((r, i) => Object.assign(r, calculatePwmRange(items.length, i)));
}
function setAuto(g: Group, on: boolean) {
    settings[g].auto = on;
    pwm(g);
}
function setCommon(g: Group, on: boolean) {
    settings[g].common = on;
    if (on) applyAux(g, settings[g].aux);
}
function applyAux(g: Group, aux: number) {
    settings[g].aux = aux;
    if (settings[g].common) {
        groupRows(g).forEach(r => { r.aux = aux; });
    }
}

function add(g: Group, recalc = true) {
    if (locked.value || !ready.value || !free.value) return;
    const used = new Set([...reserved.value, ...edits.value].map(r => r.slot));
    const slot = base.value.find(r => !used.has(r.slot))?.slot;
    if (slot === undefined) return;

    const band = g === "channel" ? (bands.value[0]?.value ?? 0) : 0;
    edits.value.push({
        slot, group: g, aux: settings[g].common ? settings[g].aux : 0,
        power: g === "power" ? (powers.value[0]?.value ?? 0) : 0,
        band, channel: g === "channel" ? (props.channelsFor(band)[0]?.value ?? 0) : 0,
        start: 900, end: 2100,
    });
    if (recalc) pwm(g);
}

function remove(r: EditRow, recalc = true) {
    if (locked.value) return;
    edits.value = edits.value.filter(x => x.slot !== r.slot);
    if (recalc) pwm(r.group);
}

function resize(g: Group, n: number | null | undefined) {
    if (locked.value || !ready.value || n == null || !Number.isInteger(n)) return;
    const old = groupRows(g);
    const target = Math.min(old.length + free.value, Math.max(0, n));
    if (target < old.length) old.slice(target).forEach(r => remove(r, false));
    else for (let i = old.length; i < target; i++) add(g, false);
    pwm(g);
}

function changeBand(r: EditRow, band: number) {
    r.band = band;
    const choices = props.channelsFor(band);
    if (!choices.some(o => o.value === r.channel)) r.channel = choices[0]?.value ?? 0;
}

function validate() {
    if (edits.value.length > limit.value) throw new Error("Превышен лимит правил");
    for (const r of edits.value) {
        const fail = (text: string) => { throw new Error(`Слот ${r.slot}: ${text}`); };

        if (!auxOptions.some(o => o.value === r.aux)) fail("выберите доступный AUX");
        if (!validPwm(r.start) || !validPwm(r.end) || r.start >= r.end) {
            fail("границы должны быть от 900 до 2100, шаг 25, начало меньше конца");
        }
        if (r.group === "power" && !powers.value.some(o => o.value === r.power)) {
            fail("выберите уровень из таблицы мощности VTX");
        }
        if (r.group === "channel" && (
            !bands.value.some(o => o.value === r.band) ||
            !props.channelsFor(r.band).some(o => o.value === r.channel)
        )) fail("выберите доступные Band и Channel");
    }
}

// Чтение: при открытии вкладки и после переподключения FC.
async function read() {
    if (rulesBusy.value || props.mainSaving || recoveryRequired.value) return;
    errorText.value = "";
    try {
        const result = await withRulesLock(props.drainStatus, loadRules);
        base.value = result.rows;
        edits.value = result.rows.flatMap(r => {
            const group = kind(r);
            return group === "power" || group === "channel" ? [{ ...r, group }] : [];
        });
        for (const g of GROUPS) {
            settings[g].auto = false;
            settings[g].common = false;
            settings[g].aux = groupRows(g)[0]?.aux ?? 0;
        }
        ready.value = true;
        waiting.value = false;
        message.value = result.message;
    } catch (e) {
        const text = errMsg(e);
        if (text === RECONNECT_PENDING) {
            waiting.value = true;
            message.value = text;
        } else {
            waiting.value = false;
            errorText.value = text;
        }
    }
}

// Применение: отправка изменённых слотов, сверка, без save.
// Бросает ошибку, если сверка не прошла. base обновляется только проверенной таблицей.
async function applyEdits() {
    validate();
    message.value = "Применение правил на FC…";
    const verified = await withRulesLock(props.drainStatus, epoch =>
        applyRules(base.value, buildTable(), epoch),
    );
    base.value = verified;
    message.value = "Правила применены и проверены на FC";
}

// Автоприменение после паузы в редактировании.
async function autoApply() {
    if (!canApply.value) return;
    errorText.value = "";
    try {
        await applyEdits();
    } catch (e) {
        errorText.value = errMsg(e);
    }
}

function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => void autoApply(), APPLY_DELAY_MS);
}

// Сохранение на FC: единственная операция с перезапуском.
async function saveToFc() {
    if (!canSave.value) return;
    clearTimeout(applyTimer);
    errorText.value = "";
    try {
        if (dirty.value) {
            await applyEdits();
            if (dirty.value) {
                throw new Error("Есть неприменённые правки. Нажмите «Сохранить на FC» ещё раз.");
            }
        }

        message.value = "Сохранение на FC…";
        const confirmed = await withRulesLock(props.drainStatus, epoch =>
            saveRules(base.value, epoch),
        );

        waiting.value = true;
        message.value = confirmed
            ? RECONNECT_PENDING
            : "Команда save не подтверждена. Результат будет проверен после переподключения.";
        // Переподключение могло произойти во время save, когда блокировка была занята.
        if (connection.connectionValid) await read();
    } catch (e) {
        errorText.value = errMsg(e);
    }
}

watch(edits, scheduleApply, { deep: true });
watch(() => props.mainDirty, isDirty => { if (!isDirty) scheduleApply(); });
watch(() => connection.connectionValid, valid => {
    if (valid && (waiting.value || !ready.value)) void read();
});

const status = computed(() => {
    if (errorText.value) return errorText.value;
    if (rulesBusy.value || waiting.value) return message.value;
    if (dirty.value && props.mainDirty) {
        return "Сначала сохраните или отмените изменения основной формы VTX.";
    }
    if (dirty.value) return "Изменения будут применены на FC…";
    return message.value;
});

onMounted(() => { void read(); });
</script>

<template>
    <UiBox title="Настройки VTX-правил" class="mt-4 w-full">
        <div class="flex flex-col gap-6">
            <section v-for="g in order" :key="g" class="flex flex-col gap-3 border-t pt-4">
                <h4 class="font-semibold">{{ names[g] }}</h4>

                <fieldset :disabled="!editable" class="flex flex-wrap items-end gap-4">
                    <label>
                        {{ g === "power" ? "Количество мощностей" : "Количество каналов" }}
                        <UInputNumber :model-value="groupRows(g).length" :min="0"
                            :max="groupRows(g).length + free" :disabled="!editable"
                            @update:model-value="resize(g, $event)" />
                    </label>
                    <label class="flex items-center gap-2">
                        <USwitch :model-value="settings[g].auto" :disabled="!editable"
                            @update:model-value="setAuto(g, $event)" />
                        Авто ШИМ
                    </label>
                    <label class="flex items-center gap-2">
                        <USwitch :model-value="settings[g].common" :disabled="!editable"
                            @update:model-value="setCommon(g, $event)" />
                        Один AUX для всех правил
                    </label>
                    <USelect v-if="settings[g].common" :model-value="settings[g].aux"
                        :items="auxOptions" :disabled="!editable"
                        @update:model-value="applyAux(g, Number($event))" />
                </fieldset>

                <div v-for="r in groupRows(g)" :key="r.slot"
                     class="flex flex-wrap items-end gap-2 border-b pb-2">
                    <span>{{ names[r.group] }} · слот {{ r.slot }}</span>

                    <label v-if="!settings[r.group].common">AUX
                        <USelect v-model="r.aux" :items="auxOptions" :disabled="!editable" />
                    </label>
                    <span v-else>AUX {{ r.aux + 1 }}</span>

                    <label v-if="r.group === 'power'">Уровень
                        <USelect v-model="r.power" :items="powers" :disabled="!editable"
                            :style="isDupPower(r) ? { outline: '4px solid #ef4444', outlineOffset: '-2px' } : undefined" />
                    </label>    
                    <template v-else>
                        <label>Band
                            <USelect :model-value="r.band" :items="bands" :disabled="!editable"
                                :style="isDupChannel(r) ? { outline: '4px solid #ef4444', outlineOffset: '-2px' } : undefined"
                                @update:model-value="changeBand(r, Number($event))" />
                        </label>
                        <label>Channel
                            <USelect v-model="r.channel" :items="channelsFor(r.band)"
                                :style="isDupChannel(r) ? { outline: '4px solid #ef4444', outlineOffset: '-2px' } : undefined" />
                        </label>
                    </template>
                    <span v-if="settings[r.group].auto">
                        ШИМ: {{ r.start }}–{{ r.end }} мкс (авто)
                    </span>
                    <template v-else>
                        <label>ШИМ от
                            <UInputNumber v-model="r.start" :min="900" :max="2100"
                                :step="25" :disabled="!editable" />
                        </label>
                        <label>до
                            <UInputNumber v-model="r.end" :min="900" :max="2100"
                                :step="25" :disabled="!editable" />
                        </label>
                    </template>

                    <UButton label="×" variant="ghost" :disabled="!editable"
                        :aria-label="`Удалить правило из слота ${r.slot}`"
                        @click="remove(r)" />
                </div>

                <UButton :label="`+ Добавить правило: ${names[g]}`" class="self-start"
                    :disabled="!editable || free === 0" @click="add(g)" />
            </section>

            <p v-if="ready">
                Правил редактора: {{ edits.length }} из {{ limit }}.
                Слотов на FC: {{ base.length }}.
            </p>
            <p v-if="hasDuplicates" class="text-sm text-red-500">
                Есть правила с одинаковыми {{ duplicatePowers.size > 0 ? "уровнями мощности" :
                duplicateChannels.size > 0 ? "каналами" : "" }}{{ duplicatePowers.size > 0 && duplicateChannels.size > 0 ? " и каналами" : "" }}.
            </p>

            <p v-if="reserved.length">
                Слоты {{ reserved.map(r => r.slot).join(", ") }} содержат другие типы
                записей. Редактор их не изменяет.
            </p>

            <div class="flex flex-wrap items-center gap-3 border-t pt-4">
                <UButton label="Сохранить на FC" :disabled="!canSave" @click="saveToFc" />
                <span class="text-sm">
                    Правки применяются на FC автоматически. Сохранение на FC
                    перезапускает контроллер.
                </span>
            </div>

            <p role="status" aria-live="polite">{{ status }}</p>
        </div>
    </UiBox>
</template>