import { ref, watch } from "vue";
import { useConnectionStore } from "@/stores/connection";
import { rulesBusy } from "@/js/vtxRules/session";

const SETTING = "vtx_allow_vtx_changes_while_armed";
const GET_RE = new RegExp(`^${SETTING}\\s*=\\s*(ON|OFF|0|1)\\b`, "i");

function setConfirmRe(value: boolean): RegExp {
    return new RegExp(`^${SETTING}\\s+set\\s+to\\s+${value ? "ON" : "OFF"}$`, "i");
}

/**
 * Отправляет одну CLI-команду в FC и возвращает строки ответа.
 * Тот же паттерн, что в vtxRules/session.ts: lazy import движка,
 * проверка поддержки MSP-CLI и поиск ошибок в ответе.
 */
async function runSettingCommand(text: string): Promise<string[]> {
    const connection = useConnectionStore();
    if (!connection.connectionValid) {
        throw new Error("Нет соединения с FC");
    }
    const { send, findCliError, isMspCliSupported } = await import("@/composables/useMspCliSession");
    if (!isMspCliSupported()) {
        throw new Error("Этот FC не поддерживает CLI-команды через MSP");
    }
    const lines = await send(text, { timeoutMs: 5000 });
    const trimmed = lines.map((s) => s.trim());
    const error = findCliError(trimmed);
    if (error) throw new Error(error);
    return trimmed;
}

export function useVtxAllowChange() {
    const connection = useConnectionStore();

    /** Значение для тумблера в шаблоне. */
    const allowVtxChangeWhileArmed = ref(false);
    /** FC знает эту настройку (подтверждено `get`). Без этого тумблер скрыт. */
    const allowVtxSupported = ref(false);
    /** Тумблер отличается от значения, сохранённого на FC → Save доступен. */
    const allowVtxDirty = ref(false);
    /** Значение прочитано из FC в текущей сессии. До этого тумблер заблокирован. */
    const allowVtxLoaded = ref(false);
    /**
     * Проверка поддержки выполнена (FC ответил или отверг `get`).
     * Нужна, чтобы штатная прошивка не опрашивалась каждую секунду.
     */
    const allowVtxProbed = ref(false);

    let probing = false;
    let writing = false;
    /** Увеличивается при смене соединения: ответы предыдущей сессии игнорируются. */
    let epoch = 0;

    function resetState(): void {
        epoch++;
        allowVtxSupported.value = false;
        allowVtxLoaded.value = false;
        allowVtxProbed.value = false;
        allowVtxDirty.value = false;
    }

    // При разрыве (в т.ч. после save/reboot) и при новом подключении значение
    // должно быть перечитано из FC, а не взято из старой сессии.
    watch(() => connection.connectionValid, () => resetState());

    /**
     * Читает текущее значение настройки и синхронизирует тумблер.
     * Если FC не знает настройку (штатная/старая прошивка), тумблер скрывается
     * и CLI больше не трогаем до переподключения.
     */
    async function load(): Promise<void> {
        if (probing || allowVtxLoaded.value) return;
        if (allowVtxProbed.value && !allowVtxSupported.value) return;

        probing = true;
        const myEpoch = epoch;
        try {
            const lines = await runSettingCommand(`get ${SETTING}`);
            if (myEpoch !== epoch) return;

            const match = lines.map((l) => l.match(GET_RE)).find(Boolean);
            if (!match) {
                // Ответ не в ожидаемом формате — настройки нет
                allowVtxSupported.value = false;
                return;
            }
            allowVtxChangeWhileArmed.value = /^(ON|1)$/i.test(match[1]);
            allowVtxDirty.value = false;
            allowVtxSupported.value = true;
            allowVtxLoaded.value = true;
        } catch (e) {
            if (myEpoch !== epoch) return;
            // Обычно "Invalid name"/"unknown setting" на штатных прошивках
            allowVtxSupported.value = false;
            allowVtxLoaded.value = false;
            console.warn(`${SETTING}: чтение не удалось, тумблер скрыт:`, e);
        } finally {
            if (myEpoch === epoch) allowVtxProbed.value = true;
            probing = false;
        }
    }
    /** Обработчик тумблера: шлёт set в RAM, при ошибке откатывает позицию. */
    function onChange(value: boolean): void {
        if (!allowVtxSupported.value || !allowVtxLoaded.value) return;
        if (writing || rulesBusy.value) return; // не влезаем в чужую CLI-операцию
        if (value === allowVtxChangeWhileArmed.value) return;

        const prevValue = allowVtxChangeWhileArmed.value;
        const prevDirty = allowVtxDirty.value;
        const myEpoch = epoch;

        writing = true;
        allowVtxChangeWhileArmed.value = value;

        runSettingCommand(`set ${SETTING}=${value ? "ON" : "OFF"}`)
            .then((lines) => {
                const confirmed = lines.some((l) => setConfirmRe(value).test(l));
                if (!confirmed) {
                    throw new Error(`FC не подтвердил: ${lines.join(" | ").slice(0, 120)}`);
                }
                if (myEpoch !== epoch) return;
                // Изменение в RAM. Запись в EEPROM выполняет кнопка Save.
                allowVtxDirty.value = true;
            })
            .catch((e) => {
                if (myEpoch !== epoch) return;
                console.warn(`${SETTING}: запись не удалась:`, e);
                // Ошибка записи не означает, что прошивка не поддерживает настройку.
                // Откатываем только позицию тумблера.
                allowVtxChangeWhileArmed.value = prevValue;
                allowVtxDirty.value = prevDirty;
            })
            .finally(() => {
                writing = false;
            });
    }

    /** Вызывать после успешного save: значение зафиксировано в EEPROM. */
    function markSaved(): void {
        allowVtxDirty.value = false;
    }

    return {
        allowVtxChangeWhileArmed,
        allowVtxSupported,
        allowVtxDirty,
        allowVtxLoaded,
        load,
        onChange,
        markSaved,
    };
}
