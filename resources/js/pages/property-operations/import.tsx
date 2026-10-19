import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, FileCheck2, FileSpreadsheet, Info, Layers, MapPin, Receipt, Upload, UploadCloud, Users, X } from 'lucide-react';
import { type DragEvent, type FormEvent, useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string; branchIds?: string[]; phaseIds?: string[] };
type ImportIssue = { level: 'error' | 'warning'; sheet: string; row: number | null; message: string };
type PreviewRow = Record<string, string | number | null>;
type ImportResult = {
    mode: 'validate' | 'import';
    filename: string;
    valid: boolean;
    imported?: boolean;
    preview_token?: string;
    preview_expires_at?: string;
    recognized_sheets: string[];
    ignored_sheets: string[];
    counts: Record<string, number>;
    preview: Record<string, PreviewRow[]>;
    context?: Record<string, string>;
    issues: ImportIssue[];
};
type Props = {
    branches: Option[];
    phases: Option[];
    standTypes: Option[];
    currencies: Option[];
    paymentMethods: Option[];
    defaults: { branch_id: string; currency_code: string };
    importResult: ImportResult | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Property operations', href: '/administration/stand-allocations' },
    { title: 'Import workbook', href: '/administration/data-import' },
];
const countLabels: Record<string, string> = {
    rows: 'Rows detected',
    clients: 'Clients',
    stands: 'Stands',
    allocations: 'Allocations',
    charges: 'Charges',
    payments: 'Payments',
    receipts: 'Receipts',
    waiting_list: 'Waiting list',
    double_allocations: 'Double allocations',
};
const previewSections: Array<{ key: string; title: string; columns: Array<[string, string]> }> = [
    {
        key: 'on_ground',
        title: 'On ground',
        columns: [
            ['row', 'Row'],
            ['stand_no', 'Stand'],
            ['first_name', 'First name'],
            ['surname', 'Surname'],
            ['contacts', 'Contact'],
            ['stand_price', 'Stand price'],
            ['amount_paid', 'Amount paid'],
            ['balance', 'Balance'],
        ],
    },
    {
        key: 'double_allocation',
        title: 'Double allocation',
        columns: [
            ['row', 'Row'],
            ['stand_no', 'Stand'],
            ['first_name', 'First name'],
            ['surname', 'Surname'],
            ['contacts', 'Contact'],
            ['stand_price', 'Stand price'],
            ['amount_paid', 'Amount paid'],
        ],
    },
    {
        key: 'waiting_list',
        title: 'Waiting list',
        columns: [
            ['row', 'Row'],
            ['stand_no', 'Stand'],
            ['first_name', 'First name'],
            ['surname', 'Surname'],
            ['contacts', 'Contact'],
            ['cooperative', 'Co-operative'],
        ],
    },
    {
        key: 'receipts',
        title: 'Receipts',
        columns: [
            ['row', 'Row'],
            ['date', 'Date'],
            ['stand_no', 'Stand'],
            ['name', 'Client'],
            ['receipt_numbers', 'Receipt'],
            ['amount', 'Amount'],
        ],
    },
];

function SelectField({
    id,
    label,
    value,
    options,
    error,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    options: Option[];
    error?: string;
    onChange: (value: string) => void;
}) {
    return (
        <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Select value={value || undefined} onValueChange={onChange}>
                <SelectTrigger id={id} aria-invalid={Boolean(error)}>
                    <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            {options.length === 0 && <FieldDescription>No options are available for the selected branch and phase.</FieldDescription>}
            <FieldError>{error}</FieldError>
        </Field>
    );
}

function WorkbookDropzone({ file, error, onChange }: { file: File | null; error?: string; onChange: (file: File | null) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const drop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        const next = event.dataTransfer.files?.[0];
        if (next) onChange(next);
    };
    return (
        <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="workbook">Excel workbook</FieldLabel>
            <div
                className={cn(
                    'border-input bg-muted/20 flex min-h-44 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center transition-colors',
                    dragging && 'border-chart-2 bg-chart-2/10',
                    error && 'border-destructive/60',
                )}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
                }}
                onDrop={drop}
            >
                <Input
                    ref={inputRef}
                    id="workbook"
                    className="sr-only"
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => {
                        const next = event.target.files?.[0];
                        if (next) onChange(next);
                    }}
                />
                <div className="bg-chart-2/10 text-chart-2 flex size-12 items-center justify-center rounded-full">
                    <UploadCloud aria-hidden="true" />
                </div>
                {file ? (
                    <div className="flex max-w-full flex-col items-center gap-2">
                        <div className="flex max-w-full items-center gap-2">
                            <FileSpreadsheet aria-hidden="true" className="text-chart-1" />
                            <span className="max-w-80 truncate font-medium">{file.name}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remove workbook"
                                onClick={() => {
                                    onChange(null);
                                    if (inputRef.current) inputRef.current.value = '';
                                }}
                            >
                                <X aria-hidden="true" />
                            </Button>
                        </div>
                        <p className="text-muted-foreground text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB · ready to validate</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <p className="font-medium">Drop the completed GAPS workbook here</p>
                        <p className="text-muted-foreground text-sm">or choose an XLSX file from your computer</p>
                        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                            <UploadCloud data-icon="inline-start" aria-hidden="true" />
                            Browse workbook
                        </Button>
                    </div>
                )}
            </div>
            <FieldDescription>Maximum file size: 20 MB. Only the supplied XLSX structure is accepted.</FieldDescription>
            <FieldError>{error}</FieldError>
        </Field>
    );
}

const displayValue = (value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? '—' : String(value));

export default function GapWorkbookImport({ branches, phases, standTypes, currencies, paymentMethods, defaults, importResult }: Props) {
    const form = useForm({
        workbook: null as File | null,
        mode: 'validate',
        branch_id: defaults.branch_id,
        phase_id: '',
        stand_type_id: '',
        currency_code: defaults.currency_code,
        payment_method_id: paymentMethods[0]?.value ?? '',
    });
    const [previewDirty, setPreviewDirty] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    useEffect(() => {
        setPreviewDirty(false);
        setImportError(null);
    }, [importResult?.preview_token, importResult?.imported]);

    const availablePhases = phases.filter(
        (option) => form.data.branch_id && (!option.branchIds?.length || option.branchIds.includes(form.data.branch_id)),
    );
    const availableStandTypes = standTypes.filter(
        (option) =>
            form.data.branch_id &&
            (!option.branchIds?.length || option.branchIds.includes(form.data.branch_id)) &&
            (!form.data.phase_id || !option.phaseIds?.length || option.phaseIds.includes(form.data.phase_id)),
    );
    const updateField = (field: 'branch_id' | 'phase_id' | 'stand_type_id' | 'currency_code' | 'payment_method_id', value: string) => {
        form.setData((current) => ({
            ...current,
            [field]: value,
            ...(field === 'branch_id' ? { phase_id: '', stand_type_id: '' } : field === 'phase_id' ? { stand_type_id: '' } : {}),
        }));
        form.clearErrors(field, 'phase_id', 'stand_type_id');
        if (importResult?.preview_token) setPreviewDirty(true);
    };
    const updateWorkbook = (file: File | null) => {
        form.clearErrors('workbook');
        if (file && (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 20 * 1024 * 1024)) {
            form.setError('workbook', file.size > 20 * 1024 * 1024 ? 'The workbook must not exceed 20 MB.' : 'Choose an XLSX workbook.');
            return;
        }
        form.setData('workbook', file);
        if (importResult?.preview_token) setPreviewDirty(true);
    };
    const validateWorkbook = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setImportError(null);
        form.post('/administration/data-import', { forceFormData: true, preserveScroll: true });
    };
    const importPreview = () => {
        if (!importResult?.preview_token || previewDirty) return;
        router.post(
            '/administration/data-import',
            { mode: 'import', preview_token: importResult.preview_token },
            {
                preserveScroll: true,
                onStart: () => {
                    setImporting(true);
                    setImportError(null);
                },
                onError: (errors) => setImportError(String(errors.preview_token ?? 'The preview could not be imported.')),
                onFinish: () => setImporting(false),
            },
        );
    };
    const previewReady = Boolean(importResult?.valid && importResult.preview_token && !importResult.imported);
    const hasRows = (importResult?.counts.rows ?? 0) > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Import property workbook" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">Property operations</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">Import GAPS workbook</h1>
                    <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
                        Upload, validate, and review the Hatcliffe GAPS template before any records are written to the system.
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                        ['1', 'Upload and map', 'Choose the workbook and its destination context.'],
                        ['2', 'Validate and preview', 'Review detected rows, warnings, and totals.'],
                        ['3', 'Confirm import', 'Import only the exact workbook you previewed.'],
                    ].map(([number, title, description]) => (
                        <div key={number} className="bg-muted/20 flex gap-3 rounded-lg border p-4">
                            <span className="bg-chart-1 text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                {number}
                            </span>
                            <div>
                                <p className="font-medium">{title}</p>
                                <p className="text-muted-foreground mt-1 text-xs">{description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet className="text-chart-1" aria-hidden="true" />
                                Workbook settings
                            </CardTitle>
                            <CardDescription>
                                The source template does not contain organization context, so these selections apply to every imported row.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="flex flex-col gap-5" encType="multipart/form-data" onSubmit={validateWorkbook}>
                                <FieldGroup className="gap-5">
                                    <WorkbookDropzone file={form.data.workbook} error={form.errors.workbook} onChange={updateWorkbook} />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <SelectField
                                            id="branch_id"
                                            label="Branch"
                                            value={form.data.branch_id}
                                            options={branches}
                                            error={form.errors.branch_id}
                                            onChange={(value) => updateField('branch_id', value)}
                                        />
                                        <SelectField
                                            id="phase_id"
                                            label="Development phase"
                                            value={form.data.phase_id}
                                            options={availablePhases}
                                            error={form.errors.phase_id}
                                            onChange={(value) => updateField('phase_id', value)}
                                        />
                                        <SelectField
                                            id="stand_type_id"
                                            label="Stand type"
                                            value={form.data.stand_type_id}
                                            options={availableStandTypes}
                                            error={form.errors.stand_type_id}
                                            onChange={(value) => updateField('stand_type_id', value)}
                                        />
                                        <SelectField
                                            id="currency_code"
                                            label="Currency"
                                            value={form.data.currency_code}
                                            options={currencies}
                                            error={form.errors.currency_code}
                                            onChange={(value) => updateField('currency_code', value)}
                                        />
                                        <div className="md:col-span-2">
                                            <SelectField
                                                id="payment_method_id"
                                                label="Historical payment method"
                                                value={form.data.payment_method_id}
                                                options={paymentMethods}
                                                error={form.errors.payment_method_id}
                                                onChange={(value) => updateField('payment_method_id', value)}
                                            />
                                            <p className="text-muted-foreground mt-2 text-xs">
                                                Cash and non-cash methods are available. Historical payments are imported without affecting a current
                                                cash session.
                                            </p>
                                        </div>
                                    </div>
                                </FieldGroup>
                                {form.progress && (
                                    <div
                                        className="bg-muted h-2 overflow-hidden rounded-full"
                                        aria-label={`Upload ${form.progress.percentage}% complete`}
                                    >
                                        <div className="bg-chart-2 h-full transition-all" style={{ width: `${form.progress.percentage}%` }} />
                                    </div>
                                )}
                                <Button type="submit" variant="outline" className="self-start" disabled={form.processing}>
                                    <FileCheck2 data-icon="inline-start" aria-hidden="true" />
                                    {form.processing ? 'Validating workbook…' : 'Validate and preview'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Layers aria-hidden="true" className="text-chart-1 size-5" />
                                Supported sheets
                            </CardTitle>
                            <CardDescription>Headings may contain the template’s original spelling and punctuation.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4 text-sm">
                            {[
                                { sheet: 'ON GROUND', description: 'Clients, stands, allocated records, charges and opening payments', icon: MapPin },
                                {
                                    sheet: 'DOUBLE ALLOCATION',
                                    description: 'Disputed allocations imported as pending special allocations',
                                    icon: Layers,
                                },
                                { sheet: 'WAITING LIST', description: 'Prospective clients without creating an allocation', icon: Users },
                                { sheet: 'RECIEPTS', description: 'Detailed historical payments and original receipt numbers', icon: Receipt },
                            ].map(({ sheet, description, icon: Icon }) => (
                                <div key={sheet} className="bg-background flex items-start gap-3 rounded-lg border p-3">
                                    <span className="bg-chart-1/10 text-chart-1 flex size-9 shrink-0 items-center justify-center rounded-lg">
                                        <Icon aria-hidden="true" className="size-4" />
                                    </span>
                                    <div>
                                        <p className="font-medium">{sheet}</p>
                                        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
                                    </div>
                                </div>
                            ))}
                            <p className="text-muted-foreground flex items-start gap-2 text-xs">
                                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                                <span>STATISTICS and formula totals are ignored. Balances are recalculated from imported charges and payments.</span>
                            </p>
                        </CardContent>
                    </Card>
                </div>
                {importResult && (
                    <Card className={importResult.valid ? 'border-chart-2/40' : 'border-destructive/40'}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {importResult.valid ? (
                                    <CheckCircle2 className="text-chart-2" aria-hidden="true" />
                                ) : (
                                    <AlertTriangle className="text-destructive" aria-hidden="true" />
                                )}
                                {importResult.imported
                                    ? 'Import complete'
                                    : importResult.valid
                                      ? 'Preview ready for review'
                                      : 'Workbook needs attention'}
                            </CardTitle>
                            <CardDescription>{importResult.filename}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-5">
                            {importResult.context && (
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(importResult.context).map(([key, value]) => (
                                        <Badge key={key} variant="outline">
                                            {key.replace('_', ' ')}: {value}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                {Object.entries(importResult.counts).map(([key, value]) => (
                                    <div key={key} className="bg-background rounded-lg border p-3 shadow-xs">
                                        <p className="text-muted-foreground text-xs">{countLabels[key] ?? key}</p>
                                        <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {importResult.recognized_sheets.map((sheet) => (
                                    <Badge key={sheet} className="bg-chart-2/10 text-chart-2 ring-chart-2/20 ring-1">
                                        {sheet}
                                    </Badge>
                                ))}
                                {importResult.ignored_sheets.map((sheet) => (
                                    <Badge key={sheet} variant="outline">
                                        Ignored: {sheet}
                                    </Badge>
                                ))}
                            </div>
                            {importResult.issues.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    {importResult.issues.map((issue, index) => (
                                        <Alert
                                            key={`${issue.sheet}-${issue.row}-${index}`}
                                            variant={issue.level === 'error' ? 'destructive' : 'default'}
                                        >
                                            <AlertTriangle aria-hidden="true" />
                                            <AlertTitle>
                                                {issue.level === 'error' ? 'Error' : 'Warning'} · {issue.sheet}
                                                {issue.row ? ` row ${issue.row}` : ''}
                                            </AlertTitle>
                                            <AlertDescription>{issue.message}</AlertDescription>
                                        </Alert>
                                    ))}
                                </div>
                            )}
                            {importResult.valid && (
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold">Workbook preview</h2>
                                        <p className="text-muted-foreground text-sm">
                                            Showing up to 10 rows per sheet. Check names, stand numbers, receipts, and amounts before importing.
                                        </p>
                                    </div>
                                    {previewSections.map((section) => {
                                        const rows = importResult.preview?.[section.key] ?? [];
                                        if (!rows.length) return null;
                                        return (
                                            <div key={section.key} className="overflow-hidden rounded-lg border">
                                                <div className="bg-muted/30 flex items-center justify-between border-b px-4 py-3">
                                                    <p className="font-medium">{section.title}</p>
                                                    <Badge variant="outline">{rows.length} shown</Badge>
                                                </div>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            {section.columns.map(([key, label]) => (
                                                                <TableHead key={key} className="whitespace-nowrap">
                                                                    {label}
                                                                </TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {rows.map((row, rowIndex) => (
                                                            <TableRow key={`${section.key}-${row.row ?? rowIndex}`}>
                                                                {section.columns.map(([key]) => (
                                                                    <TableCell key={key} className="whitespace-nowrap">
                                                                        {displayValue(row[key])}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        );
                                    })}
                                    {!hasRows && (
                                        <Alert>
                                            <FileSpreadsheet aria-hidden="true" />
                                            <AlertTitle>No populated rows found</AlertTitle>
                                            <AlertDescription>
                                                The workbook structure is valid, but there is nothing to import yet. Add data to the supported sheets
                                                and validate again.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        {previewReady && (
                            <CardFooter className="flex flex-col items-start gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-medium">Ready for final confirmation</p>
                                    <p className="text-muted-foreground text-xs">
                                        {previewDirty
                                            ? 'Workbook settings changed. Validate again to create a new preview.'
                                            : 'Only the validated workbook and settings shown above will be imported.'}
                                    </p>
                                    {importError && <p className="text-destructive mt-1 text-xs">{importError}</p>}
                                </div>
                                <Button
                                    type="button"
                                    disabled={importing || previewDirty || !hasRows}
                                    onClick={importPreview}
                                    className="bg-chart-1 hover:bg-chart-1/90 text-white dark:text-white"
                                >
                                    <Upload data-icon="inline-start" aria-hidden="true" />
                                    {importing ? 'Importing…' : 'Import previewed workbook'}
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
