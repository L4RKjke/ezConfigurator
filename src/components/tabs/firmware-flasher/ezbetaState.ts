import type { InjectionKey } from "vue";
import type { EzBetaRelease, EzBetaTargets } from "@/js/ezbeta/EzBetaApi";

export interface EzBetaState {
    workerUrl: string;
    releases: EzBetaRelease[];
    targets: EzBetaTargets | null;
    allBoards: string[];
    loading: boolean;

    selectedVersion: string;
    selectedBoard: string;
    boardFilter: string;

    selectedRadio: string;
    selectedOsd: string;
    selectedTelemetry: string | null;
    selectedMotor: string;

    selectedOther: Record<string, boolean>;
    selectedExpert: Record<string, boolean>;
    customFlags: { name: string; value: string }[];
}

export const EZBETA_WORKER_URL_DEFAULT = "https://ezbeta.nik-trenikhin.workers.dev";
export const EZBETA_WORKER_URL_STORAGE_KEY = "ezbeta_worker_url";

export function createEzBetaState(): EzBetaState {
    let storedUrl = EZBETA_WORKER_URL_DEFAULT;
    try {
        storedUrl = localStorage.getItem(EZBETA_WORKER_URL_STORAGE_KEY) || EZBETA_WORKER_URL_DEFAULT;
    } catch {
        // localStorage может быть недоступен — используем дефолт
    }

    return {
        workerUrl: storedUrl,
        releases: [],
        targets: null,
        allBoards: [],
        loading: false,
        selectedVersion: "",
        selectedBoard: "",
        boardFilter: "",
        selectedRadio: "CRSF",
        selectedOsd: "OSD_SD",
        selectedTelemetry: null,
        selectedMotor: "DSHOT",
        selectedOther: {},
        selectedExpert: {},
        customFlags: [],
    };
}

export const EZBETA_STATE: InjectionKey<EzBetaState> = Symbol("ezBetaState");