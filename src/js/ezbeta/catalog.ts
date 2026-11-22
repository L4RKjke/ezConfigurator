// Каталог опций ezBeta-конвейера. Значения (value = name) уходят в CI в POST /build.

export type EzBetaOptionGroup = "radio" | "telemetry" | "motor" | "other";

export interface EzBetaOption {
    name: string;
    group: EzBetaOptionGroup;
    flags: string[];
    default: boolean;
    expert?: boolean;
    introduced?: string;
    requires?: string;
    conflicts?: string[];
}

export const EZBETA_OSD_NAMES = ["OSD_SD", "OSD_HD", "FRSKYOSD"] as const;
export const EZBETA_ENABLE_RE = /^ENABLE_[A-Z0-9_]+(=[A-Za-z0-9_.-]{1,64})?$/;

export const EZBETA_CATALOG: EzBetaOption[] = [
    // ---- radio ----
    { name: "CRSF", group: "radio", flags: ["USE_SERIALRX_CRSF", "USE_TELEMETRY_CRSF", "USE_TELEMETRY", "USE_SERIALRX"], default: true, introduced: "< 2025.12" },
    { name: "FPORT", group: "radio", flags: ["USE_SERIALRX_FPORT", "USE_TELEMETRY_SMARTPORT", "USE_TELEMETRY", "USE_SERIALRX"], default: false },
    { name: "GHOST", group: "radio", flags: ["USE_SERIALRX_GHST", "USE_TELEMETRY_GHST", "USE_TELEMETRY", "USE_SERIALRX"], default: false },
    { name: "IBUS", group: "radio", flags: ["USE_SERIALRX_IBUS", "USE_SERIALRX"], default: false },
    { name: "JETIEXBUS", group: "radio", flags: ["USE_SERIALRX_JETIEXBUS", "USE_TELEMETRY_JETIEXBUS", "USE_TELEMETRY", "USE_SERIALRX"], default: false },
    { name: "MAVLINK", group: "radio", flags: ["USE_SERIALRX_MAVLINK", "USE_TELEMETRY_MAVLINK", "USE_TELEMETRY", "USE_SERIALRX"], default: false, introduced: "2025.12" },
    { name: "PPM", group: "radio", flags: ["USE_RX_PPM", "USE_PPM"], default: false },
    { name: "SBUS", group: "radio", flags: ["USE_SERIALRX_SBUS", "USE_SERIALRX"], default: false },
    { name: "SPEKTRUM", group: "radio", flags: ["USE_SERIALRX_SPEKTRUM", "USE_SERIALRX"], default: false },
    { name: "SRXL2", group: "radio", flags: ["USE_SERIALRX_SRXL2", "USE_SERIALRX"], default: false },
    { name: "SUMD", group: "radio", flags: ["USE_SERIALRX_SUMD", "USE_SERIALRX"], default: false },
    { name: "SUMH", group: "radio", flags: ["USE_SERIALRX_SUMH", "USE_SERIALRX"], default: false },
    { name: "XBUS", group: "radio", flags: ["USE_SERIALRX_XBUS", "USE_SERIALRX"], default: false },

    // ---- telemetry ----
    { name: "FRSKY_HUB", group: "telemetry", flags: ["USE_TELEMETRY_FRSKY_HUB", "USE_TELEMETRY"], default: false },
    { name: "HOTT", group: "telemetry", flags: ["USE_TELEMETRY_HOTT", "USE_TELEMETRY"], default: false },
    { name: "IBUS_EXTENDED", group: "telemetry", flags: ["USE_TELEMETRY_IBUS_EXTENDED", "USE_TELEMETRY", "USE_TELEMETRY_IBUS"], default: false },
    { name: "LTM", group: "telemetry", flags: ["USE_TELEMETRY_LTM", "USE_TELEMETRY"], default: false },
    { name: "MAVLINK_TELEM", group: "telemetry", flags: ["USE_TELEMETRY_MAVLINK", "USE_TELEMETRY"], default: false },
    { name: "SMARTPORT", group: "telemetry", flags: ["USE_TELEMETRY_SMARTPORT", "USE_TELEMETRY"], default: false },
    { name: "SRXL", group: "telemetry", flags: ["USE_TELEMETRY_SRXL", "USE_TELEMETRY", "USE_SERIALRX_SPEKTRUM"], default: false },

    // ---- motor ----
    { name: "BRUSHED", group: "motor", flags: ["USE_BRUSHED"], default: false },
    { name: "DSHOT", group: "motor", flags: ["USE_DSHOT"], default: true },
    { name: "MULTISHOT", group: "motor", flags: ["USE_MULTISHOT"], default: false },
    { name: "ONESHOT", group: "motor", flags: ["USE_ONESHOT"], default: false },
    { name: "PROSHOT", group: "motor", flags: ["USE_PROSHOT"], default: false },
    { name: "PWM", group: "motor", flags: ["USE_PWM_OUTPUT"], default: false },

    // ---- other ----
    { name: "ACRO_TRAINER", group: "other", flags: ["USE_ACRO_TRAINER"], default: true },
    { name: "AKK_SMARTAUDIO", group: "other", flags: ["USE_AKK_SMARTAUDIO"], default: false },
    { name: "ALTITUDE_HOLD", group: "other", flags: ["USE_ALTITUDE_HOLD"], default: false, requires: "GPS или BARO", introduced: "2025.12" },
    { name: "BATTERY_CONTINUE", group: "other", flags: ["USE_BATTERY_CONTINUE"], default: false, introduced: "2026.6" },
    { name: "GPS", group: "other", flags: ["USE_GPS", "USE_GPS_PLUS_CODES"], default: true },
    { name: "LED_STRIP", group: "other", flags: ["USE_LED_STRIP"], default: true },
    { name: "LED_STRIP_64", group: "other", flags: ["USE_LED_STRIP_64", "USE_LED_STRIP"], default: false },
    { name: "MAG", group: "other", flags: ["USE_MAGNETOMETER"], default: false },
    { name: "OPTICALFLOW", group: "other", flags: ["USE_OPTICALFLOW"], default: true, introduced: "2025.12" },
    { name: "OSD_SD", group: "other", flags: ["USE_OSD_SD", "USE_OSD"], default: true, conflicts: ["OSD_HD"] },
    { name: "OSD_HD", group: "other", flags: ["USE_OSD_HD"], default: false, conflicts: ["OSD_SD"] },
    { name: "FRSKYOSD", group: "other", flags: ["USE_FRSKYOSD", "USE_OSD"], default: false },
    { name: "PINIO", group: "other", flags: ["USE_PINIO"], default: true },
    { name: "POSITION_HOLD", group: "other", flags: ["USE_POSITION_HOLD"], default: false, requires: "GPS или OPTICALFLOW", introduced: "2025.12" },
    { name: "RACE_PRO", group: "other", flags: ["USE_RACE_PRO", "USE_RPM_LIMIT", "USE_OSD_QUICK_MENU", "USE_RC_STATS", "USE_SPEC_PREARM_SCREEN"], default: false },
    { name: "RANGEFINDER", group: "other", flags: ["USE_RANGEFINDER"], default: true },
    { name: "SOFTSERIAL", group: "other", flags: ["USE_SOFTSERIAL"], default: false },
    { name: "SERVOS", group: "other", flags: ["USE_SERVOS"], default: false },
    { name: "VTX", group: "other", flags: ["USE_VTX"], default: true },

    // ---- expert (other) ----
    { name: "BLACKBOX", group: "other", expert: true, flags: ["USE_BLACKBOX"], default: false },
    { name: "TRANSPONDER", group: "other", expert: true, flags: ["USE_TRANSPONDER"], default: false },
    { name: "RPM_LIMIT", group: "other", expert: true, flags: ["USE_RPM_LIMIT"], default: false, requires: "DSHOT_TELEMETRY" },
    { name: "RC_STATS", group: "other", expert: true, flags: ["USE_RC_STATS"], default: false, requires: "OSD" },
    { name: "OSD_QUICK_MENU", group: "other", expert: true, flags: ["USE_OSD_QUICK_MENU"], default: false, requires: "OSD" },
    { name: "SPEC_PREARM_SCREEN", group: "other", expert: true, flags: ["USE_SPEC_PREARM_SCREEN"], default: false, requires: "OSD" },
    { name: "GPS_LAP_TIMER", group: "other", expert: true, flags: ["USE_GPS_LAP_TIMER"], default: false, requires: "GPS" },
    { name: "ELRSV4", group: "other", expert: true, flags: ["USE_ELRSV4"], default: false, requires: "плата со встроенным SPI ELRS", introduced: "2025.12" },
    { name: "CRSF_OFFICIAL_SPEC", group: "other", expert: true, flags: ["USE_CRSF_OFFICIAL_SPEC"], default: false, requires: "CRSF", introduced: "2025.12" },
    { name: "TELEMETRY_IBUS", group: "other", expert: true, flags: ["USE_TELEMETRY_IBUS"], default: false },
    { name: "RX_PWM", group: "other", expert: true, flags: ["USE_RX_PWM"], default: false },
];

export const findEzBetaOption = (name: string) => EZBETA_CATALOG.find((o) => o.name === name);

export const ezBetaGroupOptions = (group: EzBetaOptionGroup, includeExpert = false): EzBetaOption[] =>
    EZBETA_CATALOG.filter((o) => o.group === group && (includeExpert || !o.expert));

export const ezBetaHintText = (o: EzBetaOption): string => {
    const parts: string[] = [];
    if (o.introduced) parts.push(`introduced ${o.introduced}`);
    if (o.requires) parts.push(`нужно: ${o.requires}`);
    return parts.length ? ` (${parts.join(", ")})` : "";
};

/** Собирает опции для POST /build: имена каталога + ENABLE_*. Бросает при дубликате / невалидном ENABLE. */
export function collectEzBetaOptions(input: {
    selectedRadio: string;
    selectedOsd: string;
    selectedTelemetry: string | null;
    selectedMotor: string;
    selectedOther: Record<string, boolean>;
    selectedExpert: Record<string, boolean>;
    customFlags: { name: string; value: string }[];
}): string[] {
    const list: string[] = [];
    if (input.selectedRadio) list.push(input.selectedRadio);
    if (input.selectedOsd) list.push(input.selectedOsd);
    if (input.selectedTelemetry) list.push(input.selectedTelemetry);
    if (input.selectedMotor) list.push(input.selectedMotor);
    for (const [name, on] of Object.entries(input.selectedOther)) if (on) list.push(name);
    for (const [name, on] of Object.entries(input.selectedExpert)) if (on) list.push(name);

    for (const { name, value } of input.customFlags) {
        const n = name.trim().toUpperCase();
        const v = value.trim();
        if (!n) continue;
        const flag = v ? `${n}=${v}` : n;
        if (!EZBETA_ENABLE_RE.test(flag)) throw new Error(`Неверный ENABLE-флаг: ${flag}`);
        list.push(flag);
    }

    const seen = new Set<string>();
    for (const item of list) {
        if (seen.has(item)) throw new Error(`Дубликат опции: ${item}`);
        seen.add(item);
    }
    return list;
}

/** Группы, в которых допускается только одна опция (совпадает с build_options.json). */
export const EZBETA_SINGLE_CHOICE_GROUPS = ["radio", "telemetry", "motor"] as const;

/**
 * 8-символьный sha256 от канонизированной строки флагов.
 * Полностью повторяет шаг «Validate and canonicalize flags» из
 * .github/workflows/build-firmware.yml — поэтому хэш совпадает с суффиксом,
 * который CI дописывает к имени ассета: <CONFIG>_<hash>.hex.
 *
 * Требует HTTPS или localhost (crypto.subtle).
 */
export async function computeOptionFlagsHash(options: string[]): Promise<string> {
    const flags: string[] = ["-DCLOUD_BUILD"];
    const regular: string[] = [];

    for (const opt of options) {
        if (opt.startsWith("ENABLE_")) flags.push(`-D${opt}`);
        else regular.push(opt);
    }

    const byName = new Map(EZBETA_CATALOG.map((o) => [o.name, o] as const));
    const singleChoice = new Set<string>(EZBETA_SINGLE_CHOICE_GROUPS);

    // --- дубликаты и неизвестные опции ---
    const seen = new Set<string>();
    for (const opt of regular) {
        if (seen.has(opt)) throw new Error(`Дубликат опции: ${opt}`);
        seen.add(opt);
        if (!byName.has(opt)) throw new Error(`Неизвестная опция: ${opt}`);
    }

    // --- занятые группы одиночного выбора ---
    const chosenGroups = new Set<string>();
    for (const opt of regular) {
        const o = byName.get(opt)!;
        if (singleChoice.has(o.group)) chosenGroups.add(o.group);
    }

    // --- все опции, конфликтующие с выбором пользователя ---
    const excluded = new Set<string>();
    for (const opt of regular) {
        const o = byName.get(opt)!;
        for (const c of o.conflicts ?? []) excluded.add(c);
    }

    // --- дефолты (пропускаем excluded и занятые группы) ---
    for (const o of EZBETA_CATALOG) {
        if (!o.default) continue;
        if (excluded.has(o.name)) continue;
        if (chosenGroups.has(o.group)) continue;
        for (const f of o.flags) flags.push(`-D${f}`);
    }

    // --- флаги явно выбранных опций ---
    for (const opt of regular) {
        const o = byName.get(opt)!;
        for (const f of o.flags) flags.push(`-D${f}`);
    }

    // --- канонизация: sort -u → строка с хвостовым пробелом ---
    // JS sort() по умолчанию эквивалентен bash `LC_ALL=C sort` для ASCII
    const uniq = [...new Set(flags)].sort();
    const canonical = uniq.length > 0 ? uniq.join(" ") + " " : "";

    const hex = await sha256Hex(canonical);
    return hex.slice(0, 8);
}

async function sha256Hex(text: string): Promise<string> {
    if (!globalThis.crypto?.subtle) {
        throw new Error("crypto.subtle недоступен (нужен HTTPS/localhost)");
    }
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}