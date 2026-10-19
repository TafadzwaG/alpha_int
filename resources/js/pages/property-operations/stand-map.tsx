import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    CircleCheck,
    Eye,
    EyeOff,
    Flag,
    LandPlot,
    Layers3,
    Map as MapIcon,
    MapPin,
    MapPinned,
    Minus,
    Plus,
    Search,
    SlidersHorizontal,
    Tags,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type StandStatus = 'planned' | 'available' | 'reserved' | 'allocated' | 'withdrawn';

type Stand = {
    id: number;
    standNo: string;
    status: StandStatus;
    area: number | null;
    price: number;
    currency: string;
    surveyReference: string | null;
    geometry: unknown | null;
    type: string | null;
    phaseId: number;
    phase: string;
    developmentId: number;
    development: string;
    developmentCode: string;
    location: string;
    allocatedTo: string | null;
    clientNumber: string | null;
    legalFlagged: boolean;
    legalCasesCount: number;
    legalPriority: string | null;
};

type Option = { value: string; label: string };
type PhaseOption = Option & { developmentId: string };

type Props = {
    stands: Stand[];
    developments: Option[];
    phases: PhaseOption[];
    filters: {
        search: string;
        development_id: string;
        phase_id: string;
        status: string;
        area_min: string;
        area_max: string;
        hide_allocated: boolean;
    };
    summary: {
        total: number;
        visible: number;
        available: number;
        allocated: number;
        reserved: number;
        withGeometry: number;
    };
};

type Parcel = Stand & { x: number; y: number; width: number; height: number; points?: string };
type MapGroup = { key: string; title: string; subtitle: string; y: number; height: number; stands: Parcel[] };
type ShadingMode = 'status' | 'price' | 'area' | 'legal';
type BasemapStyle = 'topographic' | 'light' | 'imagery';
type LegendItem = { label: string; color: string; description?: string };

const statusColors: Record<StandStatus, { fill: string; stroke: string }> = {
    available: { fill: '#76c893', stroke: '#17643a' },
    reserved: { fill: '#f4c95d', stroke: '#8a5b00' },
    planned: { fill: '#cbd5e1', stroke: '#526071' },
    allocated: { fill: '#66a6df', stroke: '#174f82' },
    withdrawn: { fill: '#e89595', stroke: '#8f2d2d' },
};

const graduatedPalettes = {
    price: ['#e8f1fb', '#bdd7ee', '#82b5dc', '#3e8cc5', '#0b5f9d'],
    area: ['#edf8e9', '#c7e9c0', '#7bc87c', '#31a354', '#0b6b35'],
};

const legalColors: Record<string, string> = {
    clear: '#d8e2ea',
    low: '#fee08b',
    medium: '#fdae61',
    high: '#f46d43',
    critical: '#a50026',
};

const statusBadge: Record<StandStatus, 'available' | 'reserved' | 'planned' | 'allocated' | 'withdrawn'> = {
    available: 'available',
    reserved: 'reserved',
    planned: 'planned',
    allocated: 'allocated',
    withdrawn: 'withdrawn',
};

function buildMap(stands: Stand[]): { groups: MapGroup[]; height: number } {
    const grouped = new Map<string, Stand[]>();
    stands.forEach((stand) => {
        const key = `${stand.developmentId}-${stand.phaseId}`;
        grouped.set(key, [...(grouped.get(key) ?? []), stand]);
    });

    let cursorY = 38;
    const groups = Array.from(grouped.entries()).map(([key, items]) => {
        const rings = items.map((stand) => geometryRing(stand.geometry));
        const geoCoordinates = rings.flatMap((ring) => ring ?? []);
        const hasSurveyGeometry = geoCoordinates.length > 0;
        const schematicCount = rings.filter((ring) => !ring).length;
        const rows = Math.max(1, Math.ceil((hasSurveyGeometry ? schematicCount : items.length) / 6));
        const groupHeight = hasSurveyGeometry ? 570 + rows * 112 : 106 + rows * 112;
        const y = cursorY;
        const xs = geoCoordinates.map(([x]) => x);
        const ys = geoCoordinates.map(([, coordinateY]) => coordinateY);
        const minX = xs.length ? Math.min(...xs) : 0;
        const maxX = xs.length ? Math.max(...xs) : 1;
        const minY = ys.length ? Math.min(...ys) : 0;
        const maxY = ys.length ? Math.max(...ys) : 1;
        const scaleX = (value: number) => 58 + ((value - minX) / Math.max(maxX - minX, Number.EPSILON)) * 908;
        const scaleY = (value: number) => y + 78 + ((maxY - value) / Math.max(maxY - minY, Number.EPSILON)) * 430;
        let schematicIndex = 0;
        const parcels = items.map((stand, index) => {
            const ring = rings[index];
            if (ring) {
                const projected = ring.map(([coordinateX, coordinateY]) => [scaleX(coordinateX), scaleY(coordinateY)] as const);
                const projectedXs = projected.map(([coordinateX]) => coordinateX);
                const projectedYs = projected.map(([, coordinateY]) => coordinateY);
                const x = Math.min(...projectedXs);
                const parcelY = Math.min(...projectedYs);

                return {
                    ...stand,
                    x,
                    y: parcelY,
                    width: Math.max(12, Math.max(...projectedXs) - x),
                    height: Math.max(12, Math.max(...projectedYs) - parcelY),
                    points: projected.map(([coordinateX, coordinateY]) => `${coordinateX},${coordinateY}`).join(' '),
                };
            }

            const position = schematicIndex++;
            return {
                ...stand,
                x: 52 + (position % 6) * 153,
                y: y + (hasSurveyGeometry ? 520 : 70) + Math.floor(position / 6) * 112,
                width: 126,
                height: 78,
            };
        });
        cursorY += groupHeight + 24;
        return {
            key,
            title: items[0]?.development ?? 'Development',
            subtitle: `${items[0]?.phase ?? 'Phase'} · ${items[0]?.location ?? 'Location not recorded'}`,
            y,
            height: groupHeight,
            stands: parcels,
        };
    });

    return { groups, height: Math.max(520, cursorY + 12) };
}

function geometryRing(geometry: unknown): number[][] | null {
    if (!geometry || typeof geometry !== 'object') return null;
    const candidate = geometry as { type?: string; coordinates?: unknown };
    const coordinates = candidate.coordinates;
    if (!Array.isArray(coordinates)) return null;
    const ring = candidate.type === 'MultiPolygon' ? coordinates[0]?.[0] : candidate.type === 'Polygon' ? coordinates[0] : null;
    if (!Array.isArray(ring) || ring.length < 3) return null;
    const normalized = ring.filter(
        (coordinate): coordinate is number[] =>
            Array.isArray(coordinate) && coordinate.length >= 2 && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]),
    );
    return normalized.length >= 3 ? normalized : null;
}

function money(amount: number, currency: string) {
    return new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function compactNumber(value: number) {
    return new Intl.NumberFormat('en-ZW', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function graduatedIndex(value: number, min: number, max: number) {
    if (max <= min) return 2;
    return Math.min(4, Math.floor(((value - min) / (max - min)) * 5));
}

function graduatedLegend(values: number[], palette: string[], format: (value: number) => string): LegendItem[] {
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return [{ label: format(min), color: palette[2] }];
    const step = (max - min) / 5;
    return palette.map((color, index) => {
        const lower = min + step * index;
        const upper = index === 4 ? max : min + step * (index + 1);
        return { label: `${format(lower)} – ${format(upper)}`, color };
    });
}

export default function StandMap({ stands, developments, phases, filters, summary }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [development, setDevelopment] = useState(filters.development_id);
    const [phase, setPhase] = useState(filters.phase_id);
    const [status, setStatus] = useState(filters.status);
    const [areaMin, setAreaMin] = useState(filters.area_min);
    const [areaMax, setAreaMax] = useState(filters.area_max);
    const [hideAllocated, setHideAllocated] = useState(filters.hide_allocated);
    const [selectedId, setSelectedId] = useState<number | null>(stands[0]?.id ?? null);
    const [shading, setShading] = useState<ShadingMode>('status');
    const [basemap, setBasemap] = useState<BasemapStyle>('topographic');
    const [showLabels, setShowLabels] = useState(true);
    const [zoom, setZoom] = useState(1);
    const { groups, height } = useMemo(() => buildMap(stands), [stands]);
    const selected = stands.find((stand) => stand.id === selectedId) ?? stands[0] ?? null;
    const filteredPhases = phases.filter((item) => development === 'all' || item.developmentId === development);
    const priceRange = useMemo(() => {
        const values = stands.map((stand) => stand.price).filter(Number.isFinite);
        return { min: values.length ? Math.min(...values) : 0, max: values.length ? Math.max(...values) : 0, values };
    }, [stands]);
    const areaRange = useMemo(() => {
        const values = stands.map((stand) => stand.area).filter((value): value is number => value !== null && Number.isFinite(value));
        return { min: values.length ? Math.min(...values) : 0, max: values.length ? Math.max(...values) : 0, values };
    }, [stands]);
    const legend = useMemo<LegendItem[]>(() => {
        if (shading === 'status') {
            return (['available', 'reserved', 'planned', 'allocated', 'withdrawn'] as StandStatus[]).map((item) => ({
                label: item[0].toUpperCase() + item.slice(1),
                color: statusColors[item].fill,
            }));
        }
        if (shading === 'price') {
            return graduatedLegend(priceRange.values, graduatedPalettes.price, (value) => compactNumber(value));
        }
        if (shading === 'area') {
            return graduatedLegend(areaRange.values, graduatedPalettes.area, (value) => `${Math.round(value)} m²`);
        }
        return [
            { label: 'No active case', color: legalColors.clear },
            { label: 'Low', color: legalColors.low },
            { label: 'Medium', color: legalColors.medium },
            { label: 'High', color: legalColors.high },
            { label: 'Critical', color: legalColors.critical },
        ];
    }, [areaRange.values, priceRange.values, shading]);

    const plotStyle = (stand: Stand) => {
        if (shading === 'price') {
            return {
                fill: graduatedPalettes.price[graduatedIndex(stand.price, priceRange.min, priceRange.max)],
                stroke: '#334155',
            };
        }
        if (shading === 'area') {
            const area = stand.area ?? areaRange.min;
            return {
                fill: graduatedPalettes.area[graduatedIndex(area, areaRange.min, areaRange.max)],
                stroke: '#334155',
            };
        }
        if (shading === 'legal') {
            return {
                fill: stand.legalFlagged ? (legalColors[stand.legalPriority ?? 'medium'] ?? legalColors.medium) : legalColors.clear,
                stroke: stand.legalFlagged ? '#7f1d1d' : '#64748b',
            };
        }
        return statusColors[stand.status];
    };

    const basemapFill = basemap === 'imagery' ? 'url(#imagery-basemap)' : basemap === 'light' ? '#edf0f2' : 'url(#topographic-basemap)';
    const groupFill = basemap === 'imagery' ? 'rgba(15, 45, 34, .72)' : basemap === 'light' ? 'rgba(255, 255, 255, .76)' : 'rgba(250, 249, 241, .82)';
    const groupStroke = basemap === 'imagery' ? '#9eb7a9' : '#94a3b8';
    const mapText = basemap === 'imagery' ? '#f8fafc' : '#172033';
    const mutedMapText = basemap === 'imagery' ? '#cbd5e1' : '#64748b';

    useEffect(() => {
        if (selectedId && stands.some((stand) => stand.id === selectedId)) return;
        setSelectedId(stands[0]?.id ?? null);
    }, [selectedId, stands]);

    const applyFilters = (event?: FormEvent) => {
        event?.preventDefault();
        router.get(
            '/administration/stands/map',
            {
                search: search || undefined,
                development_id: development === 'all' ? undefined : development,
                phase_id: phase === 'all' ? undefined : phase,
                status: status === 'all' ? undefined : status,
                area_min: areaMin || undefined,
                area_max: areaMax || undefined,
                hide_allocated: hideAllocated ? 1 : 0,
            },
            { preserveState: true, replace: true },
        );
    };

    const reset = () => {
        setSearch('');
        setDevelopment('all');
        setPhase('all');
        setStatus('all');
        setAreaMin('');
        setAreaMax('');
        setHideAllocated(true);
        router.get('/administration/stands/map', {}, { preserveState: true, replace: true });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/administration' },
        { title: 'Stands', href: '/administration/stands' },
        { title: 'Map', href: '/administration/stands/map' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Stands map" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration/stands">
                                <ArrowLeft data-icon="inline-start" /> Stand directory
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
                                <MapIcon className="size-5" aria-hidden="true" />
                            </span>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight">Stands map</h1>
                                <p className="text-muted-foreground mt-0.5">Visual inventory by development, phase and allocation status.</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                        {filters.hide_allocated ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        {filters.hide_allocated ? `${summary.allocated} allocated stands hidden` : 'Allocated stands are visible'}
                    </div>
                </header>

                <section aria-label="Map summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Visible on map', value: summary.visible, detail: `of ${summary.total} total stands`, icon: LandPlot },
                        { label: 'Available', value: summary.available, detail: 'Ready for allocation', icon: CircleCheck },
                        {
                            label: 'Allocated',
                            value: summary.allocated,
                            detail: filters.hide_allocated ? 'Hidden from this view' : 'Shown on this view',
                            icon: Building2,
                        },
                        { label: 'Survey geometry', value: summary.withGeometry, detail: 'Visible stands with GeoJSON', icon: Layers3 },
                    ].map(({ label, value, detail, icon: Icon }) => (
                        <Card key={label} className="ring-foreground/10 border-0 shadow-none ring-1">
                            <CardContent className="flex items-center gap-4 p-4">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    <Icon className="size-5" aria-hidden="true" />
                                </span>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
                                    <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
                                    <p className="text-muted-foreground text-xs">{detail}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                <Card>
                    <CardHeader className="border-b pb-4">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="text-muted-foreground size-4" />
                            <CardTitle className="text-base">Map filters</CardTitle>
                        </div>
                        <CardDescription>Allocated stands are excluded by default so the available inventory remains clear.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <form
                            onSubmit={applyFilters}
                            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(200px,1.4fr)_1fr_1fr_1fr_0.8fr_0.8fr_auto] 2xl:items-end"
                        >
                            <label className="grid gap-1.5 text-sm font-medium">
                                Find a stand
                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Stand or survey reference"
                                        className="pl-9"
                                    />
                                </div>
                            </label>
                            <label className="grid gap-1.5 text-sm font-medium">
                                Development
                                <Select
                                    value={development}
                                    onValueChange={(value) => {
                                        setDevelopment(value);
                                        setPhase('all');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All developments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All developments</SelectItem>
                                        {developments.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>
                            <label className="grid gap-1.5 text-sm font-medium">
                                Phase
                                <Select value={phase} onValueChange={setPhase}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All phases" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All phases</SelectItem>
                                        {filteredPhases.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>
                            <label className="grid gap-1.5 text-sm font-medium">
                                Status
                                <Select
                                    value={status}
                                    onValueChange={(value) => {
                                        setStatus(value);
                                        if (value === 'allocated') setHideAllocated(false);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        {(['available', 'reserved', 'planned', 'allocated', 'withdrawn'] as StandStatus[]).map((item) => (
                                            <SelectItem key={item} value={item} className="capitalize">
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>
                            <Field>
                                <FieldLabel htmlFor="map-area-min">Minimum area (m²)</FieldLabel>
                                <Input
                                    id="map-area-min"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={areaMin}
                                    onChange={(event) => setAreaMin(event.target.value)}
                                    placeholder="Any size"
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="map-area-max">Maximum area (m²)</FieldLabel>
                                <Input
                                    id="map-area-max"
                                    type="number"
                                    min={areaMin || '0'}
                                    step="0.01"
                                    inputMode="decimal"
                                    value={areaMax}
                                    onChange={(event) => setAreaMax(event.target.value)}
                                    placeholder="Any size"
                                />
                            </Field>
                            <div className="flex gap-2">
                                <Button type="submit">Apply</Button>
                                <Button type="button" variant="outline" onClick={reset}>
                                    Reset
                                </Button>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 md:col-span-2 xl:col-span-4 2xl:col-span-7">
                                <Checkbox
                                    checked={hideAllocated}
                                    onCheckedChange={(checked) => {
                                        setHideAllocated(checked === true);
                                        if (checked && status === 'allocated') setStatus('all');
                                    }}
                                />
                                <span className="text-sm font-medium">Hide allocated stands</span>
                                <span className="text-muted-foreground text-xs">Keeps sold or assigned plots off the working map.</span>
                            </label>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
                    <Card className="min-w-0 overflow-hidden py-0">
                        <CardHeader className="border-b bg-[#172338] py-4 text-white">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <MapPinned className="size-4 text-emerald-300" />
                                            <CardTitle className="text-white">Development plan</CardTitle>
                                            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Smart shading</Badge>
                                        </div>
                                        <CardDescription className="mt-1 max-w-2xl text-slate-300">
                                            ArcGIS-style thematic symbology for parcel status, price, area and legal exposure.
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center rounded-md border border-white/15 bg-black/15 p-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-white hover:bg-white/10 hover:text-white"
                                            disabled={zoom <= 1}
                                            onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}
                                            aria-label="Zoom out"
                                        >
                                            <Minus />
                                        </Button>
                                        <span className="w-14 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-white hover:bg-white/10 hover:text-white"
                                            disabled={zoom >= 2}
                                            onClick={() => setZoom((value) => Math.min(2, Number((value + 0.25).toFixed(2))))}
                                            aria-label="Zoom in"
                                        >
                                            <Plus />
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <label className="grid gap-1.5 text-xs font-medium text-slate-200">
                                        Shade parcels by
                                        <Select value={shading} onValueChange={(value) => setShading(value as ShadingMode)}>
                                            <SelectTrigger
                                                className="border-white text-slate-950 shadow-sm [&_svg]:text-slate-600 [&>span]:text-slate-950"
                                                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="status">Allocation status</SelectItem>
                                                <SelectItem value="price">Stand price</SelectItem>
                                                <SelectItem value="area">Stand area</SelectItem>
                                                <SelectItem value="legal">Legal exposure</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </label>
                                    <label className="grid gap-1.5 text-xs font-medium text-slate-200">
                                        Basemap
                                        <Select value={basemap} onValueChange={(value) => setBasemap(value as BasemapStyle)}>
                                            <SelectTrigger
                                                className="border-white text-slate-950 shadow-sm [&_svg]:text-slate-600 [&>span]:text-slate-950"
                                                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="topographic">Topographic</SelectItem>
                                                <SelectItem value="light">Light gray canvas</SelectItem>
                                                <SelectItem value="imagery">Aerial-inspired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </label>
                                    <div className="grid gap-1.5 text-xs font-medium text-slate-200">
                                        Display
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="justify-start border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                                            onClick={() => setShowLabels((value) => !value)}
                                        >
                                            <Tags data-icon="inline-start" /> {showLabels ? 'Plot labels on' : 'Plot labels off'}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-xs text-slate-100">
                                    <span className="font-semibold text-slate-300">Legend</span>
                                    {legend.map((item) => (
                                        <span key={item.label} className="flex items-center gap-1.5">
                                            <span className="size-3 rounded-sm border border-white/50" style={{ backgroundColor: item.color }} />
                                            {item.label}
                                        </span>
                                    ))}
                                    <span className="ml-auto flex items-center gap-1.5">
                                        <Flag className="size-3 fill-red-400 text-red-400" /> Active legal flag
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="relative max-h-[760px] overflow-auto bg-[#e7ebe4] p-0">
                            {stands.length ? (
                                <svg
                                    viewBox={`0 0 1024 ${height}`}
                                    className="block min-h-[520px] min-w-[900px] transition-[width] duration-200"
                                    style={{ width: `${zoom * 100}%` }}
                                    role="img"
                                    aria-label="Interactive stands map"
                                >
                                    <defs>
                                        <linearGradient id="topographic-basemap" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0" stopColor="#eef2df" />
                                            <stop offset="0.48" stopColor="#f6f1df" />
                                            <stop offset="1" stopColor="#dce8d8" />
                                        </linearGradient>
                                        <linearGradient id="imagery-basemap" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0" stopColor="#203c32" />
                                            <stop offset="0.5" stopColor="#526347" />
                                            <stop offset="1" stopColor="#273a31" />
                                        </linearGradient>
                                        <pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                                        </pattern>
                                        <pattern id="terrain-texture" width="72" height="72" patternUnits="userSpaceOnUse">
                                            <path
                                                d="M-8 18 C16 4 38 34 80 12 M-8 47 C22 25 46 67 80 42"
                                                fill="none"
                                                stroke="#4f6f5e"
                                                strokeOpacity="0.16"
                                                strokeWidth="1.2"
                                            />
                                            <circle cx="14" cy="57" r="2" fill="#41624f" fillOpacity="0.2" />
                                            <circle cx="54" cy="24" r="2.5" fill="#41624f" fillOpacity="0.18" />
                                        </pattern>
                                        <pattern id="imagery-texture" width="96" height="96" patternUnits="userSpaceOnUse">
                                            <path
                                                d="M0 18 L26 5 L51 22 L80 8 L96 16 V58 L72 70 L45 55 L14 76 L0 64 Z"
                                                fill="#89a072"
                                                fillOpacity="0.12"
                                            />
                                            <path d="M0 76 L28 62 L55 82 L83 59 L96 66 V96 H0 Z" fill="#1f3129" fillOpacity="0.28" />
                                        </pattern>
                                        <filter id="plot-shadow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.14" />
                                        </filter>
                                    </defs>
                                    <rect width="1024" height={height} fill={basemapFill} />
                                    {basemap === 'light' && <rect width="1024" height={height} fill="url(#map-grid)" className="text-slate-600" />}
                                    {basemap === 'topographic' && <rect width="1024" height={height} fill="url(#terrain-texture)" />}
                                    {basemap === 'imagery' && <rect width="1024" height={height} fill="url(#imagery-texture)" />}
                                    <g opacity={basemap === 'imagery' ? 0.42 : 0.58}>
                                        <path
                                            d={`M 0 118 C 210 76, 326 164, 512 112 S 812 58, 1024 104`}
                                            fill="none"
                                            stroke={basemap === 'imagery' ? '#9cc4dc' : '#8bbbd0'}
                                            strokeWidth="8"
                                        />
                                        <path
                                            d={`M 0 118 C 210 76, 326 164, 512 112 S 812 58, 1024 104`}
                                            fill="none"
                                            stroke="#e7f5fb"
                                            strokeWidth="2"
                                        />
                                    </g>
                                    {groups.map((group) => (
                                        <g key={group.key}>
                                            <rect
                                                x="22"
                                                y={group.y}
                                                width="980"
                                                height={group.height}
                                                rx="18"
                                                fill={groupFill}
                                                stroke={groupStroke}
                                                strokeWidth="1"
                                            />
                                            <text x="48" y={group.y + 30} fill={mapText} className="text-[18px] font-semibold">
                                                {group.title}
                                            </text>
                                            <text x="48" y={group.y + 50} fill={mutedMapText} className="text-[12px]">
                                                {group.subtitle}
                                            </text>
                                            <path d={`M 38 ${group.y + 60} H 986`} stroke={groupStroke} strokeDasharray="5 7" />
                                            {group.stands.map((stand) => {
                                                const active = selected?.id === stand.id;
                                                const style = plotStyle(stand);
                                                return (
                                                    <g
                                                        key={stand.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-label={`Stand ${stand.standNo}, ${stand.status}`}
                                                        onClick={() => setSelectedId(stand.id)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter' || event.key === ' ') setSelectedId(stand.id);
                                                        }}
                                                        className="cursor-pointer outline-none"
                                                    >
                                                        {stand.points ? (
                                                            <polygon
                                                                points={stand.points}
                                                                filter="url(#plot-shadow)"
                                                                fill={style.fill}
                                                                stroke={active ? '#111827' : style.stroke}
                                                                fillOpacity={basemap === 'imagery' ? 0.9 : 0.82}
                                                                className="transition-all duration-200 hover:brightness-95"
                                                                strokeWidth={active ? 4 : 2}
                                                            />
                                                        ) : (
                                                            <rect
                                                                x={stand.x}
                                                                y={stand.y}
                                                                width={stand.width}
                                                                height={stand.height}
                                                                rx="7"
                                                                filter="url(#plot-shadow)"
                                                                fill={style.fill}
                                                                stroke={active ? '#111827' : style.stroke}
                                                                fillOpacity={basemap === 'imagery' ? 0.9 : 0.82}
                                                                className="transition-all duration-200 hover:brightness-95"
                                                                strokeWidth={active ? 4 : 2}
                                                            />
                                                        )}
                                                        {showLabels && (
                                                            <text
                                                                x={stand.points ? stand.x + stand.width / 2 : stand.x + 12}
                                                                y={stand.points ? stand.y + stand.height / 2 : stand.y + 28}
                                                                textAnchor={stand.points ? 'middle' : 'start'}
                                                                className="pointer-events-none fill-slate-950 text-[14px] font-bold"
                                                                paintOrder="stroke"
                                                                stroke="rgba(255,255,255,.72)"
                                                                strokeWidth="3"
                                                                strokeLinejoin="round"
                                                            >
                                                                #{stand.standNo}
                                                            </text>
                                                        )}
                                                        {showLabels && !stand.points && (
                                                            <>
                                                                <text
                                                                    x={stand.x + 12}
                                                                    y={stand.y + 48}
                                                                    className="pointer-events-none fill-slate-700 text-[10px] capitalize"
                                                                >
                                                                    {stand.status}
                                                                </text>
                                                                <text
                                                                    x={stand.x + 12}
                                                                    y={stand.y + 64}
                                                                    className="pointer-events-none fill-slate-600 text-[9px]"
                                                                >
                                                                    {stand.area ? `${stand.area.toLocaleString()} m²` : stand.type}
                                                                </text>
                                                            </>
                                                        )}
                                                        {stand.legalFlagged && (
                                                            <>
                                                                <circle
                                                                    cx={stand.x + stand.width - 10}
                                                                    cy={stand.y + 11}
                                                                    r="11"
                                                                    className="fill-red-700 stroke-white"
                                                                    strokeWidth="2"
                                                                />
                                                                <text
                                                                    x={stand.x + stand.width - 10}
                                                                    y={stand.y + 15}
                                                                    textAnchor="middle"
                                                                    className="pointer-events-none fill-white text-[12px] font-bold"
                                                                >
                                                                    !
                                                                </text>
                                                            </>
                                                        )}
                                                        <title>{`Stand ${stand.standNo} · ${stand.status} · ${money(stand.price, stand.currency)}${stand.legalFlagged ? ` · LEGAL FLAG (${stand.legalCasesCount})` : ''}`}</title>
                                                    </g>
                                                );
                                            })}
                                            <rect
                                                x="38"
                                                y={group.y + group.height - 25}
                                                width="948"
                                                height="11"
                                                rx="5"
                                                fill={basemap === 'imagery' ? '#5b6670' : '#cbd5e1'}
                                            />
                                            <text
                                                x="512"
                                                y={group.y + group.height - 16}
                                                textAnchor="middle"
                                                fill={basemap === 'imagery' ? '#f8fafc' : '#475569'}
                                                className="text-[8px] font-semibold tracking-[0.25em]"
                                            >
                                                ACCESS ROAD
                                            </text>
                                        </g>
                                    ))}
                                    <g transform="translate(940 28)">
                                        <path d="M 16 0 L 28 34 L 16 28 L 4 34 Z" fill={basemap === 'imagery' ? '#f8fafc' : '#172033'} />
                                        <text
                                            x="16"
                                            y="48"
                                            textAnchor="middle"
                                            fill={basemap === 'imagery' ? '#f8fafc' : '#172033'}
                                            className="text-[11px] font-bold"
                                        >
                                            N
                                        </text>
                                    </g>
                                    <g transform={`translate(54 ${height - 48})`}>
                                        <rect width="148" height="5" fill={basemap === 'imagery' ? '#f8fafc' : '#172033'} />
                                        <rect x="74" width="74" height="5" fill={basemap === 'imagery' ? '#475569' : '#f8fafc'} />
                                        <text x="0" y="19" fill={basemap === 'imagery' ? '#f8fafc' : '#172033'} className="text-[9px] font-semibold">
                                            0
                                        </text>
                                        <text
                                            x="132"
                                            y="19"
                                            fill={basemap === 'imagery' ? '#f8fafc' : '#172033'}
                                            className="text-[9px] font-semibold"
                                        >
                                            plan scale
                                        </text>
                                    </g>
                                </svg>
                            ) : (
                                <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
                                    <MapPin className="text-muted-foreground mb-4 size-10" />
                                    <h2 className="text-lg font-semibold">No stands match these filters</h2>
                                    <p className="text-muted-foreground mt-1 max-w-md text-sm">
                                        Reset the map filters or show allocated stands to broaden the view.
                                    </p>
                                    <Button variant="outline" className="mt-4" onClick={reset}>
                                        Reset map
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="h-fit 2xl:sticky 2xl:top-5">
                        {selected ? (
                            <>
                                <CardHeader className="border-b">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardDescription>
                                                {selected.development} · {selected.phase}
                                            </CardDescription>
                                            <CardTitle className="mt-1 text-2xl">Stand {selected.standNo}</CardTitle>
                                        </div>
                                        <Badge variant={statusBadge[selected.status]} className="capitalize">
                                            {selected.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-5 pt-5">
                                    {selected.legalFlagged && (
                                        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-50">
                                            <div className="flex items-center gap-2 font-semibold">
                                                <Flag className="size-4 fill-current" /> Legal flag
                                            </div>
                                            <p className="mt-1 text-xs">
                                                {selected.legalCasesCount} active legal {selected.legalCasesCount === 1 ? 'case' : 'cases'} ·{' '}
                                                {selected.legalPriority ?? 'priority not set'} priority
                                            </p>
                                        </div>
                                    )}
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                                        <div>
                                            <dt className="text-muted-foreground text-xs">List price</dt>
                                            <dd className="mt-1 font-semibold">{money(selected.price, selected.currency)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground text-xs">Area</dt>
                                            <dd className="mt-1 font-semibold">
                                                {selected.area ? `${selected.area.toLocaleString()} m²` : 'Not recorded'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground text-xs">Stand type</dt>
                                            <dd className="mt-1 font-medium">{selected.type ?? 'Not recorded'}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground text-xs">Survey reference</dt>
                                            <dd className="mt-1 font-medium">{selected.surveyReference ?? 'Not recorded'}</dd>
                                        </div>
                                        <div className="col-span-2">
                                            <dt className="text-muted-foreground text-xs">Location</dt>
                                            <dd className="mt-1 font-medium">{selected.location ?? 'Not recorded'}</dd>
                                        </div>
                                        {selected.allocatedTo && (
                                            <div className="col-span-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                                                <dt className="text-xs text-blue-700 dark:text-blue-300">Allocated to</dt>
                                                <dd className="mt-1 font-semibold text-blue-950 dark:text-blue-50">{selected.allocatedTo}</dd>
                                                <dd className="text-xs text-blue-700 dark:text-blue-300">{selected.clientNumber}</dd>
                                            </div>
                                        )}
                                    </dl>
                                    <Button asChild className="w-full">
                                        <Link href={`/administration/stands/${selected.id}`}>
                                            <Eye data-icon="inline-start" /> Open stand details
                                        </Link>
                                    </Button>
                                </CardContent>
                            </>
                        ) : (
                            <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
                                <LandPlot className="text-muted-foreground mb-3 size-8" />
                                <p className="font-medium">Select a stand on the map</p>
                                <p className="text-muted-foreground mt-1 text-xs">Its price, size, type and allocation details will appear here.</p>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
