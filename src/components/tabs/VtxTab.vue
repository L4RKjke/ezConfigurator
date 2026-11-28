<template>
    <BaseTab tab-name="vtx">
        <div class="content_wrapper">
            <!-- Title -->
            <div class="tab_title" v-html="$t('tabVtx')"></div>
            <WikiButton docUrl="vtx" />

            <div class="mt-4 flex flex-wrap items-start gap-4"
                :inert="rulesBusy || recoveryRequired">

                <!-- Warnings: на всю ширину, панели пойдут ниже -->
                <div class="w-full flex flex-col gap-2">
                    <!-- Not supported -->
                    <UiBox v-show="!vtxSupported" highlight>
                        <div v-html="$t('vtxMessageNotSupported')"></div>
                    </UiBox>

                    <!-- Table not configured / factory bands warnings -->
                    <UiBox v-show="vtxTableNotConfigured" highlight>
                        <div v-html="$t('vtxMessageTableNotConfigured')"></div>
                    </UiBox>
                    <UiBox v-show="factoryBandsNotSupported" highlight>
                        <div v-html="$t('vtxMessageFactoryBandsNotSupported')"></div>
                    </UiBox>
                </div>

                <!-- Configuration Panel -->
                <UiBox
                    v-show="vtxSupported"
                    :title="$t('vtxSelectedMode')"
                    type="neutral"
                    class="w-full sm:w-fit"
                >
                    <div class="flex flex-col gap-2">
                        <!-- Frequency/Channel toggle -->
                        <SettingRow :label="$t('vtxFrequencyChannel')" :help="$t('vtxFrequencyChannelHelp')">
                            <USwitch v-model="frequencyMode" size="xs" />
                        </SettingRow>

                        <!-- Band select -->
                        <SettingRow v-show="!frequencyMode" :label="$t('vtxBand')" :help="$t('vtxBandHelp')">
                            <USelect v-model="vtxConfig.vtx_band" :items="bandOptions" class="w-32" />
                        </SettingRow>

                        <!-- Channel select -->
                        <SettingRow v-show="!frequencyMode" :label="$t('vtxChannel')" :help="$t('vtxChannelHelp')">
                            <USelect v-model="vtxConfig.vtx_channel" :items="channelOptions" class="w-32" />
                        </SettingRow>

                        <!-- Frequency input -->
                        <SettingRow v-show="frequencyMode" :label="$t('vtxFrequency')" :help="$t('vtxFrequencyHelp')">
                            <UInputNumber
                                v-model="vtxConfig.vtx_frequency"
                                :min="64"
                                :max="5999"
                                :step="1"
                                :format-options="{ useGrouping: false }"
                                size="xs"
                                orientation="vertical"
                                class="w-20"
                            />
                        </SettingRow>

                        <!-- Power select -->
                        <SettingRow :label="$t('vtxPower')" :help="$t('vtxPowerHelp')">
                            <USelect v-model="vtxConfig.vtx_power" :items="powerOptions" class="w-32" />
                        </SettingRow>

                        <!-- Pit mode -->
                        <SettingRow :label="$t('vtxPitMode')" :help="$t('vtxPitModeHelp')">
                            <USwitch v-model="vtxConfig.vtx_pit_mode" size="xs" />
                        </SettingRow>

                        <!-- Pit mode frequency -->
                        <SettingRow :label="$t('vtxPitModeFrequency')" :help="$t('vtxPitModeFrequencyHelp')">
                            <UInputNumber
                                v-model="vtxConfig.vtx_pit_mode_frequency"
                                :min="0"
                                :max="5999"
                                :step="1"
                                :format-options="{ useGrouping: false }"
                                size="xs"
                                orientation="vertical"
                                class="w-20"
                            />
                        </SettingRow>

                        <!-- Low power disarm -->
                        <SettingRow :label="$t('vtxLowPowerDisarm')" :help="$t('vtxLowPowerDisarmHelp')">
                            <USelect
                                v-model="vtxConfig.vtx_low_power_disarm"
                                :items="lowPowerDisarmOptions"
                                class="w-36"
                            />
                        </SettingRow>

                        <!-- Allow VTX change while armed (только если прошивка знает настройку) -->
                        <SettingRow
                            v-if="allowVtxSupported"
                            :label="$t('vtxAllowChangeWhileArmed')"
                            :help="$t('vtxAllowChangeWhileArmedHelp')"
                        >
                            <USwitch
                                :model-value="allowVtxChangeWhileArmed"
                                size="xs"
                                :disabled="!allowVtxLoaded || rulesBusy || recoveryRequired || isSaving || importBusy"
                                @update:model-value="onAllowVtxChange"
                            />
                        </SettingRow>
                    </div>
                </UiBox>

                <!-- VTX Info Panel -->
                <UiBox
                    v-show="vtxSupported"
                    :title="$t('vtxActualState')"
                    type="neutral"
                    class="w-full sm:w-80"
                >
                    <div class="flex flex-col text-xs">
                        <div class="flex justify-between py-1.5 border-b border-(--ui-border)">
                            <span v-html="$t('vtxDeviceReady')"></span>
                            <span class="colorToggle" :class="{ ready: deviceReady }">{{ deviceReadyText }}</span>
                        </div>
                        <div class="flex justify-between py-1.5 border-b border-(--ui-border)">
                            <span v-html="$t('vtxType')"></span>
                            <span>{{ vtxTypeString }}</span>
                        </div>
                        <div class="flex justify-between py-1.5 border-b border-(--ui-border)">
                            <span v-html="$t('vtxBand')"></span>
                            <span>{{ bandDescription }}</span>
                        </div>
                        <div class="flex justify-between py-1.5 border-b border-(--ui-border)">
                            <span v-html="$t('vtxChannel')"></span>
                            <span>{{ vtxConfig.vtx_channel }}</span>
                        </div>
                        <div class="flex justify-between py-1.5 border-b border-(--ui-border)">
                            <span v-html="$t('vtxFrequency')"></span>
                            <span>{{ vtxConfig.vtx_frequency }}</span>
                        </div>
                        <div class="flex justify-between py-1.5 border-b border-(--ui-border)">
                            <span v-html="$t('vtxPower')"></span>
                            <span>{{ powerDescription }}</span>
                        </div>
                        <div class="flex justify-between py-1.5 border-b border-(--ui-border)">
                            <span v-html="$t('vtxPitMode')"></span>
                            <span>{{ pitModeDescription }}</span>
                        </div>
                        <div class="flex justify-between py-1.5 border-b border-(--ui-border)">
                            <span v-html="$t('vtxPitModeFrequency')"></span>
                            <span>{{ vtxConfig.vtx_pit_mode_frequency }}</span>
                        </div>
                        <div class="flex justify-between py-1.5">
                            <span v-html="$t('vtxLowPowerDisarm')"></span>
                            <span>{{ lowPowerDisarmDescription }}</span>
                        </div>
                    </div>
                </UiBox>

                <!-- Device: protocol and port stay reachable before a VTX answers -->
                <UiBox
                    v-if="vtxPortAvailable"
                    :title="$t('vtxDeviceSetup')"
                    type="neutral"
                    collapsible
                    class="w-full sm:w-fit"
                >
                    <div class="flex flex-col gap-2">
                        <SettingRow :label="$t('vtxProtocol')" :help="$t('vtxProtocolHelp')">
                            <USelect
                                :model-value="vtxProtocol ?? undefined"
                                @update:model-value="(v: string) => (vtxProtocol = v)"
                                :items="vtxProtocolOptions"
                                class="w-36"
                            />
                        </SettingRow>

                        <SettingRow
                            :label="$t('vtxSerialPort')"
                            :help="vtxPortFollowsOsd ? $t('vtxSerialPortMspHelp') : $t('vtxSerialPortHelp')"
                        >
                            <USelect
                                :model-value="vtxPortShown"
                                @update:model-value="(v: number) => (vtxPortIdentifier = v)"
                                :items="vtxPortOptions"
                                :disabled="!vtxPortWritable || vtxPortFollowsOsd"
                                class="min-w-40"
                            />
                        </SettingRow>
                    </div>
                </UiBox>
                <!-- VTX Catalog -->
                <div v-show="vtxSupported" class="w-full">
                    <UiBox :title="$t('vtxCatalog')" type="neutral" class="w-full">
                        <div class="flex flex-wrap items-stretch gap-4">
                            <!-- Левая колонка: фильтры и кнопка друг под другом -->
                            <div class="flex flex-col gap-3">
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-1">
                                        <span class="text-xs" v-html="$t('vtxCatalogSearch')"></span>
                                    </div>
                                    <UInput
                                        v-model="catalogSearch"
                                        :placeholder="$t('vtxCatalogSearchPlaceholder')"
                                        class="w-64"
                                    />
                                </div>

                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-1">
                                        <span class="text-xs" v-html="$t('vtxCatalogRange')"></span>
                                        <HelpIcon :text="$t('vtxCatalogRangeHelp')" />
                                    </div>
                                    <USelect
                                        v-model="catalogRangeFilter"
                                        :items="catalogRangeOptions"
                                        :placeholder="$t('vtxCatalogRangeAll')"
                                        class="w-32"
                                    />
                                </div>

                                <!-- Выбор модели -->
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-1">
                                        <span class="text-xs" v-html="$t('vtxCatalogSelectModel')"></span>
                                        <HelpIcon :text="$t('vtxCatalogHelp')" />
                                    </div>
                                    <USelect
                                        v-model="selectedCatalogId"
                                        :items="filteredCatalogOptions"
                                        :placeholder="$t('vtxCatalogSelectModel')"
                                        class="w-64"
                                    />
                                </div>

                                <UButton
                                    :label="$t('vtxCatalogApply')"
                                    :disabled="!selectedCatalogEntry || isSaving || importBusy"
                                    class="w-fit"
                                    @click="applyCatalog"
                                />
                            </div>
                            <div
                                v-if="selectedCatalogPhoto"
                                class="self-stretch shrink-0 flex items-center"
                            >
                                <img
                                    :src="selectedCatalogPhoto"
                                    :alt="selectedCatalogEntry?.name"
                                    class="h-full w-auto max-w-full max-h-64 object-contain rounded-md border border-(--ui-border)"
                                />
                            </div>
                        </div>
                    </UiBox>
                </div>

                <!-- VTX Table -->
                <div class="w-full max-w-full overflow-x-auto">
                    <UiBox :title="$t('vtxTable')" type="neutral" class="w-fit">
                        <div class="flex flex-col gap-4">
                            <!-- Bands and channels count -->
                            <div class="flex flex-wrap items-end gap-4">
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-1">
                                        <span class="text-xs" v-html="$t('vtxTableBands')"></span>
                                        <HelpIcon :text="$t('vtxTableBandsHelp')" />
                                    </div>
                                    <UInputNumber
                                        :model-value="vtxConfig.vtx_table_bands"
                                        @update:model-value="setTableBands"
                                        :min="0"
                                        :max="32"
                                        :step="1"
                                        :format-options="{ useGrouping: false }"
                                        size="xs"
                                        orientation="vertical"
                                        class="w-14"
                                    />
                                </div>
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-1">
                                        <span class="text-xs" v-html="$t('vtxTableChannels')"></span>
                                        <HelpIcon :text="$t('vtxTableBandsChannelsHelp')" />
                                    </div>
                                    <UInputNumber
                                        :model-value="vtxConfig.vtx_table_channels"
                                        @update:model-value="setTableChannels"
                                        :min="0"
                                        :max="8"
                                        :step="1"
                                        :format-options="{ useGrouping: false }"
                                        size="xs"
                                        orientation="vertical"
                                        class="w-14"
                                    />
                                </div>
                            </div>

                            <!-- Bands/Channels table -->
                            <div v-if="vtxConfig.vtx_table_bands > 0 && vtxConfig.vtx_table_channels > 0">
                                <div class="flex items-center gap-1 mb-2">
                                    <HelpIcon :text="$t('vtxTableBandsChannelsTableHelp')" />
                                </div>
                                <div class="grid gap-x-2 gap-y-1 items-center" :style="bandGridStyle">
                                    <!-- Header -->
                                    <div
                                        class="text-xs font-semibold text-center"
                                        v-html="$t('vtxTableBandTitleName')"
                                    ></div>
                                    <div
                                        class="text-xs font-semibold text-center"
                                        v-html="$t('vtxTableBandTitleLetter')"
                                    ></div>
                                    <div
                                        v-if="factoryBandsSupported"
                                        class="text-xs font-semibold text-center"
                                        v-html="$t('vtxTableBandTitleFactory')"
                                    ></div>
                                    <div
                                        v-for="ch in vtxConfig.vtx_table_channels"
                                        :key="'hdr-ch-' + ch"
                                        class="text-xs font-semibold text-center"
                                    >
                                        {{ ch }}
                                    </div>
                                    <div></div>

                                    <!-- Band rows -->
                                    <template v-for="bandIdx in vtxConfig.vtx_table_bands" :key="'band-' + bandIdx">
                                        <div>
                                            <UInput
                                                :model-value="getBandName(bandIdx)"
                                                @update:model-value="setBandName(bandIdx, String($event).toUpperCase())"
                                                @blur="setBandName(bandIdx, getBandName(bandIdx).trim())"
                                                maxlength="8"
                                                size="xs"
                                                class="uppercase"
                                            />
                                        </div>
                                        <div>
                                            <UInput
                                                :model-value="getBandLetter(bandIdx)"
                                                @update:model-value="
                                                    setBandLetter(bandIdx, String($event).toUpperCase())
                                                "
                                                @blur="setBandLetter(bandIdx, getBandLetter(bandIdx).trim())"
                                                maxlength="1"
                                                size="xs"
                                                class="uppercase w-8"
                                            />
                                        </div>
                                        <div v-if="factoryBandsSupported" class="flex justify-center">
                                            <USwitch
                                                size="xs"
                                                :model-value="getBandFactory(bandIdx)"
                                                @update:model-value="setBandFactory(bandIdx, $event)"
                                            />
                                        </div>
                                        <div
                                            v-for="chIdx in vtxConfig.vtx_table_channels"
                                            :key="'band-' + bandIdx + '-ch-' + chIdx"
                                        >
                                            <UInputNumber
                                                :model-value="getBandChannelFreq(bandIdx, chIdx)"
                                                @update:model-value="setBandChannelFreq(bandIdx, chIdx, $event)"
                                                :min="0"
                                                :max="5999"
                                                :step="1"
                                                :format-options="{ useGrouping: false }"
                                                size="xs"
                                                orientation="vertical"
                                                class="w-full"
                                            />
                                        </div>
                                        <div
                                            class="text-xs text-dimmed whitespace-nowrap"
                                            v-html="$t('vtxBand_X', { bandName: bandIdx })"
                                        ></div>
                                    </template>
                                </div>
                            </div>

                            <!-- Power levels count -->
                            <div class="flex flex-col gap-1">
                                <div class="flex items-center gap-1">
                                    <span class="text-xs" v-html="$t('vtxTablePowerLevels')"></span>
                                    <HelpIcon :text="$t('vtxTablePowerLevelsHelp')" />
                                </div>
                                <UInputNumber
                                    :model-value="vtxConfig.vtx_table_powerlevels"
                                    @update:model-value="setTablePowerLevels"
                                    :min="0"
                                    :max="8"
                                    :step="1"
                                    :format-options="{ useGrouping: false }"
                                    size="xs"
                                    orientation="vertical"
                                    class="w-14"
                                />
                            </div>

                            <!-- Power levels table -->
                            <div v-if="vtxConfig.vtx_table_powerlevels > 0">
                                <div class="flex items-center gap-1 mb-2">
                                    <HelpIcon :text="$t('vtxTablePowerLevelsTableHelp')" />
                                </div>
                                <div class="grid gap-x-2 gap-y-1 items-center" :style="powerGridStyle">
                                    <!-- Header -->
                                    <div
                                        v-for="i in vtxConfig.vtx_table_powerlevels"
                                        :key="'pl-hdr-' + i"
                                        class="text-xs font-semibold text-center"
                                    >
                                        {{ i }}
                                    </div>
                                    <div></div>

                                    <!-- Values row -->
                                    <div v-for="i in vtxConfig.vtx_table_powerlevels" :key="'pl-val-' + i">
                                        <UInputNumber
                                            :model-value="getPowerLevelValue(i)"
                                            @update:model-value="setPowerLevelValue(i, $event)"
                                            :min="0"
                                            :max="65535"
                                            :step="1"
                                            :format-options="{ useGrouping: false }"
                                            size="xs"
                                            orientation="vertical"
                                            class="w-full"
                                        />
                                    </div>
                                    <div
                                        class="text-xs text-dimmed whitespace-nowrap"
                                        v-html="$t('vtxTablePowerLevelsValue')"
                                    ></div>

                                    <!-- Labels row -->
                                    <div v-for="i in vtxConfig.vtx_table_powerlevels" :key="'pl-lbl-' + i">
                                        <UInput
                                            :model-value="getPowerLevelLabel(i)"
                                            @update:model-value="setPowerLevelLabel(i, String($event).toUpperCase())"
                                            @blur="setPowerLevelLabel(i, getPowerLevelLabel(i).trim())"
                                            maxlength="3"
                                            size="xs"
                                            class="uppercase w-full"
                                        />
                                    </div>
                                    <div
                                        class="text-xs text-dimmed whitespace-nowrap"
                                        v-html="$t('vtxTablePowerLevelsLabel')"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </UiBox>
                </div>
            </div>
            <VtxRulesEditor
                v-if="rulesTabReady && vtxSupported"
                :main-dirty="mainVtxDirty"
                :main-saving="isSaving || importBusy"
                :powers="powerOptions"
                :bands="bandOptions"
                :channels-for="ruleChannelsFor"
                :drain-status="drainStatus"
            />
            <!-- Save pending warning -->
            <UiBox highlight v-show="savePending">
                <div v-html="$t('vtxMessageVerifyTable')"></div>
            </UiBox>
        </div>

        <!-- Toolbar -->
        <div class="content_toolbar toolbar_fixed_bottom"
            :inert="rulesBusy || recoveryRequired">
            <UFieldGroup orientation="horizontal">
                <UButton :label="$t('loadFromFile')" :disabled="isSaving" @click="importVtxFile" variant="soft" />
                <UDropdownMenu v-slot="{ open }" :items="loadMenuItems" :content="{ align: 'end', side: 'top' }">
                    <UButton
                        :icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                        :aria-label="$t('vtxButtonLoadOptions')"
                        :disabled="isSaving"
                        square
                        variant="soft"
                    />
                </UDropdownMenu>
            </UFieldGroup>
            <UFieldGroup orientation="horizontal">
                <UButton :label="$t('saveToFile')" :disabled="isSaving" @click="saveJsonFile" variant="soft" />
                <UDropdownMenu v-slot="{ open }" :items="saveFileMenuItems" :content="{ align: 'end', side: 'top' }">
                    <UButton
                        :icon="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                        :aria-label="$t('vtxButtonSaveFileOptions')"
                        :disabled="isSaving"
                        square
                        variant="soft"
                    />
                </UDropdownMenu>
            </UFieldGroup>
            <UButton :label="$t('save')" :disabled="saveButtonDisabled || !rulesTabReady || rulesBusy || importBusy || recoveryRequired" :loading="isSaving" @click="handleSave" />
        </div>
    </BaseTab>
</template>

<script lang="ts">
import { defineComponent, onMounted, computed, ref, onBeforeUnmount } from "vue";
import BaseTab from "./BaseTab.vue";
import WikiButton from "../elements/WikiButton.vue";
import UiBox from "../elements/UiBox.vue";
import HelpIcon from "../elements/HelpIcon.vue";
import SettingRow from "../elements/SettingRow.vue";
import { i18n } from "../../js/localization";
import { useVtx } from "../../composables/useVtx";
import { useInterval } from "../../composables/useInterval";
import { useSaving } from "../../composables/useSaving";
import { useFeaturePort } from "@/composables/ports/useFeaturePort";
import { usePortConflicts } from "@/composables/ports/usePortConflicts";
import { PORT_NONE } from "@/composables/ports/portNames";
import { useTranslation } from "i18next-vue";
import VtxRulesEditor from "../vtx/VtxRulesEditor.vue";
import { useConnectionStore } from "@/stores/connection";
import { recoveryRequired, rulesBusy } from "@/js/vtxRules/session";
import { useVtxAllowChange } from "@/composables/useVtxAllowChange";
import { useVtxCatalog } from "@/composables/useVtxCatalog";
import type { VtxCatalogEntry } from "@/composables/useVtxCatalog";

export default defineComponent({
    name: "VtxTab",
    components: {
        BaseTab,
        WikiButton,
        UiBox,
        HelpIcon,
        SettingRow,
        VtxRulesEditor,
    },
    setup() {
        const { t } = useTranslation();

        const {
            allowVtxChangeWhileArmed,
            allowVtxSupported,
            allowVtxDirty,
            allowVtxLoaded,
            load: loadAllowVtxChange,
            onChange: onAllowVtxChange,
            markSaved: markAllowVtxSaved,
        } = useVtxAllowChange();


        const {
            MAX_POWERLEVEL_VALUES,
            MAX_BAND_VALUES,
            MAX_BAND_CHANNELS_VALUES,
            savePending,
            factoryBandsSupported,
            frequencyMode,
            vtxConfig,
            bandList,
            powerLevelList,
            deviceReady,
            vtxTypeString,
            saveButtonDisabled: vtxConfigSaveDisabled,
            vtxSupported,
            vtxTableNotConfigured,
            factoryBandsNotSupported,
            bandOptions,
            channelOptions,
            powerOptions,
            bandDescription,
            powerDescription,
            pitModeDescription,
            lowPowerDisarmDescription,
            deviceReadyText,
            loadVtxConfig,
            updateDeviceStatus,
            saveVtx,
            saveJsonFile,
            saveLuaFile,
            loadJsonFile,
            loadClipboardJson,
            onVtxTableChange,
        } = useVtx();
        const { entries: catalogEntries, photoUrl } = useVtxCatalog();
 
        const selectedCatalogId = ref<string | null>(null);

        // Диапазоны частот: MHz-границы подобраны так, чтобы покрывать
        // реальные частоты соответствующих диапазонов (5.8 — 5000..6000 и т.д.)
        const FREQUENCY_RANGES = [
            { id: "1.2", label: "1.2 ГГц", min: 1000, max: 1300 },
            { id: "1.5", label: "1.5 ГГц", min: 1350, max: 1750 },
            { id: "2.4", label: "2.4 ГГц", min: 2300, max: 2550 },
            { id: "3.3", label: "3.3 ГГц", min: 3000, max: 3500 },
            { id: "3.7", label: "3.7 ГГц", min: 3520, max: 4500 },
            { id: "4.9", label: "4.9 ГГц", min: 4500, max: 5000 },
            { id: "5.8", label: "5.8 ГГц", min: 5000, max: 6000 },
            { id: "7.2", label: "7.2 ГГц", min: 6000, max: 8000 },
        ];

        const catalogSearch = ref("");
        const catalogRangeFilter = ref<string | null>(null);

        // Показываем только те диапазоны, частоты которых реально есть в каталоге
        const catalogRangeOptions = computed(() => {
            const hasFreq = (entry: VtxCatalogEntry, r: (typeof FREQUENCY_RANGES)[number]) =>
                (entry.table?.vtx_table?.bands_list ?? []).some(band =>
                    (band.frequencies ?? []).some(f => f > 0 && f >= r.min && f < r.max),
                );
            return FREQUENCY_RANGES
                .filter(r => catalogEntries.some(e => hasFreq(e, r)))
                .map(r => ({ value: r.id, label: r.label }));
        });

        const filteredCatalogEntries = computed(() => {
            const query = catalogSearch.value.trim().toLowerCase();
            const range = FREQUENCY_RANGES.find(r => r.id === catalogRangeFilter.value) ?? null;
            return catalogEntries.filter(entry => {
                if (query && !entry.name.toLowerCase().includes(query)) return false;
                if (range) {
                    const match = (entry.table?.vtx_table?.bands_list ?? []).some(band =>
                        (band.frequencies ?? []).some(f => f > 0 && f >= range.min && f < range.max),
                    );
                    if (!match) return false;
                }
                return true;
            });
        });

        const filteredCatalogOptions = computed(() =>
            filteredCatalogEntries.value.map(e => ({ value: e.id, label: e.name })),
        );

        const selectedCatalogEntry = computed(
            () => catalogEntries.find(e => e.id === selectedCatalogId.value) ?? null,
        );

        const selectedCatalogPhoto = computed(
            () => (selectedCatalogEntry.value ? photoUrl(selectedCatalogEntry.value.photo) : null),
        );

        // Применяет таблицу выбранной модели через те же сеттеры, что и ручной ввод,
        // чтобы onVtxTableChange() и dirty-состояние отработали как обычно.
        function applyCatalog() {
            const entry = selectedCatalogEntry.value;
            const table = entry?.table?.vtx_table;
            if (!entry || !table) return;

            setTableBands(table.bands_list.length);
            const channels = table.bands_list.reduce(
                (max, band) => Math.max(max, band.frequencies.length),
                0,
            );
            setTableChannels(channels);

            table.bands_list.forEach((band, bandIndex) => {
                const bandNumber = bandIndex + 1;
                setBandName(bandNumber, band.name);
                setBandLetter(bandNumber, band.letter);
                setBandFactory(bandNumber, band.is_factory_band);
                band.frequencies.forEach((freq, chIndex) => {
                    setBandChannelFreq(bandNumber, chIndex + 1, freq);
                });
            });

            setTablePowerLevels(table.powerlevels_list.length);
            table.powerlevels_list.forEach((level, index) => {
                setPowerLevelValue(index + 1, level.value);
                setPowerLevelLabel(index + 1, level.label);
            });

            vtxConfig.vtx_band = entry.vtx_band ?? 1;
            vtxConfig.vtx_channel = entry.vtx_channel ?? 1;

            onVtxTableChange();

            selectedCatalogId.value = null;
        }

        const { addInterval } = useInterval();
        const { isSaving, runSave } = useSaving();

        // The mask bit a VTX claims is chosen by its protocol, so all three are its own.
        const {
            available: vtxPortAvailable,
            writable: vtxPortWritable,
            options: vtxPortOptions,
            selectedIdentifier: vtxPortIdentifier,
            changed: vtxPortChanged,
            conflict: vtxPortConflict,
            load: loadVtxPort,
            write: writeVtxPort,
            selectedProtocol: vtxProtocol,
            protocolOptions: vtxProtocolValues,
        } = useFeaturePort({
            setting: "vtx_uart",
            protocol: { setting: "vtx_type" },
        });

        const { confirmPortConflicts } = usePortConflicts(() => [vtxPortConflict]);

        // An MSP VTX answers on the goggles' MSP link rather than a port of its own, so the
        // firmware falls back to the OSD's UART and the row follows the OSD tab, read-only.
        const { selectedIdentifier: osdPortIdentifier, load: loadOsdPort } = useFeaturePort({
            setting: "osd_uart",
        });

        const mspVtx = computed(() => vtxProtocol.value === "MSP");
        const vtxPortShown = computed(() =>
            mspVtx.value && vtxPortIdentifier.value === PORT_NONE ? osdPortIdentifier.value : vtxPortIdentifier.value,
        );

        // Only the fallback is locked: an MSP VTX with no port of its own rides
        // the OSD's UART, which is assigned on the OSD tab. A dedicated port
        // stays editable whatever the protocol.
        const vtxPortFollowsOsd = computed(
            () => mspVtx.value && vtxPortIdentifier.value === PORT_NONE && osdPortIdentifier.value !== PORT_NONE,
        );

        // vtxDevType_e keeps index 2 open, so the firmware lookup names it RESERVED.
        const vtxProtocolOptions = computed(() => vtxProtocolValues.value.filter(({ value }) => value !== "RESERVED"));

        // A port-only change still has to enable Save; the VTX config's own dirty state cannot see it.
        const saveButtonDisabled = computed(
            () => vtxConfigSaveDisabled.value && !vtxPortChanged.value && !allowVtxDirty.value,
        );

        const lowPowerDisarmOptions = computed(() => [
            { value: 0, label: t("vtxLowPowerDisarmOption_0") },
            { value: 1, label: t("vtxLowPowerDisarmOption_1") },
            { value: 2, label: t("vtxLowPowerDisarmOption_2") },
        ]);

        // Dynamic grid column styles for band and power tables
        const bandGridStyle = computed(() => {
            const cols = ["minmax(5rem,auto)", "2.5rem"];
            if (factoryBandsSupported.value) {
                cols.push("2.5rem");
            }
            const channelCount = vtxConfig.vtx_table_channels || 0;
            for (let i = 0; i < channelCount; i++) {
                cols.push("minmax(4rem,auto)");
            }
            cols.push("auto");
            return { gridTemplateColumns: cols.join(" ") };
        });

        const powerGridStyle = computed(() => {
            const count = vtxConfig.vtx_table_powerlevels || 0;
            const cols = new Array(count).fill("minmax(5rem,1fr)");
            cols.push("auto");
            return { gridTemplateColumns: cols.join(" ") };
        });

        const loadMenuItems = computed(() => [
            [
                {
                    label: t("loadFromFile"),
                    icon: "i-lucide-hard-drive-download",
                    disabled: isSaving.value,
                    onSelect: importVtxFile,
                },
                {
                    label: t("loadFromClipboard"),
                    icon: "i-lucide-clipboard-paste",
                    disabled: isSaving.value,
                    onSelect: importVtxClipboard
                },
            ],
        ]);

        const saveFileMenuItems = computed(() => [
            [
                {
                    label: t("saveToFile"),
                    icon: "i-lucide-hard-drive-upload",
                    disabled: isSaving.value,
                    onSelect: saveJsonFile,
                },
                {
                    label: t("vtxButtonSaveLua"),
                    icon: "i-lucide-file-code",
                    disabled: isSaving.value,
                    onSelect: saveLuaFile,
                },
            ],
        ]);

        const connection = useConnectionStore();
        const rulesTabReady = ref(false);
        const importBusy = ref(false);
        let alive = true;
        let statusInFlight: Promise<void> | null = null;

        onBeforeUnmount(() => { alive = false; });

        const mainVtxDirty = computed(
            () => !vtxConfigSaveDisabled.value || vtxPortChanged.value || allowVtxDirty.value,
        );

        async function drainStatus(): Promise<void> {
            if (statusInFlight) await statusInFlight;
        }

        function pollVtxStatus() {
            if (
                !alive || !connection.connectionValid ||
                connection.cliActive || rulesBusy.value || isSaving.value || statusInFlight
            ) return;

            if (!allowVtxLoaded.value) {
                void loadAllowVtxChange(); // после reconnect/reboot: синхронизируем тумблер с FC
            }

            const request = updateDeviceStatus();
            statusInFlight = request;
            void request.catch(error => {
                if (alive && connection.connectionValid) console.warn("VTX status:", error);
            }).finally(() => {
                if (statusInFlight === request) statusInFlight = null;
            });
        }
        function ruleChannelsFor(band: number) {
            if (!vtxConfig.vtx_table_available) {
                return Array.from({ length: MAX_BAND_CHANNELS_VALUES }, (_, i) => ({
                    value: i + 1, label: String(i + 1),
                }));
            }
            const freqs = bandList[band - 1]?.vtxtable_band_frequencies ?? [];
            return freqs.flatMap((freq, i) =>
                freq > 0 ? [{ value: i + 1, label: `${i + 1} (${freq} МГц)` }] : [],
            );
        }

        async function importVtx(action: () => Promise<unknown>) {
            if (rulesBusy.value || isSaving.value || importBusy.value || recoveryRequired.value) return;
            importBusy.value = true;
            try {
                await action();
            } finally {
                importBusy.value = false;
            }
        }

        const importVtxFile = () => importVtx(loadJsonFile);
        const importVtxClipboard = () => importVtx(loadClipboardJson);


        onMounted(async () => {
            await loadVtxConfig();
            if (!alive) return;

            await loadVtxPort();
            if (!alive) return;

            await loadOsdPort();
            if (!alive) return;

            await loadAllowVtxChange(); // состояние тумблера = текущее значение настройки на FC
            if (!alive) return;

            rulesTabReady.value = true;
            addInterval("vtx_device_status_pull", pollVtxStatus, 1000);
            i18n.localizePage();
        });


        const handleSave = () => {
            if (
                !rulesTabReady.value || !connection.connectionValid || connection.cliActive ||
                rulesBusy.value || isSaving.value || importBusy.value || recoveryRequired.value
            ) return;


            return runSave(async () => {
                await drainStatus();
                if (!(await confirmPortConflicts())) return;
                await saveVtx(writeVtxPort);
                await loadVtxConfig();
                await loadVtxPort();
                await loadOsdPort();
                // save перезапускает FC. Значение тумблера перечитается
                // после переподключения (см. watch в useVtxAllowChange).
                markAllowVtxSaved();
            });
        };


        // --- VTX Table count setters (with change tracking) ---

        function setTableBands(value: number | null) {
            const count = Math.min(MAX_BAND_VALUES, Math.max(0, Number.parseInt(String(value)) || 0));
            vtxConfig.vtx_table_bands = count;
            for (let i = 1; i <= count; i++) {
                ensureBandExists(i);
                ensureBandFrequencies(i, vtxConfig.vtx_table_channels);
            }
            onVtxTableChange();
        }

        function setTableChannels(value: number | null) {
            const count = Math.min(MAX_BAND_CHANNELS_VALUES, Math.max(0, Number.parseInt(String(value)) || 0));
            vtxConfig.vtx_table_channels = count;
            for (let i = 1; i <= vtxConfig.vtx_table_bands; i++) {
                ensureBandExists(i);
                ensureBandFrequencies(i, count);
            }
            onVtxTableChange();
        }

        function setTablePowerLevels(value: number | null) {
            const count = Math.min(MAX_POWERLEVEL_VALUES, Math.max(0, Number.parseInt(String(value)) || 0));
            vtxConfig.vtx_table_powerlevels = count;
            for (let i = 1; i <= count; i++) {
                ensurePowerLevelExists(i);
            }
            onVtxTableChange();
        }

        // --- Band table accessors ---

        function ensureBandExists(bandIdx: number) {
            const idx = bandIdx - 1;
            if (!bandList[idx]) {
                bandList[idx] = {
                    vtxtable_band_number: bandIdx,
                    vtxtable_band_name: "",
                    vtxtable_band_letter: "",
                    vtxtable_band_is_factory_band: false,
                    vtxtable_band_frequencies: [],
                };
            }
        }
        function ensureBandFrequencies(bandIdx: number, channelCount: number) {
            const freqs = bandList[bandIdx - 1].vtxtable_band_frequencies;
            while (freqs.length < channelCount) {
                freqs.push(0);
            }
        }

        function getBandName(bandIdx: number) {
            return bandList[bandIdx - 1]?.vtxtable_band_name ?? "";
        }

        function setBandName(bandIdx: number, value: string) {
            ensureBandExists(bandIdx);
            bandList[bandIdx - 1].vtxtable_band_name = value;
            onVtxTableChange();
        }

        function getBandLetter(bandIdx: number) {
            return bandList[bandIdx - 1]?.vtxtable_band_letter ?? "";
        }

        function setBandLetter(bandIdx: number, value: string) {
            ensureBandExists(bandIdx);
            bandList[bandIdx - 1].vtxtable_band_letter = value;
            onVtxTableChange();
        }

        function getBandFactory(bandIdx: number) {
            return bandList[bandIdx - 1]?.vtxtable_band_is_factory_band ?? false;
        }

        function setBandFactory(bandIdx: number, value: boolean) {
            ensureBandExists(bandIdx);
            bandList[bandIdx - 1].vtxtable_band_is_factory_band = value;
            onVtxTableChange();
        }

        function getBandChannelFreq(bandIdx: number, chIdx: number) {
            return bandList[bandIdx - 1]?.vtxtable_band_frequencies?.[chIdx - 1] ?? 0;
        }

        function setBandChannelFreq(bandIdx: number, chIdx: number, value: number | null) {
            ensureBandExists(bandIdx);
            const freqs = bandList[bandIdx - 1].vtxtable_band_frequencies;
            while (freqs.length < chIdx) {
                freqs.push(0);
            }
            freqs[chIdx - 1] = Number.parseInt(String(value)) || 0;
            onVtxTableChange();
        }

        // --- Power level table accessors ---

        function ensurePowerLevelExists(idx: number) {
            const i = idx - 1;
            if (!powerLevelList[i]) {
                powerLevelList[i] = {
                    vtxtable_powerlevel_number: idx,
                    vtxtable_powerlevel_value: 0,
                    vtxtable_powerlevel_label: "",
                };
            }
        }

        function getPowerLevelValue(idx: number) {
            return powerLevelList[idx - 1]?.vtxtable_powerlevel_value ?? 0;
        }

        function setPowerLevelValue(idx: number, value: number | null) {
            ensurePowerLevelExists(idx);
            powerLevelList[idx - 1].vtxtable_powerlevel_value = Number.parseInt(String(value)) || 0;
            onVtxTableChange();
        }

        function getPowerLevelLabel(idx: number) {
            return powerLevelList[idx - 1]?.vtxtable_powerlevel_label ?? "";
        }

        function setPowerLevelLabel(idx: number, value: string) {
            ensurePowerLevelExists(idx);
            powerLevelList[idx - 1].vtxtable_powerlevel_label = value;
            onVtxTableChange();
        }

        return {
            // State
            vtxPortAvailable,
            vtxPortWritable,
            allowVtxChangeWhileArmed,
            allowVtxSupported,
            allowVtxLoaded,
            vtxPortOptions,
            vtxPortIdentifier,
            vtxProtocol,
            vtxProtocolOptions,
            vtxPortFollowsOsd,
            vtxPortShown,
            savePending,
            factoryBandsSupported,
            frequencyMode,
            vtxConfig,
            deviceReady,
            vtxTypeString,
            saveButtonDisabled,
            isSaving,

            // Computed
            vtxSupported,
            vtxTableNotConfigured,
            factoryBandsNotSupported,
            bandOptions,
            channelOptions,
            powerOptions,
            lowPowerDisarmOptions,
            bandDescription,
            powerDescription,
            pitModeDescription,
            lowPowerDisarmDescription,
            deviceReadyText,
            bandGridStyle,
            powerGridStyle,
            loadMenuItems,
            saveFileMenuItems,

            // Actions
            handleSave,
            saveJsonFile,
            saveLuaFile,
            loadJsonFile,
            loadClipboardJson,
            onAllowVtxChange,

            // Table count setters
            setTableBands,
            setTableChannels,
            setTablePowerLevels,

            // Band table accessors
            getBandName,
            setBandName,
            getBandLetter,
            setBandLetter,
            getBandFactory,
            setBandFactory,
            getBandChannelFreq,
            setBandChannelFreq,

            // Power level table accessors
            getPowerLevelValue,
            setPowerLevelValue,
            getPowerLevelLabel,
            setPowerLevelLabel,

            rulesTabReady,
            rulesBusy,
            recoveryRequired,
            importBusy,
            mainVtxDirty,
            ruleChannelsFor,
            drainStatus,
            importVtxFile,

            // VTX Catalog
            selectedCatalogId,
            catalogSearch,
            catalogRangeFilter,
            catalogRangeOptions,
            filteredCatalogOptions,
            selectedCatalogEntry,
            selectedCatalogPhoto,
            applyCatalog,
        };
    },
});
</script>
