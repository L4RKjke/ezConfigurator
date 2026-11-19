import { effectScope, watch, type EffectScope, ref } from "vue";
import { useConnectionStore } from "@/stores/connection";
import { useFlightControllerStore } from "@/stores/fc";

import { command, parseTable, signature, type Rule } from "./model";

export const rulesBusy = ref(false);
export const recoveryRequired = ref(false);

// Живёт дольше компонента: при reboot вкладка может размонтироваться.
interface Pending {
    uid: string;
    expected: string;
    disconnected: boolean;
}
let pending: Pending | null = null;
let generation = 0;

// остальные импорты без изменений

let sessionScope: EffectScope | null = null;

export function installRulesSession() {
    if (sessionScope) return;
    // detached scope: не останавливается при размонтировании вкладки
    sessionScope = effectScope(true);
    sessionScope.run(() => {
        const connection = useConnectionStore();
        watch(() => connection.connectionValid, valid => {
            if (valid) return;
            generation++;
            if (pending) pending.disconnected = true;
        }, { flush: "sync" });
    });
}


function uid(): string {
    const id = useFlightControllerStore().config.uid;
    if (!id?.length || !id.some(n => n !== 0)) {
        throw new Error("Не получен UID платы. Запись правил отключена.");
    }
    return id.join(":");
}

function assertLink(epoch: number) {
    const c = useConnectionStore();
    if (generation !== epoch || !c.connectionValid || c.cliActive) {
        throw new Error("Соединение с FC изменилось");
    }
}

async function cli(text: string, epoch: number) {
    const { send, findCliError } = await import("@/composables/useMspCliSession");
    assertLink(epoch);
    const lines = await send(text, { timeoutMs: 5000 });
    assertLink(epoch);
    const error = findCliError(lines.map(s => s.trim()));
    if (error) throw new Error(error);
    return lines;
}

async function table(epoch: number) {
    return parseTable(await cli("vtx", epoch));
}

export async function withRulesLock<T>(
    drainStatus: () => Promise<void>,
    operation: (epoch: number) => Promise<T>,
): Promise<T> {
    if (rulesBusy.value) throw new Error("Уже выполняется операция с правилами");
    
    const epoch = generation;
    rulesBusy.value = true;
    try {
        const { isMspCliSupported } = await import("@/composables/useMspCliSession");
            if (!isMspCliSupported()) {
                throw new Error("Этот FC не поддерживает CLI-команды через MSP");
            }
        await drainStatus();
        assertLink(epoch);
        return await operation(epoch);
    } finally {
        rulesBusy.value = false;
    }
}

export const RECONNECT_PENDING = "Сохранение отправлено. Ожидание переподключения FC.";

export async function loadRules(epoch: number) {
    const rows = await table(epoch);
    let message = "Правила загружены с FC";

    if (pending && pending.uid === uid()) {
        if (!pending.disconnected) {
            throw new Error(RECONNECT_PENDING);
        }
        // остальной код без изменений
    }
    return { rows, message };
}


export async function writeRules(base: Rule[], next: Rule[], epoch: number) {
    if (recoveryRequired.value) throw new Error("Требуется восстановление соединения");
    const board = uid();
    if (pending?.uid === board) throw new Error("Ещё не проверена предыдущая запись");

    const current = await table(epoch);
    if (signature(current) !== signature(base)) {
        throw new Error("Правила на FC изменились. Запись не выполнена; перечитайте таблицу.");
    }
    if (next.length !== base.length || next.some((r, i) => r.slot !== i)) {
        throw new Error("Неверная карта слотов");
    }

    const changed = next.filter((r, i) => command(r) !== command(base[i]));
    if (!changed.length) return;
    const touched: number[] = [];

    try {
        for (const r of changed) {
            // Отмечаем ДО отправки: при тайм-ауте команда могла дойти.
            touched.push(r.slot);
            await cli(command(r), epoch);
        }
        if (signature(await table(epoch)) !== signature(next)) {
            throw new Error("FC не принял ожидаемую таблицу");
        }
    } catch (error) {
        // Команды vtx меняют RAM по одной. Если не откатить изменения,
        // их способно позднее сохранить обычное сохранение EEPROM.
        try {
            for (const slot of touched.reverse()) {
                await cli(command(base[slot]), epoch);
            }
            if (signature(await table(epoch)) !== signature(base)) {
                throw new Error("Откат не подтверждён");
            }
        } catch {
            recoveryRequired.value = true;
            throw new Error(
                "Запись прервана; состояние RAM не подтверждено. " +
                "Не сохраняйте настройки. Обесточьте FC без save и заново откройте Configurator.",
            );
        }
        throw error;
    }
    const { saveAndReconnect } = await import("@/composables/useMspCliSession");
    assertLink(epoch);
    pending = { uid: board, expected: signature(next), disconnected: false };
    const result = await saveAndReconnect();
    if (!result.ok) {
        throw new Error("Команда save не подтверждена. Результат будет проверен после переподключения.");
    }
}
