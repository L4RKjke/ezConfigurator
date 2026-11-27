<template>
    <UApp :locale="uiLocale" :tooltip="{ delayDuration: 100 }" portal="#main-wrapper">
        <div class="app-wrapper">
            <div id="background" v-if="isMobileSidebarOpen" aria-hidden="true" @click="isRevealed = false"></div>
            <div id="side_menu_swipe"></div>
            <div id="tab-content-container">
                <div class="tab_container" :class="{ reveal: isMobileSidebarOpen }">
                    <Teleport to=".floating-connect" :disabled="!isCompactBreakpoint">
                        <ConnectButton />
                    </Teleport>
                    <Sidebar />
                    <div class="clear-both"></div>
                </div>
                <div id="content">
                    <keep-alive :include="keptAliveTabs">
                        <component
                            :is="activeTabComponent"
                            v-if="activeTabComponent"
                            :key="activeTabKey"
                            ref="activeTabInstance"
                        />
                    </keep-alive>
                </div>
            </div>
            <status-bar
                :port-usage-down="PortUsage.port_usage_down"
                :port-usage-up="PortUsage.port_usage_up"
                :connection-timestamp="CONNECTION.timestamp"
                :packet-error="connectionStore.packetErrors"
                :cycle-time="fcStore.config.cycleTime"
                :cpu-load="fcStore.config.cpuload"
                :cpu-temperature="fcStore.config.cpuTemp"
                :configurator-version="appInfo.displayVersion"
                :firmware-version="fcStore.config.flightControllerVersion"
                :firmware-target="fcStore.config.hardwareName"
            ></status-bar>
            <div id="cache">
                <div class="data-loading">
                    <p i18n="dataWaitingForData">Waiting for data ...</p>
                </div>
            </div>
        </div>
        <ConnectionFavicon />
        <GlobalDialogs />
        <LogPanel />
    </UApp>
</template>

<script setup lang="ts">
import { computed, nextTick, provide, reactive, ref, shallowRef, watch } from "vue";
import { onKeyStroke, useMediaQuery } from "@vueuse/core";
import ConnectButton from "./components/device-picker/ConnectButton.vue";
import GlobalDialogs from "./components/dialogs/GlobalDialogs.vue";
import LogPanel from "./components/log/LogPanel.vue";
import Sidebar from "./components/sidebar/Sidebar.vue";
import PortUsageModule from "./js/port_usage";
import { useUiLocale } from "./composables/useUiLocale";
import { useFlightControllerStore } from "./stores/fc";
import { useConnectionStore } from "./stores/connection";
import { useAppInfoStore } from "./stores/appInfo";
import {
    completeVueTabMount,
    tabAdapterRegistration,
    TAB_ADAPTER_REGISTRATION_KEY,
    vueTabState,
} from "./js/vue_tab_mounter.js";
import { VueTabComponents } from "./js/vue_tab_registry";
import ConnectionFavicon from "./components/ConnectionFavicon.vue";


// Tests or unusual entry points may run without init.js; init.js overwrites this synchronously after its model exists.
if (!window.vm) {
    window.vm = reactive({ expertMode: false });
}

// Stable fallback so computed() does not allocate a new reactive per evaluation when window.vm.CONNECTION is missing.
const connectionFallback = reactive({ timestamp: null });

// Track latest window.vm so computeds re-run when it is reassigned (import order vs. init.js).
const syncedVm = shallowRef(window.vm);

// Intercept future assignments to window.vm so syncedVm stays in sync
// without needing side effects inside computed getters.
let _windowVm = window.vm;
Object.defineProperty(window, "vm", {
    get: () => _windowVm,
    set: (v) => {
        _windowVm = v;
        syncedVm.value = v;
    },
    configurable: true,
    enumerable: true,
});

function currentVm() {
    return syncedVm.value;
}

const fcStore = useFlightControllerStore();
const connectionStore = useConnectionStore();
const appInfo = useAppInfoStore();
const PortUsage = computed(() => currentVm()?.PortUsage ?? PortUsageModule);
const CONNECTION = computed(() => currentVm()?.CONNECTION ?? connectionFallback);

// Nuxt UI needs its own locale to pick up the text direction and translate its built-in
// strings; without it every element renders LTR and in English (see issue #5482).
const uiLocale = useUiLocale();

const activeTabInstance = ref(null);

const isRevealed = ref(false);
const sidebarNarrow = useMediaQuery("(max-width: 1055px)");
const isCompactBreakpoint = useMediaQuery(
    "(max-width: 575px), (max-width: 950px) and (max-height: 500px) and (orientation: landscape)",
);
const isMobileSidebarOpen = computed(() => isCompactBreakpoint.value && isRevealed.value);
const isSidebarExpanded = computed(() => !sidebarNarrow.value || isRevealed.value);

// Escape closes the open drawer, the keyboard equivalent of a click on the backdrop. The backdrop
// itself cannot take focus, so the listener is on the window; onKeyStroke removes it on unmount.
onKeyStroke("Escape", () => {
    if (isMobileSidebarOpen.value) {
        isRevealed.value = false;
    }
}); 

provide("toggleMobileSidebar", () => {
    isRevealed.value = !isRevealed.value;
});
provide("sidebarExpanded", isSidebarExpanded);
provide("closeMobileSidebar", () => {
    if (isCompactBreakpoint.value) {
        isRevealed.value = false;
    }
});

const activeTabComponent = computed(() => {
    const tabName = vueTabState.activeTabName;
    return tabName ? (VueTabComponents[tabName as keyof typeof VueTabComponents] ?? null) : null;
});

// Tabs that keep their state (and heavy resources) alive across switches rather than being torn
// down. Matched by component name.
const keptAliveTabs = ["BlackboxViewerTab"];

// The mounter bumps activeTabKey on every switch to force a fresh instance. Kept-alive tabs need
// a stable key instead, or keep-alive caches by an ever-changing key and never restores.
const activeTabKey = computed(() =>
    vueTabState.activeTabName === "blackbox_viewer" ? "blackbox_viewer" : vueTabState.activeTabKey,
);

provide("betaflightModel", currentVm());
provide(TAB_ADAPTER_REGISTRATION_KEY, tabAdapterRegistration);

watch(
    () => vueTabState.activeTabKey,
    async () => {
        if (!vueTabState.activeTabName) {
            return;
        }

        await nextTick();
        completeVueTabMount(activeTabInstance.value);
    },
    { flush: "post" },
);
</script>

<style lang="less">
@keyframes app-spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}
</style>

<style>
/* Main app content wrapper - flex column to push status bar to bottom */
.app-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0; /* Allow flex children to shrink below content size */
}

/* Legacy cache node is required by some code paths but should never be visible in Vue UI */
#cache {
    display: none;
}

/* Compact only: a round, always-reachable account button over the content, matching the
   floating status bar at the other end of the screen. */
.floating-connect {
    display: none;
    position: fixed;
    top: calc(0.5rem + var(--bf-inset-top));
    right: 0.75rem;
    z-index: 2002;
    max-width: 62vw;
    border-radius: 9999px;
    border: 1px solid var(--surface-200);
    background-color: color-mix(in srgb, var(--surface-100) 82%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: var(--shadow-chrome-floating);
    overflow: hidden;
}

.floating-account {
    display: none;
    position: fixed;
    top: calc(0.5rem + var(--bf-inset-top));
    left: 0.75rem;
    z-index: 2002;
    border-radius: 9999px;
    border: 1px solid var(--surface-200);
    background-color: color-mix(in srgb, var(--surface-100) 82%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: var(--shadow-chrome-floating);
}

@media all and (max-width: 575px), all and (max-width: 950px) and (max-height: 500px) and (orientation: landscape) {
    .floating-account,
    .floating-connect {
        display: block;
    }
    /* Reserve space for the floating controls at both ends of the content. */
    #content {
        padding-top: var(--bf-inset-top);
        padding-bottom: calc(5.75rem + var(--bf-inset-bottom));
    }
}
</style>
