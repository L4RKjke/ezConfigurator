<template>
    <BaseTab tab-name="firmware_flasher">
        <div class="content_wrapper">
            <div class="tab_title">{{ $t("tabFirmwareFlasher") }}</div>
            <WikiButton docUrl="firmware_flasher" />

            <SubtabNav :items="subtabItems" v-model="activeFlasherStep" />

            <div class="flasher-tab-area">
                <!-- === EZBETA === -->
                <EzBetaBoardBuildTab
                    v-if="activeFlasherStep === 'board-build'"
                    :state="ezBetaState"
                    :on-detect-board="handleDetectBoard"
                />
                <!-- /=== EZBETA === -->

                <FlasherFlashTab
                    v-if="activeFlasherStep === 'flash'"
                    :cloud-build="cloudBuildStub"
                    :on-save-firmware="saveFirmware"
                    :flash-ring-color="flashRingColor"
                    :on-no-reboot-change="handleNoRebootChange"
                    :on-erase-chip-change="handleEraseChipChange"
                    :on-flash-manual-baud-change="handleFlashManualBaudChange"
                    :on-flash-manual-baud-rate-change="handleFlashManualBaudRateChange"
                    :on-restore-backup="handleRestoreBackup"
                    :firmware-accepts-config="firmwareAcceptsConfig"
                />
            </div>
        </div>

        <div class="content_toolbar toolbar_fixed_bottom">
            <UFieldGroup orientation="horizontal">
                <UButton
                    :disabled="state.flashButtonDisabled || activeFlasherStep !== 'flash'"
                    color="success"
                    :loading="state.flashingInProgress"
                    @click="handleFlashFirmware"
                >
                    {{ $t("firmwareFlasherFlashFirmware") }}
                </UButton>
                <UDropdownMenu v-slot="{ open }" :items="flashActionMenuItems" :content="{ align: 'end', side: 'top' }">
                    <UButton
                        color="success"
                        :variant="state.flashButtonDisabled || activeFlasherStep !== 'flash' ? 'soft' : 'solid'"
                        :class="{
                            'bg-success/30 hover:bg-success/40 ring ring-inset ring-success/40':
                                !state.flashingInProgress &&
                                (state.flashButtonDisabled || activeFlasherStep !== 'flash'),
                        }"
                        :icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                        :aria-label="$t('firmwareFlasherFlashFirmwareOptions')"
                        :disabled="state.flashingInProgress"
                        square
                    />
                </UDropdownMenu>
            </UFieldGroup>
            <UFieldGroup orientation="horizontal">
                <UButton
                    :label="$t('firmwareFlasherButtonLoadOnline')"
                    :disabled="state.loadRemoteButtonDisabled || state.flashingInProgress"
                    :loading="loadingRemote"
                    @click="handleLoadRemoteFile"
                />
                <UDropdownMenu
                    v-slot="{ open }"
                    :items="loadFirmwareMenuItems"
                    :content="{ align: 'end', side: 'top' }"
                >
                    <UButton
                        :icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                        :variant="state.loadRemoteButtonDisabled ? 'soft' : 'solid'"
                        :class="{
                            'ring ring-inset ring-primary/40':
                                state.loadRemoteButtonDisabled && !state.flashingInProgress,
                        }"
                        :aria-label="$t('firmwareFlasherLoadFirmwareOptions')"
                        :disabled="state.flashingInProgress"
                        square
                    />
                </UDropdownMenu>
            </UFieldGroup>
        </div>

        <!-- ============ Модалки без изменений ============ -->
        <UModal
            v-model:open="unstableFirmwareOpen"
            class="dialog-unstable-firmware"
            :title="$t('warningTitle')"
            :close="false"
            :dismissible="false"
        >
            <template #body>
                <div v-html="$t('unstableFirmwareAcknowledgementDialog')"></div>
                <div class="flex items-center gap-2 mt-3">
                    <USwitch
                        v-model="state.dialogUnstableFirmwareAcknowledgementCheckbox"
                        :aria-label="$t('developmentFirmwareAcknowledgement')"
                    />
                    <span v-html="$t('developmentFirmwareAcknowledgement')"></span>
                </div>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton :label="$t('cancel')" variant="outline" @click="handleUnstableFirmwareCancel" />
                    <UButton
                        :label="$t('unstableFirmwareAcknowledgementFlash')"
                        :disabled="!state.dialogUnstableFirmwareAcknowledgementCheckbox"
                        @click="handleUnstableFirmwareFlash"
                    />
                </div>
            </template>
        </UModal>

        <UModal v-model:open="verifyBoardOpen" :close="false" :dismissible="false">
            <template #body>
                <div v-html="verifyBoardContentHtml"></div>
            </template>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton
                        :label="$t('firmwareFlasherButtonAbort')"
                        variant="outline"
                        @click="handleVerifyBoardAbort"
                    />
                    <UButton :label="$t('firmwareFlasherButtonContinue')" @click="handleVerifyBoardContinue" />
                </div>
            </template>
        </UModal>
    </BaseTab>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, provide, reactive, ref, inject, nextTick, watch } from "vue";
import BaseTab from "./BaseTab.vue";
import WikiButton from "../elements/WikiButton.vue";
import { i18n } from "../../js/localization";
import { useDialog } from "@/composables/useDialog";
import { useFirmwareFlashing, cleanUnifiedConfigFile } from "../../composables/useFirmwareFlashing";
import { get as getConfig, set as setConfig } from "../../js/ConfigStorage";
import { get as getStorage, set as setStorage } from "../../js/SessionStorage";
import { hasCustomDefaultsArea } from "../../js/ConfigInserter";
import { getTracking } from "../../js/Analytics";
import DeviceHandler from "../../js/device_handler";
import { gui_log } from "../../js/gui_log";
import FileSystem from "../../js/FileSystem";
import AutoBackup, { getLastBackupData, resetLastBackupData } from "../../js/utils/AutoBackup";
import AutoRestore from "../../js/utils/AutoRestore";
import { EventBus } from "../eventBus";
import STM32 from "../../js/protocols/webstm32";
import SponsorTile from "../sponsor/SponsorTile.vue";
import FlasherFlashTab from "./firmware-flasher/FlasherFlashTab.vue";
import EzBetaBoardBuildTab from "./firmware-flasher/EzBetaBoardBuildTab.vue";
import {
    FLASHER_STATE,
    createFlasherState,
    type BuildOption,
    type TargetDetail,
} from "./firmware-flasher/flasherState";
import {
    EZBETA_STATE,
    EZBETA_WORKER_URL_STORAGE_KEY,
    createEzBetaState,
    type EzBetaState,
} from "./firmware-flasher/ezbetaState";
import { EzBetaApi } from "../../js/ezbeta/EzBetaApi";
import { EZBETA_CATALOG, collectEzBetaOptions, findEzBetaOption, EZBETA_OSD_NAMES } from "../../js/ezbeta/catalog";
import type { FirmwareData, FlashMessageTypes, ShowDialogVerifyBoard } from "../../composables/useFirmwareFlashing";
import type { DropdownMenuItem } from "@nuxt/ui";
import SubtabNav from "../elements/SubtabNav.vue";
import { useConnectionStore } from "../../stores/connection";
import { useNavigationStore } from "../../stores/navigation";
import { useFlightControllerStore } from "@/stores/fc";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface PickedFile {
    name: string;
}

const activeFlasherStep = ref("board-build");

export default defineComponent({
    name: "FirmwareFlasherTab",
    components: { BaseTab, WikiButton, SponsorTile, FlasherFlashTab, EzBetaBoardBuildTab, SubtabNav },
    setup() {
        const connectionStore = useConnectionStore();
        const navigationStore = useNavigationStore();
        const $t = inject<Translate>("$t", (key, params) => i18n.getMessage(key, params));
        const dialog = useDialog();
        const fcStore = useFlightControllerStore();
        const logHead = "[FIRMWARE_FLASHER]";

        // --- штатное состояние прошивалки (flash-шаг) ---
        const state = createFlasherState();
        provide(FLASHER_STATE, state);

        // --- === EZBETA === состояние конвейера ---
        const ezBetaState = reactive<EzBetaState>(createEzBetaState());
        provide(EZBETA_STATE, ezBetaState);
        const ezBetaApi = new EzBetaApi(ezBetaState.workerUrl);
        const loadingRemote = ref(false);

        // Заглушка вместо штатного useCloudBuild: у FlasherFlashTab этот prop
        // используется только для отображения статуса облачной сборки.
        const cloudBuildStub = {
            state: reactive({ cloudBuildKey: undefined as string | undefined }),
            clearCommitInfo: () => {},
            resetCloudBuildState: () => {},
            cleanup: () => {},
            requestCloudBuild: async () => null,
        };

        // Инициализируем чекбоксы значениями default из каталога.
        // OSD_SD / OSD_HD / FRSKYOSD НЕ кладём в selectedOther — они управляются
        // через selectedOsd (одиночный USelect). Иначе OSD_SD/OSD_HD попадёт в
        // список дважды (из селекта + из чекбокса) → ошибка «Дубликат опции».
        const osdNameSet = new Set<string>(EZBETA_OSD_NAMES as readonly string[]);
        for (const o of EZBETA_CATALOG) {
            if (o.group !== "other") continue;
            if (osdNameSet.has(o.name)) continue;
            if (o.expert) ezBetaState.selectedExpert[o.name] = !!o.default;
            else ezBetaState.selectedOther[o.name] = !!o.default;
        }

        const sponsorTile = ref<InstanceType<typeof SponsorTile> | null>(null);
        const verifyBoardOpen = ref(false);
        const verifyBoardContentHtml = ref("");
        const verifyBoardOnAcceptCallback = ref<(() => void) | null>(null);
        const verifyBoardOnAbortCallback = ref<(() => void) | null>(null);
        const unstableFirmwareOpen = ref(false);
        const unstableFirmwareAcknowledgementCallback = ref<(() => void) | null>(null);

        const FLASH_MESSAGE_TYPES: FlashMessageTypes = {
            NEUTRAL: "NEUTRAL",
            VALID: "VALID",
            INVALID: "INVALID",
            ACTION: "ACTION",
            ERASING: "ERASING",
            FLASHING: "FLASHING",
            VERIFYING: "VERIFYING",
        };

        const getExtension = (key: string | null | undefined) => {
            if (!key) return undefined;
            const lower = key.toLowerCase();
            return lower.split("?")[0].split("#")[0].split(".").pop();
        };

        // ==================== колбэки состояния ====================
        const enableFlashButton = (enabled: boolean) => {
            state.flashButtonDisabled = !enabled;
        };
        const enableLoadRemoteFileButton = (enabled: boolean) => {
            state.loadRemoteButtonDisabled = !enabled;
            if (enabled) sponsorTile.value?.resume();
        };
        const enableLoadFileButton = (enabled: boolean) => {
            state.loadFileButtonDisabled = !enabled;
            if (enabled) sponsorTile.value?.resume();
        };
        const enableDfuExitButton = (enabled: boolean | undefined) => {
            state.dfuExitButtonDisabled = !enabled;
        };
        const updateDfuExitButtonState = () => {
            const selectedDevice = DeviceHandler.devicePicker?.selectedDevice || "";
            const hasDfuPortSelected = typeof selectedDevice === "string" && selectedDevice.startsWith("usb");
            enableDfuExitButton(DeviceHandler.dfuAvailable || hasDfuPortSelected);
        };

        const flashingMessage = (message: string | null, type: string) => {
            switch (type) {
                case FLASH_MESSAGE_TYPES.VALID: state.progressLabelClass = "valid"; break;
                case FLASH_MESSAGE_TYPES.INVALID: state.progressLabelClass = "invalid"; break;
                case FLASH_MESSAGE_TYPES.ACTION: state.progressLabelClass = "actionRequired"; break;
                case FLASH_MESSAGE_TYPES.ERASING: state.progressLabelClass = "erasing"; break;
                case FLASH_MESSAGE_TYPES.FLASHING: state.progressLabelClass = "flashing"; break;
                case FLASH_MESSAGE_TYPES.VERIFYING: state.progressLabelClass = "verifying"; break;
                default: state.progressLabelClass = ""; break;
            }
            if (message !== null) state.progressLabelText = message;
            if (
                (state.flashingInProgress || state.flashProgressValue > 0) &&
                (type === FLASH_MESSAGE_TYPES.VALID || type === FLASH_MESSAGE_TYPES.INVALID)
            ) {
                state.lastFlashResultText = state.progressLabelText;
                state.lastFlashResultClass = state.progressLabelClass;
            }
        };

        const flashProgress = (value: number) => {
            const n = Number(value);
            if (!Number.isFinite(n)) return;
            state.flashProgressValue = Math.max(0, Math.min(100, n));
            if (n >= 100) {
                state.flashingInProgress = false;
                connectionStore.flashingInProgress = false;
            }
        };

        const resetFlashingState = () => {
            state.flashProgressValue = 0;
            state.flashingInProgress = false;
            connectionStore.flashingInProgress = false;
            enableFlashButton(
                !!firmwareFlashing.getParsedHex() ||
                    !!firmwareFlashing.getUf2Binary() ||
                    !!firmwareFlashing.getEspBinary(),
            );
            updateDfuExitButtonState();
            enableLoadRemoteFileButton(true);
            enableLoadFileButton(true);
            if (firmwareFlashing.getParsedHex() || firmwareFlashing.getUf2Binary() || firmwareFlashing.getEspBinary()) {
                if (state.preFlashingMessage && state.preFlashingMessageType) {
                    flashingMessage(state.preFlashingMessage, state.preFlashingMessageType);
                }
            } else {
                flashingMessage($t("firmwareFlasherFirmwareNotLoaded"), FLASH_MESSAGE_TYPES.NEUTRAL);
            }
            sponsorTile.value?.resume();
        };

        const preservePreFlashingState = () => {
            state.preFlashingMessage = state.progressLabelText;
            if (state.progressLabelClass === "valid") state.preFlashingMessageType = FLASH_MESSAGE_TYPES.VALID;
            else if (state.progressLabelClass === "invalid") state.preFlashingMessageType = FLASH_MESSAGE_TYPES.INVALID;
            else if (state.progressLabelClass === "actionRequired") state.preFlashingMessageType = FLASH_MESSAGE_TYPES.ACTION;
            else state.preFlashingMessageType = FLASH_MESSAGE_TYPES.NEUTRAL;
        };

        const clearBoardConfig = () => {
            state.config = {};
            state.isConfigLocal = false;
            state.configFilename = null;
        };
        const setBoardConfig = (config: string[], filename?: string) => {
            state.config = config.join("\n");
            const hasFilename = filename !== undefined;
            state.isConfigLocal = hasFilename;
            state.configFilename = hasFilename ? filename : null;
        };
        const clearLoadedFirmwareInfo = () => {
            state.firmwareLoadedName = "";
            state.firmwareLoadedSize = "";
            state.firmwareLoadedIsLocal = false;
        };
        const clearBufferedFirmware = () => {
            clearBoardConfig();
            firmwareFlashing.clearFirmwareState();
            state.firmware_type = undefined;
            state.localFirmwareLoaded = false;
            state.filename = null;
            clearLoadedFirmwareInfo();
        };

        const showLoadedFirmware = (filename: string, bytes: number) => {
            state.filename = filename;
            state.firmwareLoadedName = filename;
            state.lastFlashResultText = "";
            state.lastFlashResultClass = "";
            state.firmwareLoadedSize = $t("firmwareFlasherFirmwareSize", { bytes });
            state.firmwareLoadedIsLocal = state.localFirmwareLoaded;
            flashingMessage(
                state.localFirmwareLoaded
                    ? $t("firmwareFlasherFirmwareLocalLoaded", { filename, bytes })
                    : $t("firmwareFlasherFirmwareOnlineLoaded", { filename, bytes }),
                FLASH_MESSAGE_TYPES.NEUTRAL,
            );
            enableFlashButton(true);
            activeFlasherStep.value = "flash";

            const tracking = getTracking();
            tracking?.sendEvent(tracking.EVENT_CATEGORIES.FLASHING, "FirmwareLoaded", {
                firmwareSize: bytes,
                firmwareName: filename,
                firmwareSource: state.localFirmwareLoaded ? "file" : "http",
                selectedTarget: state.targetDetail?.target,
                selectedRelease: state.targetDetail?.release,
            });
        };

        const cleanUnifiedConfigFileWrapper = (input: string) =>
            cleanUnifiedConfigFile(input, { flashingMessage, gui_log, t: $t, flashMessageTypes: FLASH_MESSAGE_TYPES });

        const findTargetDescriptor = (targetName: string) => {
            if (!ezBetaState.targets) return undefined;
            const unified = ezBetaState.targets.unified;
            const legacy = ezBetaState.targets.legacy;
            if (unified.includes(targetName)) return { target: targetName, group: "supported" as const };
            if (legacy.includes(targetName)) return { target: targetName, group: "legacy" as const };
            return undefined;
        };

        const getSupportUrlForTarget = (targetName: string | null | undefined) => {
            const baseBoardUrl = "https://betaflight.com/docs/wiki/boards/current";
            const fallbackUrl = "https://betaflight.com/docs/wiki/boards/archive/Missing";
            if (!targetName || targetName === "0") return fallbackUrl;
            return `${baseBoardUrl}/${encodeURIComponent(targetName)}`;
        };

        const updateTargetQualification = (targetName: string | null | undefined) => {
            if (!targetName || targetName === "0") {
                state.targetQualificationVisible = false;
                return;
            }
            const descriptorGroup = findTargetDescriptor(targetName)?.group;
            if (descriptorGroup === "supported") {
                state.targetQualificationText = $t("firmwareFlasherOptionLabelVerifiedPartner");
                state.targetQualification = true;
            } else if (descriptorGroup === "legacy") {
                state.targetQualificationText = $t("firmwareFlasherOptionLabelLegacyTarget");
                state.targetQualification = false;
            } else {
                state.targetQualificationText = $t("firmwareFlasherOptionLabelNotQualified");
                state.targetQualification = false;
            }
            state.targetQualificationVisible = true;
        };

        const showReleaseNotes = (summary: TargetDetail | null | undefined) => {
            if (!summary) return;
            state.manufacturerInfoVisible = false;
            state.targetSpanText = summary.target || "";
            state.releaseNameText = summary.release || "";
            state.releaseNameLink = summary.releaseUrl || "#";
            state.releaseDateText = summary.date || "";
            state.targetMCUText = summary.mcu || "";
            state.cloudTargetInfoVisible = !!summary.cloudBuild;
        };

        const updateTargetDetailFromEzBeta = () => {
            const version = ezBetaState.selectedVersion;
            const board = ezBetaState.selectedBoard;
            if (!version || !board) {
                state.targetDetail = null;
                state.developmentFirmwareLoaded = false;
                enableLoadRemoteFileButton(false);
                return;
            }
            const rel = ezBetaState.releases.find((r) => r.tag_name === version);
            const detail: TargetDetail = {
                target: board,
                release: version,
                releaseUrl: `https://github.com/L4RKjke/ezBeta/releases/tag/${encodeURIComponent(version)}`,
                date: rel?.published_at?.slice(0, 10) || "",
                manufacturer: "",
                mcu: "",
                releaseType: rel?.prerelease ? "Unstable" : "Stable",
                cloudBuild: false,
            } as TargetDetail;
            state.targetDetail = detail;
            state.developmentFirmwareLoaded = !!rel?.prerelease;
            enableLoadRemoteFileButton(true);
            enableLoadFileButton(true);
            updateTargetQualification(board);
            state.targetSupportUrl = getSupportUrlForTarget(board);
            showReleaseNotes(detail);
        };

        // ==================== загрузка ezBeta данных ====================
        const loadEzBetaData = async () => {
            ezBetaState.loading = true;
            try {
                const [releases, targets] = await Promise.all([
                    ezBetaApi.listReleases(50),
                    ezBetaApi.listTargets(),
                ]);

                // Фильтруем релизы с префиксом ezb- (ТЗ п.1).
                const ezbReleases = releases.filter((r) => r.tag_name.startsWith("ezb-"));
                ezBetaState.releases = ezbReleases.length > 0 ? ezbReleases : releases;
                ezBetaState.targets = targets;
                ezBetaState.allBoards = [...new Set([...targets.unified, ...targets.legacy])].sort();

                // Восстанавливаем сохранённый выбор (если валиден)
                const savedVersion = getConfig<string | undefined>("ezbeta_version").ezbeta_version;
                if (savedVersion && ezBetaState.releases.some((r) => r.tag_name === savedVersion)) {
                    ezBetaState.selectedVersion = savedVersion;
                } else if (!ezBetaState.selectedVersion && ezBetaState.releases.length > 0) {
                    ezBetaState.selectedVersion = ezBetaState.releases[0].tag_name;
                }
                const savedBoard = getConfig<string | undefined>("ezbeta_board").ezbeta_board;
                if (savedBoard && ezBetaState.allBoards.includes(savedBoard)) {
                    ezBetaState.selectedBoard = savedBoard;
                }

                (targets.warnings || []).forEach((w) => gui_log(`[EZBETA] WARN: ${w}`));
                updateTargetDetailFromEzBeta();
            } catch (e) {
                gui_log(`[EZBETA] Ошибка загрузки: ${(e as Error).message}`);
                flashingMessage($t("firmwareFlasherFailedToLoadOnlineFirmware"), FLASH_MESSAGE_TYPES.INVALID);
            } finally {
                ezBetaState.loading = false;
            }
        };

        // ==================== обработчики борды/версии ====================
        const handleDetectBoard = () => {
            const detected = fcStore.config?.board_name;
            if (!detected) {
                gui_log("Плата не определена: подключитесь к контроллеру.");
                return;
            }
            if (ezBetaState.allBoards.includes(detected)) {
                ezBetaState.selectedBoard = detected;
                setConfig({ ezbeta_board: detected });
                updateTargetDetailFromEzBeta();
            } else {
                gui_log(`[EZBETA] Плата ${detected} отсутствует в списке ezBeta.`);
            }
        };

        // при выборе версии/борда обновляем targetDetail и сохраняем
        watch(
            () => ezBetaState.selectedVersion,
            (v) => {
                if (v) setConfig({ ezbeta_version: v });
                updateTargetDetailFromEzBeta();
            },
        );
        watch(
            () => ezBetaState.selectedBoard,
            (v) => {
                if (v) setConfig({ ezbeta_board: v });
                updateTargetDetailFromEzBeta();
            },
        );

        // ==================== «Загрузить online» ====================
        const enforceOSDSelection = async () => {
            // Пропускаем, если OSD уже выбран.
            if (ezBetaState.selectedOsd) return true;
            // 4.3.x не поддерживает OSD-флаг — не мешаем.
            const version = ezBetaState.selectedVersion;
            if (typeof version === "string" && version.startsWith("4.3.")) return true;
            return dialog.showYesNo(
                $t("firmwareFlasherOSDProtocolNotSelected"),
                $t("firmwareFlasherOSDProtocolNotSelectedDescription"),
                {
                    yesText: $t("firmwareFlasherOSDProtocolNotSelectedContinue"),
                    noText: $t("firmwareFlasherOSDProtocolSelect"),
                },
            );
        };

        const processFile = async (data: FirmwareData, key: string) => {
            const ext = getExtension(key);
            const result = await firmwareFlashing.processFirmware(data, ext, {
                enableFlashButton,
                enableLoadRemoteFileButton,
                showLoadedFirmware,
                key,
            });
            if (result) state.firmware_type = result.firmwareType;
            enableLoadRemoteFileButton(true);
            return !!result;
        };

        const handleLoadRemoteFile = async () => {
            console.log("[EZBETA] handleLoadRemoteFile click, loadRemoteButtonDisabled =", state.loadRemoteButtonDisabled);
            if (state.loadRemoteButtonDisabled) {
                gui_log("[EZBETA] Кнопка 'Load online' заблокирована. Выберите версию и плату.");
                return;
            }

            const version = ezBetaState.selectedVersion;
            const config = ezBetaState.selectedBoard;
            if (!version || !config) {
                gui_log("[EZBETA] Не выбраны версия или плата.");
                return;
            }
            gui_log(`[EZBETA] Load online: version=${version}, config=${config}`);

            const shouldContinue = await enforceOSDSelection();
            if (!shouldContinue) return;

            enableFlashButton(false);
            enableLoadRemoteFileButton(false);
            loadingRemote.value = true;

            state.localFirmwareLoaded = false;
            state.developmentFirmwareLoaded = !!ezBetaState.releases.find((r) => r.tag_name === version)?.prerelease;
            clearLoadedFirmwareInfo();

            let options: string[];
            try {
                options = collectEzBetaOptions({
                    selectedRadio: ezBetaState.selectedRadio,
                    selectedOsd: ezBetaState.selectedOsd,
                    selectedTelemetry: ezBetaState.selectedTelemetry,
                    selectedMotor: ezBetaState.selectedMotor,
                    selectedOther: ezBetaState.selectedOther,
                    selectedExpert: ezBetaState.selectedExpert,
                    customFlags: ezBetaState.customFlags,
                });
            } catch (e) {
                console.error(`${logHead} collectOptions:`, e);
                flashingMessage((e as Error).message, FLASH_MESSAGE_TYPES.INVALID);
                enableLoadRemoteFileButton(true);
                loadingRemote.value = false;
                return;
            }
            gui_log(`[EZBETA] options: ${options.join(" ") || "(empty)"}`);

            activeFlasherStep.value = "flash";
            await nextTick();
            flashingMessage($t("firmwareFlasherButtonDownloading"), FLASH_MESSAGE_TYPES.NEUTRAL);

            let result: { data: string; filename: string };
            try {
                result = await ezBetaApi.buildOrDownload(version, config, options, (status) => {
                    console.log("[EZBETA] status:", status);
                    gui_log(`[EZBETA] ${status}`);
                    flashingMessage(status, FLASH_MESSAGE_TYPES.NEUTRAL);
                });
            } catch (e) {
                console.error(`${logHead} buildOrDownload:`, e);
                const msg = `${$t("firmwareFlasherFailedToLoadOnlineFirmware")}: ${(e as Error).message}`;
                flashingMessage(msg, FLASH_MESSAGE_TYPES.INVALID);
                gui_log(`[EZBETA] ERROR buildOrDownload: ${(e as Error).message}`);
                enableLoadRemoteFileButton(true);
                loadingRemote.value = false;
                return;
            }

            console.log("[EZBETA] downloaded:", result.filename, "len=", result.data.length);

            try {
                await processFile(result.data as unknown as FirmwareData, result.filename);
            } catch (e) {
                console.error(`${logHead} processFile:`, e);
                flashingMessage(
                    `Не удалось распарсить ${result.filename}: ${(e as Error).message}`,
                    FLASH_MESSAGE_TYPES.INVALID,
                );
            } finally {
                enableLoadRemoteFileButton(true);
                loadingRemote.value = false;
            }
        };

        // ==================== Flash workflow (без изменений) ====================
        const firmwareFlashing = useFirmwareFlashing({
            flashingMessage,
            flashProgress,
            FLASH_MESSAGE_TYPES,
            $t,
            logHead,
        });

        const firmwareAcceptsConfig = computed(() => {
            const parsedHex = firmwareFlashing.getParsedHex();
            return !!parsedHex && hasCustomDefaultsArea(parsedHex);
        });

        const saveFirmware = async () => {
            const fileType = state.firmware_type;
            try {
                const contents = fileType === "UF2" ? firmwareFlashing.getUf2Binary() : firmwareFlashing.getIntelHex();
                if (!fileType || !state.filename || !contents) throw new TypeError("No firmware loaded to save");
                const file = await FileSystem.pickSaveFile(
                    state.filename,
                    $t("fileSystemPickerFiles", { typeof: fileType.toUpperCase() }),
                    `.${fileType.toLowerCase()}`,
                    "firmware-file",
                );
                if (!file) return false;
                await FileSystem.writeFile(file, contents);
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        };

        let eventListenerRefs: ReturnType<typeof firmwareFlashing.setupFlashingEventListeners> | null = null;

        const setupEventBusListeners = () => {
            const { detectedUsbDevice, onDeviceRemoved } = firmwareFlashing.setupFlashingEventListeners({
                getFlashOnConnect: () => state.flashOnConnect,
                onBoardChange: async () => handleDetectBoard(),
                clearBufferedFirmware,
                updateDfuExitButtonState,
                initiateFlashing,
                startFlashing,
            });
            EventBus.$on("device-handler:auto-select-usb-device", detectedUsbDevice);
            EventBus.$on("device-handler:device-removed", onDeviceRemoved);
            eventListenerRefs = { detectedUsbDevice, onDeviceRemoved };
        };

        const teardownEventBusListeners = () => {
            if (!eventListenerRefs) return;
            EventBus.$off("device-handler:auto-select-usb-device", eventListenerRefs.detectedUsbDevice);
            EventBus.$off("device-handler:device-removed", eventListenerRefs.onDeviceRemoved);
            eventListenerRefs = null;
        };

        onBeforeUnmount(() => teardownEventBusListeners());

        // ==================== flash-логика (без изменений) ====================
        const requestDfuPermission = () => {
            const onCancel = () => {
                STM32.handleError();
                enableDfuExitButton(true);
            };
            dialog.openYesNo(
                $t("stm32UsbDfuNotFound"),
                $t("stm32DfuPermissionRequired"),
                async () => {
                    try {
                        const device = await DeviceHandler.dfuProtocol.requestPermission();
                        if (!device) onCancel();
                    } catch (e) {
                        console.error(`${logHead} DFU permission request failed:`, e);
                        onCancel();
                    }
                },
                onCancel,
                { yesText: $t("portsSelectPermissionDFU"), noText: $t("dialogClose") },
            );
        };

        const startFlashing = () => {
            sponsorTile.value?.pause();
            firmwareFlashing.startFlashing({
                config: state.config,
                clearBoardConfig,
                eraseChip: state.eraseChip,
                noRebootSequence: state.noRebootSequence,
                flashManualBaud: state.flashManualBaud,
                flashManualBaudRate: state.flashManualBaudRate,
                filename: state.filename,
                resetFlashingState,
                requestDfuPermission,
                selectedBoard: ezBetaState.selectedBoard || undefined,
                localFirmwareLoaded: state.localFirmwareLoaded,
                showDialogVerifyBoard,
                setFlashOnConnect: (v) => { state.flashOnConnect = v; },
            });
        };

        const startBackup = async (callback: () => void) => {
            connectionStore.connectLock = true;
            const aborted = (message: string) => {
                connectionStore.connectLock = false;
                state.flashingInProgress = false;
                connectionStore.flashingInProgress = false;
                enableFlashButton(true);
                enableLoadRemoteFileButton(true);
                enableLoadFileButton(true);
                flashingMessage($t(message), FLASH_MESSAGE_TYPES.INVALID);
            };
            const callBackWhenPortAvailable = () => {
                const startTime = Date.now();
                const interval = setInterval(() => {
                    if (DeviceHandler.portAvailable) {
                        clearInterval(interval);
                        callback();
                    } else if (Date.now() - startTime > 5000) {
                        clearInterval(interval);
                        aborted("portsSelectNone");
                    }
                }, 100);
            };
            AutoBackup.execute((result) => {
                connectionStore.connectLock = false;
                if (result) callBackWhenPortAvailable();
                else aborted("firmwareFlasherCanceledBackup");
            });
        };

        const showAcknowledgementDialog = async (cb: () => void) => {
            unstableFirmwareAcknowledgementCallback.value = cb;
            unstableFirmwareOpen.value = true;
        };
        const checkShowAcknowledgementDialog = async () => {
            const DAY_MS = 86400 * 1000;
            const tag = "lastDevelopmentWarningTimestamp";
            const setTs = () => { const o: Record<string, number> = {}; o[tag] = Date.now(); setStorage(o); };
            const last = getStorage<number>(tag)[tag];
            if (!last || Date.now() - last > DAY_MS) await showAcknowledgementDialog(setTs);
            else startFlashing();
        };
        const initiateFlashing = async () => {
            const isUnstable = state.developmentFirmwareLoaded || state.targetDetail?.releaseType === "Unstable";
            if (isUnstable) await checkShowAcknowledgementDialog();
            else startFlashing();
        };

        const handleFlashFirmware = async () => {
            if (state.flashButtonDisabled || activeFlasherStep.value !== "flash") return;
            resetLastBackupData();
            state.progressLabelText = "";
            state.lastFlashResultText = "";
            state.lastFlashResultClass = "";
            state.restoreInProgress = false;
            state.restoreCompleted = false;
            state.flashingInProgress = true;
            connectionStore.flashingInProgress = true;
            activeFlasherStep.value = "flash";
            await nextTick();
            const options = {
                connectLock: connectionStore.connectLock,
                firmwareType: state.firmware_type,
                filename: state.filename,
                flashOnConnect: state.flashOnConnect,
                portAvailable: DeviceHandler.portAvailable,
                dfuAvailable: DeviceHandler.dfuAvailable,
                preservePreFlashingState,
                enableFlashButton,
                enableDfuExitButton,
                enableLoadRemoteFileButton,
                enableLoadFileButton,
                saveFirmware,
                startFlashing,
                startBackup,
                initiateFlashing,
                progressCallback: () => {},
            };
            try {
                await firmwareFlashing.runFlashWorkflow(options);
            } catch (error) {
                state.flashingInProgress = false;
                connectionStore.flashingInProgress = false;
                throw error;
            }
        };

        // ==================== локальный файл (без изменений) ====================
        const processFirmwareFile = async (file: PickedFile, extension: string, data: FirmwareData) => {
            state.localFirmwareLoaded = true;
            const result = await firmwareFlashing.processFirmware(data, extension, {
                enableFlashButton,
                enableLoadRemoteFileButton: () => {},
                showLoadedFirmware,
                key: file.name,
                isLocalFile: true,
            });
            if (result) state.firmware_type = result.firmwareType;
            enableLoadFileButton(true);
        };
        const processConfigFile = (file: PickedFile, data: string) => {
            clearBufferedFirmware();
            const config = cleanUnifiedConfigFileWrapper(data);
            if (config === null) return;
            setBoardConfig(config, file.name);
            if (state.isConfigLocal && !firmwareFlashing.getParsedHex()) {
                flashingMessage($t("firmwareFlasherLoadedConfig"), FLASH_MESSAGE_TYPES.NEUTRAL);
                return;
            }
            const shouldEnable =
                (state.isConfigLocal && firmwareFlashing.getParsedHex() && !state.localFirmwareLoaded) ||
                state.localFirmwareLoaded;
            if (shouldEnable) {
                enableFlashButton(true);
                flashingMessage(
                    $t("firmwareFlasherFirmwareLocalLoaded", {
                        filename: file.name,
                        bytes: firmwareFlashing.getParsedHex()?.bytes_total || 0,
                    }),
                    FLASH_MESSAGE_TYPES.NEUTRAL,
                );
            }
        };
        const handleLoadFile = async () => {
            if (state.loadFileButtonDisabled) return;
            enableFlashButton(false);
            enableLoadRemoteFileButton(false);
            enableLoadFileButton(false);
            state.developmentFirmwareLoaded = false;
            try {
                const file = await FileSystem.pickOpenFile($t("fileSystemPickerFirmwareFiles"), [".hex", ".uf2", ".bin"], "firmware-file");
                if (!file) {
                    enableLoadRemoteFileButton(true);
                    enableLoadFileButton(true);
                    return;
                }
                const extension = getExtension(file.name);
                if (extension === "uf2" || extension === "bin") {
                    const data = await FileSystem.readFileAsBlob(file);
                    await processFirmwareFile(file, extension, data);
                } else if (extension === "hex") {
                    const data = await FileSystem.readFile(file);
                    await processFirmwareFile(file, extension, data);
                } else {
                    const data = await FileSystem.readFile(file);
                    processConfigFile(file, data);
                }
            } catch (error) {
                console.error("Error reading file:", error);
                enableLoadRemoteFileButton(true);
                enableLoadFileButton(true);
            }
        };

        // ==================== диалоги/прочее ====================
        const handleExitDfu = async () => {
            await firmwareFlashing.exitDfu({
                dfuExitButtonDisabled: state.dfuExitButtonDisabled,
                connectLock: connectionStore.connectLock,
            });
        };

        const handleUnstableFirmwareFlash = () => {
            if (!state.dialogUnstableFirmwareAcknowledgementCheckbox) return;
            unstableFirmwareOpen.value = false;
            const cb = unstableFirmwareAcknowledgementCallback.value;
            state.dialogUnstableFirmwareAcknowledgementCheckbox = false;
            unstableFirmwareAcknowledgementCallback.value = null;
            if (cb) cb();
            startFlashing();
        };
        const handleUnstableFirmwareCancel = () => {
            state.dialogUnstableFirmwareAcknowledgementCheckbox = false;
            unstableFirmwareAcknowledgementCallback.value = null;
            unstableFirmwareOpen.value = false;
        };
        const handleVerifyBoardAbort = () => {
            verifyBoardOpen.value = false;
            const cb = verifyBoardOnAbortCallback.value;
            verifyBoardOnAcceptCallback.value = null;
            verifyBoardOnAbortCallback.value = null;
            if (cb) cb();
        };
        const handleVerifyBoardContinue = () => {
            verifyBoardOpen.value = false;
            const cb = verifyBoardOnAcceptCallback.value;
            verifyBoardOnAcceptCallback.value = null;
            verifyBoardOnAbortCallback.value = null;
            if (cb) cb();
        };
        const showDialogVerifyBoard: ShowDialogVerifyBoard = (selected, verified, onAccept, onAbort) => {
            verifyBoardContentHtml.value = $t("firmwareFlasherVerifyBoard", {
                selected_board: selected,
                verified_board: verified,
            });
            if (!verifyBoardOpen.value) {
                verifyBoardOnAcceptCallback.value = onAccept;
                verifyBoardOnAbortCallback.value = onAbort;
                verifyBoardOpen.value = true;
            }
        };

        const handleRestoreBackup = async () => {
            const backupData = getLastBackupData();
            if (!backupData) {
                dialog.openInfo($t("warningTitle"), $t("firmwareFlasherNoBackupAvailable"), () => {});
                return;
            }
            dialog.openYesNo(
                $t("firmwareFlasherRestoreBackupTitle"),
                $t("firmwareFlasherRestoreBackupConfirm"),
                async () => {
                    const fileLines = backupData.split(/\r?\n/).map((l) => l.trim());
                    const hasDefaults = fileLines.some((l) => l.trim().toLowerCase() === "defaults nosave");
                    const cliLines = hasDefaults ? fileLines : ["defaults nosave", ...fileLines];
                    connectionStore.connectLock = true;
                    state.restoreInProgress = true;
                    dialog.openWait($t("firmwareFlasherRestoreBackupTitle"), null);
                    AutoRestore.execute(cliLines, (result) => {
                        dialog.close();
                        connectionStore.connectLock = false;
                        state.restoreInProgress = false;
                        if (result.success) {
                            state.restoreCompleted = true;
                            if ((result.skipped ?? 0) > 0) gui_log($t("firmwareFlasherRestoreBackupSuccessSkipped", { count: result.skipped }));
                            else gui_log($t("firmwareFlasherRestoreBackupSuccess"));
                        } else {
                            const errorMsg = result.errors || "Unknown error";
                            gui_log($t("firmwareFlasherRestoreBackupFailed", { 1: errorMsg }));
                            dialog.openInfo($t("warningTitle"), $t("firmwareFlasherRestoreBackupFailed", { 1: errorMsg }), () => {});
                        }
                    });
                },
                () => {},
            );
        };

        const handleNoRebootChange = () => {
            setConfig({ no_reboot_sequence: state.noRebootSequence });
            state.flashOnConnectWrapperVisible = state.noRebootSequence;
            if (!state.noRebootSequence) state.flashOnConnect = false;
        };
        const handleEraseChipChange = () => setConfig({ erase_chip: state.eraseChip });
        const handleFlashManualBaudChange = () => setConfig({ flash_manual_baud: state.flashManualBaud });
        const handleFlashManualBaudRateChange = () => {
            const baud = Number.parseInt(String(state.flashManualBaudRate));
            setConfig({ flash_manual_baud_rate: baud });
        };
        const showDfuButton = DeviceHandler.showUsbOption;
        const handleRequestDfuPermission = () => DeviceHandler.requestDevicePermission("usb");

        // ==================== меню, subtabs ====================
        const loadFirmwareMenuItems = computed(() => [[
            {
                label: $t("firmwareFlasherButtonLoadOnline"),
                icon: "i-lucide-cloud-download",
                disabled: state.loadRemoteButtonDisabled || state.flashingInProgress,
                onSelect: handleLoadRemoteFile,
            },
            {
                label: $t("firmwareFlasherButtonLoadLocal"),
                icon: "i-lucide-hard-drive-download",
                disabled: state.loadFileButtonDisabled || state.flashingInProgress,
                onSelect: handleLoadFile,
            },
        ]]);

        const flashActionMenuItems = computed(() => {
            const group: DropdownMenuItem[] = [
                {
                    label: $t("firmwareFlasherFlashFirmware"),
                    icon: "i-lucide-zap",
                    disabled: state.flashButtonDisabled || activeFlasherStep.value !== "flash" || state.flashingInProgress,
                    onSelect: handleFlashFirmware,
                },
                {
                    label: $t("firmwareFlasherExitDfu"),
                    icon: "i-lucide-usb",
                    disabled: state.dfuExitButtonDisabled || state.flashingInProgress,
                    onSelect: handleExitDfu,
                },
            ];
            if (showDfuButton) {
                group.push({
                    label: $t("firmwareFlasherFindDfuDevice"),
                    icon: "i-lucide-cpu",
                    disabled: state.flashingInProgress,
                    onSelect: handleRequestDfuPermission,
                });
            }
            return [group];
        });

        const flashRingColor = computed(() => {
            switch (state.progressLabelClass) {
                case "invalid":
                case "erasing": return "error";
                case "flashing": return "warning";
                case "valid":
                case "verifying": return "success";
                default: return "primary";
            }
        });

        const subtabItems = computed(() => [
            { label: $t("firmwareFlasherSubTabBoardBuild"), value: "board-build", icon: "i-lucide-cpu" },
            { label: $t("firmwareFlasherSubTabFlash"), value: "flash", icon: "i-lucide-zap" },
        ]);
        const selectSubtab = (subtab: string) => {
            if (subtabItems.value.some((i) => i.value === subtab)) activeFlasherStep.value = subtab;
        };

        // ==================== инициализация ====================
        const setupUIHandlers = async () => {
            let result = getConfig<boolean>("erase_chip");
            state.eraseChip = result.erase_chip;
            result = getConfig<boolean>("no_reboot_sequence");
            state.noRebootSequence = result.no_reboot_sequence;
            state.flashOnConnectWrapperVisible = state.noRebootSequence;
            result = getConfig<boolean>("flash_manual_baud");
            state.flashManualBaud = result.flash_manual_baud;
            state.flashManualBaudRate = getConfig<number>("flash_manual_baud_rate").flash_manual_baud_rate || 256000;

            flashingMessage($t("firmwareFlasherLoadFirmwareFile"), FLASH_MESSAGE_TYPES.NEUTRAL);
            updateDfuExitButtonState();

            // === EZBETA === при открытии вкладки сразу тянем релизы и платы
            await loadEzBetaData();
        };

        onMounted(async () => {
            navigationStore.activeTab = "firmware_flasher";
            activeFlasherStep.value = "board-build";
            firmwareFlashing.clearFirmwareState();
            state.localFirmwareLoaded = false;
            state.isConfigLocal = false;
            state.customDefinesTags = [];
            state.lastFlashResultText = "";
            state.lastFlashResultClass = "";

            await setupUIHandlers();
            setupEventBusListeners();
            i18n.localizePage();
        });

        return {
            state,
            ezBetaState,
            loadingRemote,
            flashRingColor,
            firmwareAcceptsConfig,
            activeFlasherStep,
            subtabItems,
            selectSubtab,
            flashActionMenuItems,
            loadFirmwareMenuItems,
            cloudBuildStub,
            FLASH_MESSAGE_TYPES,
            sponsorTile,
            verifyBoardOpen,
            verifyBoardContentHtml,
            unstableFirmwareOpen,
            handleDetectBoard,
            handleFlashFirmware,
            handleLoadRemoteFile,
            handleLoadFile,
            handleNoRebootChange,
            handleEraseChipChange,
            handleFlashManualBaudChange,
            handleFlashManualBaudRateChange,
            handleExitDfu,
            handleUnstableFirmwareFlash,
            handleUnstableFirmwareCancel,
            handleVerifyBoardAbort,
            handleVerifyBoardContinue,
            handleRestoreBackup,
            saveFirmware,
        };
    },
});
</script>

<style lang="less">
/* Стили штатные — оставлены из исходного файла */
.tab-firmware_flasher {
    min-height: 100%;
    .flasher-tab-area { min-height: 200px; }
    .content_wrapper .flashing-wait {
        min-height: 150px; height: 50%;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;
    }
    .flash-status-message { padding: 0.5rem 1rem; border-radius: 0.25rem; font-size: 0.85rem; }
    .grid-box-spacer { height: 1rem; }
}
</style>