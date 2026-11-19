export type Group = "power" | "channel";
export type Kind = Group | "empty" | "reserved";

export interface Rule {
    slot: number;
    aux: number;      // В FC: 0 = AUX 1.
    band: number;
    channel: number;
    power: number;    // Индекс уровня, не мВт.
    start: number;
    end: number;
}

export const GROUPS: Group[] = ["power", "channel"];
export const MAX_RULES = 40;

export function emptyRule(slot: number): Rule {
    return { slot, aux: 0, band: 0, channel: 0, power: 0, start: 900, end: 900 };
}

export function validPwm(n: number): boolean {
    return Number.isInteger(n) && n >= 900 && n <= 2100 && (n - 900) % 25 === 0;
}

export function kind(r: Rule): Kind {
    if (
        r.aux === 0 && r.band === 0 && r.channel === 0 &&
        r.power === 0 && r.start === 900 && r.end === 900
    ) return "empty";

    // Не превращаем отключённую, нестандартную или комбинированную
    // запись в свободный слот.
    if (!validPwm(r.start) || !validPwm(r.end) || r.start >= r.end) return "reserved";
    if (r.power > 0 && r.band === 0 && r.channel === 0) return "power";
    if (r.power === 0 && r.band > 0 && r.channel > 0) return "channel";
    return "reserved";
}

export function calculatePwmRange(count: number, index: number) {
    if (
        !Number.isInteger(count) || count < 1 || count > MAX_RULES ||
        !Number.isInteger(index) || index < 0 || index >= count
    ) throw new RangeError("Некорректное количество правил или индекс");

    const edge = (i: number) => 900 + 25 * Math.round(48 * i / count);
    return { start: edge(index), end: edge(index + 1) };
}

export function command(r: Rule): string {
    return `vtx ${r.slot} ${r.aux} ${r.band} ${r.channel} ${r.power} ${r.start} ${r.end}`;
}

export function signature(rows: readonly Rule[]): string {
    return rows.map(command).join("\n");
}

export function parseTable(lines: readonly string[]): Rule[] {
    const rows: Rule[] = [];

    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith("#") || line === "vtx") continue;

        const m = /^vtx\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/.exec(line);
        if (!m) throw new Error(`Неизвестный формат ответа vtx: ${line}`);

        const [slot, aux, band, channel, power, start, end] = m.slice(1).map(Number);
        if (![slot, aux, band, channel, power, start, end].every(Number.isSafeInteger)) {
            throw new Error("FC вернул некорректное число");
        }
        rows.push({ slot, aux, band, channel, power, start, end });
    }

    rows.sort((a, b) => a.slot - b.slot);
    if (!rows.length || rows.some((r, i) => r.slot !== i)) {
        throw new Error("FC не вернул непрерывную таблицу слотов vtx. Запись отключена.");
    }
    return rows;
}
