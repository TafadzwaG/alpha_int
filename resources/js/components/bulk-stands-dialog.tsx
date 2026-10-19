import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { type SharedData } from '@/types';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, ClipboardPaste, Download, FileSpreadsheet, Layers, Plus, Trash2, UploadCloud } from 'lucide-react';
import { DragEvent, FormEvent, useMemo, useState } from 'react';

type Option = { value: string | number | boolean; label: string };
type CaptureMode = 'paste' | 'upload' | 'manual';
type BulkStandRow = {
    source_row?: number;
    stand_no: string;
    area_sqm: string;
    list_price: string;
    survey_reference: string;
};
type PreviewRow = {
    source_row: number;
    stand_no: string;
    area_sqm: number | null;
    list_price: number | null;
    effective_list_price: number;
    survey_reference: string;
    duplicate: boolean;
    existing: boolean;
    valid: boolean;
    errors: string[];
};
type StandBulkPreview = {
    valid: boolean;
    filename?: string | null;
    issues: string[];
    summary: { total: number; valid: number; invalid: number; duplicates: number; existing: number };
    rows: PreviewRow[];
    preview_token?: string;
    preview_expires_at?: string;
};
type StandBulkPageProps = SharedData & { bulkStandPreview?: StandBulkPreview | null };
type PreviewForm = {
    source_mode: CaptureMode;
    phase_id: string;
    stand_type_id: string;
    currency_code: string;
    physical_status: string;
    shared_list_price: string;
    workbook: File | null;
    stands: BulkStandRow[];
};

const blank = (): BulkStandRow => ({ stand_no: '', area_sqm: '', list_price: '', survey_reference: '' });

function normalizedHeader(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replaceAll('²', '2')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

function headerKey(value: string): keyof BulkStandRow | null {
    const header = normalizedHeader(value);
    if (['stand', 'stand_no', 'stand_number', 'stand_num', 'stand_id'].includes(header)) return 'stand_no';
    if (['area', 'area_m', 'area_m2', 'area_sqm', 'sqm', 'square_metres', 'square_meters', 'stand_size'].includes(header)) return 'area_sqm';
    if (['price', 'list_price', 'stand_price'].includes(header)) return 'list_price';
    if (['survey', 'survey_ref', 'survey_reference'].includes(header)) return 'survey_reference';
    return null;
}

function parsePastedRows(text: string): BulkStandRow[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 501);
    if (!lines.length) return [];

    const matrix = lines.map((line) => line.split('\t').map((cell) => cell.trim()));
    const headerIndexes = new Map<keyof BulkStandRow, number>();
    matrix[0].forEach((cell, index) => {
        const key = headerKey(cell);
        if (key) headerIndexes.set(key, index);
    });
    const hasHeader = headerIndexes.has('stand_no') || headerIndexes.has('area_sqm');
    const start = hasHeader ? 1 : 0;

    return matrix.slice(start).map((cells, index) => {
        const value = (key: keyof BulkStandRow, fallbackIndex: number) => cells[headerIndexes.get(key) ?? fallbackIndex] ?? '';
        return {
            source_row: index + start + 1,
            stand_no: value('stand_no', 0),
            area_sqm: value('area_sqm', 1),
            list_price: value('list_price', 2),
            survey_reference: value('survey_reference', 3),
        };
    });
}

export default function BulkStandsDialog({ options }: { options: Record<string, Option[]> }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<CaptureMode>('paste');
    const [step, setStep] = useState<'capture' | 'preview'>('capture');
    const [pasteText, setPasteText] = useState('');
    const [manualRows, setManualRows] = useState<BulkStandRow[]>([blank(), blank(), blank()]);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<StandBulkPreview | null>(null);
    const previewForm = useForm<PreviewForm>({
        source_mode: 'paste',
        phase_id: '',
        stand_type_id: '',
        currency_code: 'USD',
        physical_status: 'planned',
        shared_list_price: '',
        workbook: null,
        stands: [],
    });
    const importForm = useForm({ preview_token: '' });
    const pastedRows = useMemo(() => parsePastedRows(pasteText), [pasteText]);
    const busy = previewForm.processing || importForm.processing;

    const reset = () => {
        setMode('paste');
        setStep('capture');
        setPasteText('');
        setManualRows([blank(), blank(), blank()]);
        setFile(null);
        setPreview(null);
        previewForm.reset();
        previewForm.clearErrors();
        importForm.reset();
        importForm.clearErrors();
    };

    const close = () => {
        setOpen(false);
        reset();
    };

    const updateFile = (next: File | null) => {
        previewForm.clearErrors('workbook');
        if (next && (!next.name.toLowerCase().endsWith('.xlsx') || next.size > 20 * 1024 * 1024)) {
            previewForm.setError('workbook', next.size > 20 * 1024 * 1024 ? 'The workbook must not exceed 20 MB.' : 'Choose an XLSX workbook.');
            return;
        }
        setFile(next);
        previewForm.setData('workbook', next);
    };

    const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        updateFile(event.dataTransfer.files.item(0));
    };

    const submitPreview = (event: FormEvent) => {
        event.preventDefault();
        const rows = mode === 'paste' ? pastedRows : mode === 'manual' ? manualRows.filter((row) => Object.values(row).some(Boolean)) : [];
        previewForm.transform((data) => ({ ...data, source_mode: mode, workbook: mode === 'upload' ? file : null, stands: rows }));
        previewForm.post('/administration/stands/bulk/preview', {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: (nextPage) => {
                const result = (nextPage.props as unknown as StandBulkPageProps).bulkStandPreview;
                if (!result) return;
                setPreview(result);
                setStep('preview');
                importForm.setData('preview_token', result.preview_token ?? '');
            },
        });
    };

    const importPreview = () => {
        if (!preview?.valid || !preview.preview_token) return;
        importForm.post('/administration/stands/bulk', {
            preserveScroll: true,
            onSuccess: () => {
                close();
            },
        });
    };

    const selectField = (key: 'phase_id' | 'stand_type_id' | 'currency_code' | 'physical_status', label: string, choices: Option[]) => (
        <Field data-invalid={Boolean(previewForm.errors[key]) || undefined}>
            <FieldLabel htmlFor={`bulk-${key}`}>{label}</FieldLabel>
            <Select value={previewForm.data[key]} onValueChange={(value) => previewForm.setData(key, value)}>
                <SelectTrigger id={`bulk-${key}`} className="w-full" aria-invalid={Boolean(previewForm.errors[key]) || undefined}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {choices.map((option) => (
                            <SelectItem key={String(option.value)} value={String(option.value)}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            <FieldError>{previewForm.errors[key]}</FieldError>
        </Field>
    );

    const modes: Array<{ value: CaptureMode; label: string; description: string; icon: typeof ClipboardPaste }> = [
        { value: 'paste', label: 'Paste from Excel', description: 'Fastest for large registers', icon: ClipboardPaste },
        { value: 'upload', label: 'Upload Excel', description: 'Use the XLSX template', icon: FileSpreadsheet },
        { value: 'manual', label: 'Manual entry', description: 'Best for a few stands', icon: Plus },
    ];

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (busy) return;
                setOpen(value);
                if (!value) reset();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Layers data-icon="inline-start" />
                    Bulk add stands
                </Button>
            </DialogTrigger>
            <DialogContent
                showCloseButton={!busy}
                className="bg-popover ring-foreground/10 max-h-[calc(100vh-2rem)] gap-0 overflow-y-auto rounded-xl border-0 p-0 shadow-md ring-1 sm:max-w-6xl"
            >
                <DialogHeader className="border-b px-6 py-5">
                    <DialogTitle>Bulk record stands</DialogTitle>
                    <DialogDescription>
                        Capture up to 500 stands, validate every row, then confirm the exact batch that will be saved.
                    </DialogDescription>
                </DialogHeader>

                {step === 'capture' ? (
                    <form onSubmit={submitPreview} className="flex flex-col gap-6 px-6 py-5" encType="multipart/form-data">
                        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            {selectField('phase_id', 'Development phase', options['development-phases'] ?? [])}
                            {selectField('stand_type_id', 'Stand type', options['stand-types'] ?? [])}
                            {selectField('currency_code', 'Currency', options.currencies ?? [])}
                            {selectField(
                                'physical_status',
                                'Initial status',
                                ['planned', 'available', 'reserved', 'allocated', 'withdrawn'].map((value) => ({
                                    value,
                                    label: value[0].toUpperCase() + value.slice(1),
                                })),
                            )}
                            <Field data-invalid={Boolean(previewForm.errors.shared_list_price) || undefined}>
                                <FieldLabel htmlFor="bulk-shared-list-price">Shared list price</FieldLabel>
                                <Input
                                    id="bulk-shared-list-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={previewForm.data.shared_list_price}
                                    aria-invalid={Boolean(previewForm.errors.shared_list_price) || undefined}
                                    onChange={(event) => previewForm.setData('shared_list_price', event.target.value)}
                                />
                                <FieldDescription>Optional for planned stands.</FieldDescription>
                                <FieldError>{previewForm.errors.shared_list_price}</FieldError>
                            </Field>
                        </FieldGroup>

                        <div className="grid gap-3 md:grid-cols-3">
                            {modes.map((item) => {
                                const Icon = item.icon;
                                const active = mode === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        className={`cursor-pointer rounded-lg border p-4 text-left transition-colors ${active ? 'border-primary bg-primary/5 ring-primary/15 ring-2' : 'hover:bg-muted/50'}`}
                                        onClick={() => {
                                            setMode(item.value);
                                            previewForm.clearErrors('workbook', 'stands');
                                        }}
                                    >
                                        <span className="flex items-center gap-2 font-medium">
                                            <Icon aria-hidden="true" className="size-4" /> {item.label}
                                        </span>
                                        <span className="text-muted-foreground mt-1 block text-xs">{item.description}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {mode === 'paste' && (
                            <Field data-invalid={Boolean(previewForm.errors.stands) || undefined}>
                                <FieldLabel htmlFor="bulk-stand-paste">Stand register</FieldLabel>
                                <FieldDescription>
                                    Copy columns from Excel and paste them below. Use this order: Stand Number, Area (m²), List Price, Survey
                                    Reference. A header row is optional.
                                </FieldDescription>
                                <Textarea
                                    id="bulk-stand-paste"
                                    className="min-h-48 font-mono text-xs"
                                    value={pasteText}
                                    onChange={(event) => setPasteText(event.target.value)}
                                />
                                <div className="text-muted-foreground flex items-center justify-between text-xs">
                                    <span>{pastedRows.length.toLocaleString()} rows detected</span>
                                    <span>Maximum 500</span>
                                </div>
                                <FieldError>{previewForm.errors.stands}</FieldError>
                            </Field>
                        )}

                        {mode === 'upload' && (
                            <Field data-invalid={Boolean(previewForm.errors.workbook) || undefined}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <FieldLabel htmlFor="bulk-stand-workbook">Stand workbook</FieldLabel>
                                        <FieldDescription>Upload an XLSX file containing Stand Number and Area (m²).</FieldDescription>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" asChild>
                                        <a href="/administration/stands/bulk/template">
                                            <Download data-icon="inline-start" /> Download template
                                        </a>
                                    </Button>
                                </div>
                                <label
                                    htmlFor="bulk-stand-workbook"
                                    className="hover:bg-muted/40 border-input flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition-colors"
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={handleDrop}
                                >
                                    <UploadCloud aria-hidden="true" className="text-primary mb-3 size-8" />
                                    <span className="font-medium">{file ? file.name : 'Drop an XLSX workbook here or browse'}</span>
                                    <span className="text-muted-foreground mt-1 text-xs">Maximum 20 MB and 500 stand rows</span>
                                    <input
                                        id="bulk-stand-workbook"
                                        type="file"
                                        className="sr-only"
                                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onChange={(event) => updateFile(event.target.files?.item(0) ?? null)}
                                    />
                                </label>
                                <FieldError>{previewForm.errors.workbook}</FieldError>
                            </Field>
                        )}

                        {mode === 'manual' && (
                            <Field>
                                <FieldLabel>Stand rows</FieldLabel>
                                <FieldDescription>
                                    Use manual entry for small batches. Paste from Excel or upload the template for large registers.
                                </FieldDescription>
                                <div className="max-h-80 overflow-auto rounded-lg border">
                                    <Table pagination={false}>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Stand number *</TableHead>
                                                <TableHead>Area (m²) *</TableHead>
                                                <TableHead>List price</TableHead>
                                                <TableHead>Survey reference</TableHead>
                                                <TableHead className="w-12">
                                                    <span className="sr-only">Remove</span>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {manualRows.map((row, index) => (
                                                <TableRow key={index}>
                                                    {(['stand_no', 'area_sqm', 'list_price', 'survey_reference'] as const).map((key) => (
                                                        <TableCell key={key}>
                                                            <Input
                                                                aria-label={`${key.replaceAll('_', ' ')} row ${index + 1}`}
                                                                type={key === 'area_sqm' || key === 'list_price' ? 'number' : 'text'}
                                                                step="0.01"
                                                                min={key === 'area_sqm' ? '0.01' : key === 'list_price' ? '0' : undefined}
                                                                value={row[key]}
                                                                onChange={(event) =>
                                                                    setManualRows((current) =>
                                                                        current.map((item, itemIndex) =>
                                                                            itemIndex === index ? { ...item, [key]: event.target.value } : item,
                                                                        ),
                                                                    )
                                                                }
                                                            />
                                                        </TableCell>
                                                    ))}
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={manualRows.length === 1}
                                                            onClick={() =>
                                                                setManualRows((current) => current.filter((_, itemIndex) => itemIndex !== index))
                                                            }
                                                        >
                                                            <Trash2 aria-hidden="true" />
                                                            <span className="sr-only">Remove row {index + 1}</span>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setManualRows((current) => [...current, blank()])}
                                    >
                                        <Plus data-icon="inline-start" /> Add row
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={manualRows.length > 490}
                                        onClick={() => setManualRows((current) => [...current, ...Array.from({ length: 10 }, blank)])}
                                    >
                                        <Plus data-icon="inline-start" /> Add 10 rows
                                    </Button>
                                </div>
                                <FieldError>{previewForm.errors.stands}</FieldError>
                            </Field>
                        )}

                        <DialogFooter className="bg-muted/50 -mx-6 mt-1 -mb-5 border-t px-6 py-4">
                            <Button type="button" variant="outline" disabled={busy} onClick={close}>
                                Cancel
                            </Button>
                            <Button disabled={busy}>{previewForm.processing ? 'Validating...' : 'Validate and preview'}</Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="flex flex-col gap-5 px-6 py-5">
                        <div className="grid gap-3 sm:grid-cols-5">
                            {[
                                ['Rows', preview?.summary.total ?? 0],
                                ['Valid', preview?.summary.valid ?? 0],
                                ['Invalid', preview?.summary.invalid ?? 0],
                                ['Duplicates', preview?.summary.duplicates ?? 0],
                                ['Already registered', preview?.summary.existing ?? 0],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="bg-card rounded-lg border p-3">
                                    <p className="text-muted-foreground text-xs">{label}</p>
                                    <p className="mt-1 text-xl font-semibold tabular-nums">{Number(value).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        {preview?.valid ? (
                            <Alert className="border-emerald-600/30 bg-emerald-500/5">
                                <CheckCircle2 aria-hidden="true" className="text-emerald-700" />
                                <AlertTitle>Ready to import</AlertTitle>
                                <AlertDescription>
                                    All {preview.summary.total.toLocaleString()} rows passed validation. Nothing has been saved yet.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <AlertTriangle aria-hidden="true" />
                                <AlertTitle>Resolve validation issues</AlertTitle>
                                <AlertDescription>
                                    {preview?.issues.length
                                        ? preview.issues.join(' ')
                                        : 'Correct the highlighted rows, then validate the batch again.'}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="max-h-[48vh] overflow-auto rounded-lg border">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Row</TableHead>
                                        <TableHead>Stand number</TableHead>
                                        <TableHead>Area (m²)</TableHead>
                                        <TableHead>List price</TableHead>
                                        <TableHead>Survey reference</TableHead>
                                        <TableHead>Validation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(preview?.rows ?? []).map((row, index) => (
                                        <TableRow
                                            key={`${row.source_row}-${row.stand_no}-${index}`}
                                            className={row.valid ? undefined : 'bg-destructive/5'}
                                        >
                                            <TableCell className="tabular-nums">{row.source_row}</TableCell>
                                            <TableCell className="font-medium">{row.stand_no || '—'}</TableCell>
                                            <TableCell className="tabular-nums">{row.area_sqm?.toLocaleString() ?? '—'}</TableCell>
                                            <TableCell className="tabular-nums">
                                                {row.effective_list_price.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                                {row.list_price === null && (
                                                    <span className="text-muted-foreground ml-1 text-xs">shared/default</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{row.survey_reference || '—'}</TableCell>
                                            <TableCell className="min-w-64">
                                                {row.valid ? (
                                                    <Badge className="bg-emerald-700 text-white">Valid</Badge>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <Badge variant="destructive" className="w-fit">
                                                            Invalid
                                                        </Badge>
                                                        {row.errors.map((error) => (
                                                            <span key={error} className="text-destructive text-xs">
                                                                {error}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <FieldError>{importForm.errors.preview_token}</FieldError>
                        <DialogFooter className="bg-muted/50 -mx-6 -mb-5 border-t px-6 py-4">
                            <Button type="button" variant="outline" disabled={busy} onClick={() => setStep('capture')}>
                                Back to edit
                            </Button>
                            <Button type="button" disabled={!preview?.valid || !preview.preview_token || busy} onClick={importPreview}>
                                {importForm.processing ? 'Importing...' : `Import ${preview?.summary.total ?? 0} stands`}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
