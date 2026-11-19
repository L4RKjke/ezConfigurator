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

    if (pending && pending.uid === uid()) {
        if (!pending.disconnected) {
            throw new Error(RECONNECT_PENDING);
        }
        const expected = pending.expected;
        pending = null;
        if (signature(rows) !== expected) {
            throw new Error(
                "После переподключения правила на FC отличаются от сохранённых. " +
                "Проверьте таблицу перед дальнейшими действиями.",
            );
        }
        return { rows, message: "Правила сохранены на FC и проверены после переподключения" };
    }
    return { rows, message: "Правила загружены с FC" };
}

/**
 * Применяет изменения в RAM без save.
 * Отправляет только изменённые слоты, затем перечитывает таблицу и сверяет её.
 * Возвращает проверенную таблицу с FC.
 */
export async function applyRules(base: Rule[], next: Rule[], epoch: number): Promise<Rule[]> {
    if (recoveryRequired.value) throw new Error("Требуется восстановление соединения");
    const board = uid();
    if (pending?.uid === board) {
        throw new Error("Ожидается проверка предыдущего сохранения после переподключения FC");
    }

    const current = await table(epoch);
    if (signature(current) !== signature(base)) {
        throw new Error("Правила на FC изменились. Запись не выполнена; перечитайте таблицу.");
    }
    if (next.length !== base.length || next.some((r, i) => r.slot !== i)) {
        throw new Error("Неверная карта слотов");
    }

    const changed = next.filter((r, i) => command(r) !== command(base[i]));
    const touched: number[] = [];

    try {
        for (const r of changed) {
            // Отмечаем ДО отправки: при тайм-ауте команда могла дойти.
            touched.push(r.slot);
            await cli(command(r), epoch);
        }
        const verified = await table(epoch);
        if (signature(verified) !== signature(next)) {
            throw new Error("FC не принял ожидаемую таблицу");
        }
        return verified;
    } catch (error) {
        // Команды vtx меняют RAM по одной. Откатываем уже отправленные слоты,
        // чтобы не оставить частичное состояние, которое позже может попасть в EEPROM.
        try {
            for (const slot of [...touched].reverse()) {
                await cli(command(base[slot]), epoch);
            }
            if (signature(await table(epoch)) !== signature(base)) {
                throw new Error("Откат не подтверждён");
            }
        } catch {
            recoveryRequired.value = true;
            throw new Error(
                "Применение прервано; состояние RAM не подтверждено. " +
                "Не сохраняйте настройки на FC. Обесточьте FC без save и заново откройте Configurator.",
            );
        }
        throw error;
    }
}

/**
 * Единственная операция с save (перезапуск FC).
 * Вызывается только после успешного применения. Перед save повторно сверяет таблицу.
 * Возвращает true, если FC подтвердил save.
 */
export async function saveRules(expected: Rule[], epoch: number): Promise<boolean> {
    if (recoveryRequired.value) throw new Error("Требуется восстановление соединения");
    const board = uid();
    if (pending?.uid === board) {
        throw new Error("Ожидается проверка предыдущего сохранения после переподключения FC");
    }

    const current = await table(epoch);
    if (signature(current) !== signature(expected)) {
        throw new Error("Правила на FC не совпадают с проверенными. Save не отправлен.");
    }

    const { saveAndReconnect } = await import("@/composables/useMspCliSession");
    assertLink(epoch);
    pending = { uid: board, expected: signature(expected), disconnected: false };
    const result = await saveAndReconnect();
    return result.ok;
}
