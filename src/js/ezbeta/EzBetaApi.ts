import { computeOptionFlagsHash } from "./catalog";

// Клиент Cloudflare Worker'а ezBeta. Все запросы идут на {baseUrl}.

export interface EzBetaAsset {
    id: number;
    name: string;
    size: number;
    created_at: string;
    updated_at: string;
}

export interface EzBetaRelease {
    tag_name: string;
    prerelease: boolean;
    published_at: string;
    assets: EzBetaAsset[];
}

export interface EzBetaTargets {
    unified: string[];
    legacy: string[];
    configsRepo: string;
    warnings: string[];
}

export interface EzBetaRun {
    id: number;
    status: string;
    conclusion: string | null;
    run_number: number;
    html_url: string;
    created_at: string;
}

export interface EzBetaBuildResult {
    data: string;
    filename: string;
}

export class EzBetaApi {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/+$/, "");
    }

    private fetch(path: string, init?: RequestInit): Promise<Response> {
        return fetch(this.baseUrl + path, init);
    }

    async listReleases(perPage = 50): Promise<EzBetaRelease[]> {
        const r = await this.fetch(`/releases?per_page=${perPage}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!Array.isArray(data)) throw new Error((data && data.error) || "invalid releases response");
        return data as EzBetaRelease[];
    }

    async listTargets(): Promise<EzBetaTargets> {
        const r = await this.fetch("/targets");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as EzBetaTargets;
    }

    async startBuild(config: string, version: string, options: string[]): Promise<void> {
        const r = await this.fetch("/build", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config, version, options }),
        });
        if (r.status === 204) return;
        const data = await r.json().catch(() => ({}));
        throw new Error((data && data.error) || `HTTP ${r.status}`);
    }

    async pollRuns(sinceIso: string): Promise<EzBetaRun[]> {
        const r = await this.fetch(`/runs?since=${encodeURIComponent(sinceIso)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        return (data && data.workflow_runs) || [];
    }

    assetUrl(assetId: number, name: string): string {
        return `${this.baseUrl}/asset?id=${assetId}&name=${encodeURIComponent(name)}`;
    }

    async downloadAssetAsText(asset: EzBetaAsset): Promise<string> {
        const r = await this.fetch(`/asset?id=${asset.id}&name=${encodeURIComponent(asset.name)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
    }

    /**
     * Основной сценарий: либо взять готовый hex из релиза, либо запустить сборку,
     * дождаться прогона и скачать свежий ассет.
     *
     * @param onStatus — вызывается при смене статуса сборки, чтобы прошивалка могла
     *                   обновить progress-лейбл («сборка запущена, ждём…»).
     */
    async buildOrDownload(
        version: string,
        config: string,
        options: string[],
        onStatus: (msg: string) => void,
    ): Promise<EzBetaBuildResult> {
        // Тот же хэш, что дописал CI в имя ассета: betaflight_..._<config>_<hash>.hex
        const hash = await computeOptionFlagsHash(options);
        const suffix = `_${config}_${hash}.hex`;
        onStatus(`Хэш опций: ${hash}. Ищу *${suffix} в релизе ${version}…`);

        // ---- 1. Точный матчинг по хэшу ----
        const releases = await this.listReleases(100);
        const release = releases.find((r) => r.tag_name === version);
        if (!release) throw new Error(`Релиз ${version} не найден в /releases`);

        const existing = release.assets.find((a) => a.name.endsWith(suffix));
        if (existing) {
            onStatus(`Найден ${existing.name} (${Math.round(existing.size / 1024)} KB), скачиваю…`);
            const data = await this.downloadAssetAsText(existing);
            return { data, filename: existing.name };
        }

        // ---- 2. Сборка ----
        const dispatchTime = new Date().toISOString();
        onStatus("HEX с этим набором опций ещё не собран — запускаю сборку…");
        await this.startBuild(config, version, options);

        const TIMEOUT_MS = 20 * 60 * 1000;
        const INTERVAL_MS = 15 * 1000;
        const startedAt = Date.now();
        let lastStatus = "";
        onStatus("Сборка запущена, ждём прогон…");

        while (Date.now() - startedAt < TIMEOUT_MS) {
            await sleep(INTERVAL_MS);
            let runs: EzBetaRun[];
            try {
                runs = await this.pollRuns(dispatchTime);
            } catch (e) {
                onStatus(`Ошибка опроса /runs: ${(e as Error).message}`);
                continue;
            }
            const run = runs[0];
            if (!run) {
                onStatus("Ждём появления прогона…");
                continue;
            }
            const status = `${run.status} / ${run.conclusion ?? "-"}`;
            if (status !== lastStatus) {
                onStatus(`Сборка #${run.run_number}: ${status}`);
                lastStatus = status;
            }
            if (run.status === "completed") {
                if (run.conclusion !== "success") {
                    throw new Error(`Сборка завершилась: ${run.conclusion}. ${run.html_url}`);
                }
                onStatus("Сборка успешна, перечитываю релиз…");
                const updated = await this.listReleases(100);
                const fresh = updated.find((r) => r.tag_name === version);
                if (!fresh) throw new Error("Релиз пропал после сборки");

                const asset = fresh.assets.find((a) => a.name.endsWith(suffix));
                if (!asset) {
                    // Крайне маловероятно, но возможно при расхождении каталога и workflow
                    throw new Error(
                        `Ассет *${suffix} не появился в релизе. ` +
                        `Проверьте, что build_options.json в ezBeta совпадает с catalog.ts.`,
                    );
                }
                onStatus(`Скачиваю ${asset.name}…`);
                const data = await this.downloadAssetAsText(asset);
                return { data, filename: asset.name };
            }
        }
        throw new Error("Таймаут ожидания сборки (20 мин)");
    }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));