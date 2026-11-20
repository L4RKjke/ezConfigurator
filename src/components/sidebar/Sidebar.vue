<template>
    <UNavigationMenu
        :items="visibleItems"
        orientation="vertical"
        :collapsed="isCompact"
        tooltip
        :ui="navMenuUi"
        class="sidebar-nav pb-2"
    />
    <div
        class="sidebar-footer flex flex-row gap-1 border-t border-default pt-2 mt-auto items-center justify-start flex-wrap"
        :class="{ 'sidebar-footer--compact': isCompact }"
    >
        <UTooltip :text="t('sidebarToggleExpertMode')" :delay-duration="300">
            <UButton
                icon="i-lucide-key"
                :variant="expertModeOn ? 'soft' : 'ghost'"
                :color="expertModeOn ? 'primary' : 'neutral'"
                size="xs"
                square
                :aria-label="t('sidebarToggleExpertMode')"
                :aria-pressed="expertModeOn"
                @click="toggleExpertMode"
            />
        </UTooltip>
        <UTooltip :text="isDark ? t('sidebarToggleLightMode') : t('sidebarToggleDarkMode')" :delay-duration="300">
            <UButton
                :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
                variant="ghost"
                color="neutral"
                square
                size="xs"
                :aria-label="isDark ? t('sidebarToggleLightMode') : t('sidebarToggleDarkMode')"
                @click="toggleDarkMode"
            />
        </UTooltip>
        <UTooltip :text="$t('sidebarSettingsMenu')" :delay-duration="300">
            <UDropdownMenu
                :items="settingsMenuItems"
                :content="{ side: 'top', align: 'start' }"
                :ui="{ content: 'z-3001' }"
            >
                <UButton
                    icon="i-lucide-settings"
                    variant="ghost"
                    color="neutral"
                    square
                    :aria-label="$t('sidebarSettingsMenu')"
                    size="xs"
                />
            </UDropdownMenu>
        </UTooltip>
    </div>
    <OptionsDialog v-model="optionsOpen" />
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from "vue";
import { useTranslation } from "i18next-vue";
import type { DropdownMenuItem } from "@nuxt/ui";
import { useVisibleTabs } from "./useVisibleTabs";
import { useNavigationStore } from "@/stores/navigation";
import { vueTabState } from "@/js/vue_tab_mounter.js";
import { switchTab } from "@/js/tab_switch.js";
import DarkTheme, { setDarkTheme } from "@/js/DarkTheme";
import { get as getConfig, set as setConfig } from "@/js/ConfigStorage";
import { applyExpertMode } from "@/js/utils/applyExpertMode";
import { isExpertModeEnabled } from "@/js/utils/isExpertModeEnabled";
import { EventBus } from "@/components/eventBus";
import OptionsDialog from "@/components/dialogs/OptionsDialog.vue";

const { t } = useTranslation();

const sidebarExpanded = inject("sidebarExpanded", ref(true));
const closeMobileSidebar = inject("closeMobileSidebar", () => {});
const isCompact = computed(() => !sidebarExpanded.value);
const navMenuUi = computed(() => {
    const linkBase = "data-active:before:bg-primary/10 cursor-pointer";
    return {
        link: isCompact.value ? `${linkBase} justify-center` : linkBase,
    };
});
const activeItems = useVisibleTabs();

const visibleItems = computed(() =>
    activeItems.value.map((item) => ({
        label: t(item.i18n),
        icon: item.icon,
        active: vueTabState.activeTabName === (item.tab ?? item.key),
        tooltip: { text: t(item.i18n) },
        onSelect: (event?: Event) => {
            event?.preventDefault?.();
            switchTab(item.tab ?? item.key, { mode: item.mode, label: t(item.i18n) });
            closeMobileSidebar();
        },
    })),
);

// Options dialog
const optionsOpen = ref(false);
const navigationStore = useNavigationStore();
watch(
    () => navigationStore.optionsDialogOpen,
    (val) => {
        if (val) {
            optionsOpen.value = true;
            navigationStore.optionsDialogOpen = false;
        }
    },
);

const settingsMenuItems = computed<DropdownMenuItem[][]>(() => [
    [
        { label: t("tabOptions"), icon: "i-lucide-sliders-horizontal", onSelect: () => (optionsOpen.value = true) },
        {
            label: t("tabLog"),
            icon: "i-lucide-file-text",
            onSelect: () => (navigationStore.logPanelOpen = !navigationStore.logPanelOpen),
        },
    ],
]);

// Re-sync isDark when the options dialog closes (user may have changed dark theme there).
watch(optionsOpen, (open) => {
    if (!open) {
        isDark.value = DarkTheme.enabled;
    }
});

// Dark mode toggle — seed from DarkTheme.configSetting (not reactive, update explicitly)
const isDark = ref(DarkTheme.enabled);

function toggleDarkMode() {
    const colorTheme = getConfig("colorTheme", "yellow").colorTheme ?? "yellow";
    if (colorTheme === "contrast") {
        return;
    }
    const newValue = isDark.value ? 1 : 0;
    isDark.value = !isDark.value;
    setDarkTheme(newValue);
    setConfig({ darkTheme: newValue });
}

// Expert mode toggle — reactive via EventBus
const expertModeOn = ref(isExpertModeEnabled());

const onExpertModeChange = (enabled: boolean) => {
    expertModeOn.value = enabled;
};

function toggleExpertMode() {
    const next = !isExpertModeEnabled();
    applyExpertMode(next);
    expertModeOn.value = next;
}


onMounted(() => {
    expertModeOn.value = isExpertModeEnabled();
    isDark.value = DarkTheme.enabled;
    EventBus.$on("expert-mode-change", onExpertModeChange);
});

onUnmounted(() => {
    EventBus.$off("expert-mode-change", onExpertModeChange);
});
</script>

<style lang="less">
/* Both rules style this component's own two root elements, by classes nothing else uses. */
.sidebar-nav {
    width: 100%;
}

.sidebar-footer--compact {
    flex-direction: column;
    align-items: center;
}
</style>
