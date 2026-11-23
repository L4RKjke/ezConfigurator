import { ref } from "vue";
import { useConnectionStore } from "@/stores/connection";
import { rulesBusy } from "@/js/vtxRules/session";

const SETTING = "vtx_allow_vtx_changes_while_armed";
const GET_RE = new RegExp(`^${SETTING}\\s*=\\s*(ON|OFF|0|1)\\b`, "i");

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
    /** Значение для тумблера в шаблоне. */
    const allowVtxChangeWhileArmed = ref(false);
    /** Тумблер отличается от прочитанного при подключении → Save доступен. */
    const allowVtxDirty = ref(false);
    /** Значение уже прочитано из FC (до этого тумблер заблокирован). */
    const allowVtxLoaded = ref(false);

    /** Читает текущее значение настройки и синхронизирует тумблер. */
    async function load(): Promise<void> {
        try {
            const lines = await runSettingCommand(`get ${SETTING}`);
            const match = lines.map((l) => l.match(GET_RE)).find(Boolean);
            allowVtxChangeWhileArmed.value = match ? /^(ON|1)$/i.test(match[1]) : false;
            allowVtxDirty.value = false;
            allowVtxLoaded.value = true;
        } catch (e) {
            console.warn(`${SETTING}: чтение не удалось:`, e);
        }
    }

    /** Обработчик тумблера: шлёт set, при ошибке откатывает позицию. */
    function onChange(value: boolean): void {
        if (allowVtxLoaded.value !== true || value === allowVtxChangeWhileArmed.value) return;
        if (rulesBusy.value) return; // не влезаем в чужую CLI-операцию

        allowVtxChangeWhileArmed.value = value;
        allowVtxDirty.value = true;

        runSettingCommand(`set ${SETTING}=${value ? "ON" : "OFF"}`)
            .then((lines) => {
                // подтверждение вида "<setting> set to ON"
                const confirmed = lines.some((l) =>
                    new RegExp(`^${SETTING}\\s+set\\s+to\\s+${value ? "ON" : "OFF"}$`, "i").test(l),
                );
                if (!confirmed) throw new Error(`FC не подтвердил: ${lines.join(" | ").slice(0, 120)}`);
            })
            .catch((e) => {
                console.warn(`${SETTING}: запись не удалась:`, e);
                // команда не прошла (или не подтверждена) — возвращаем тумблер
                allowVtxChangeWhileArmed.value = !value;
                allowVtxDirty.value = false;
            });
    }

    /** Вызывать после успешного save: значение зафиксировано, dirty сбрасывается. */
    function markSaved(): void {
        allowVtxDirty.value = false;
    }

    return { allowVtxChangeWhileArmed, allowVtxDirty, allowVtxLoaded, load, onChange, markSaved };
}
