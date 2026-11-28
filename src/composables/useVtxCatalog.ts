import catalogJson from "../../vtxCatalog/catalog.json";

export interface VtxCatalogBand {
    name: string;
    letter: string;
    is_factory_band: boolean;
    frequencies: number[];
}

export interface VtxCatalogPowerLevel {
    value: number;
    label: string;
}

export interface VtxCatalogEntry {
    id: string;
    name: string;
    photo: string | null;
    vtx_band: number;
    vtx_channel: number;
    table: {
        description: string;
        version: string;
        vtx_table: {
            bands_list: VtxCatalogBand[];
            powerlevels_list: VtxCatalogPowerLevel[];
        };
    };
}

// Фото раздаются сборщиком как URL — резолвим по имени файла из пути записи
const photoModules = import.meta.glob("../../vtxCatalog/photos/*", {
    eager: true,
    query: "?url",
    import: "default",
}) as Record<string, string>;

export function useVtxCatalog() {
    const entries: VtxCatalogEntry[] =
        (catalogJson as { entries?: VtxCatalogEntry[] }).entries ?? [];

    function photoUrl(photo: string | null | undefined): string | null {
        if (!photo) return null;
        const fileName = photo.split("/").pop() ?? "";
        const key = Object.keys(photoModules).find(key => key.endsWith(`/${fileName}`));
        return key ? (photoModules[key] as string) : null;
    }

    return { entries, photoUrl };
}