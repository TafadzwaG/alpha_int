import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Download,
    ExternalLink,
    FileText,
    Flag,
    Gavel,
    LoaderCircle,
    MapPin,
    MessageSquarePlus,
    Paperclip,
    Plus,
    Scale,
    Eye as TableViewIcon,
    Trash2,
    UploadCloud,
    UserRound,
} from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';

type Allocation = {
    id: number;
    client_id: number;
    client: string;
    branch: string;
    allocated_at: string | null;
    price: number;
    paid: number;
    balance: number;
    currency: string;
    status: string;
    next_due_date: string | null;
};
type LegalNote = { id: number; body: string; created_by: string | null; created_at: string | null };
type LegalFile = {
    id: number;
    original_name: string;
    mime_type: string | null;
    size_bytes: number;
    uploaded_by: string | null;
    created_at: string | null;
    download_url: string;
};
type LegalCase = {
    id: number;
    case_number: string;
    title: string;
    case_type: string;
    status: string;
    priority: string;
    court_name: string | null;
    opposing_party: string | null;
    opened_on: string | null;
    next_hearing_on: string | null;
    resolved_at: string | null;
    summary: string | null;
    created_by: string | null;
    assigned_to: string | null;
    assigned_to_id: number | null;
    notes: LegalNote[];
    files: LegalFile[];
};
type Option = { value: string; label: string };
type Props = {
    stand: {
        id: number;
        stand_no: string;
        development: string;
        development_code: string;
        phase: string;
        location: string;
        type: string;
        area_sqm: number;
        list_price: number;
        currency: string;
        status: string;
        survey_reference: string | null;
        legal_flagged: boolean;
        active_legal_cases_count: number;
    };
    allocations: Allocation[];
    legalCases: LegalCase[];
    legalCaseAssignees: Option[];
    canManage: boolean;
};

const activeStatuses = ['open', 'pending', 'in_court'];
const money = (amount: number, currency: string) => `${currency} ${new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2 }).format(amount)}`;
const date = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');
const dateTime = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const bytes = (value: number) => (value >= 1_048_576 ? `${(value / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`);
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function StandShow({ stand, allocations, legalCases, legalCaseAssignees, canManage }: Props) {
    const [caseDialogOpen, setCaseDialogOpen] = useState(false);
    const [noteBodies, setNoteBodies] = useState<Record<number, string>>({});
    const [noteProcessing, setNoteProcessing] = useState<number | null>(null);
    const [fileProcessing, setFileProcessing] = useState<number | null>(null);
    const [statusProcessing, setStatusProcessing] = useState<number | null>(null);
    const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});
    const caseForm = useForm({
        case_number: '',
        title: '',
        case_type: 'ownership_dispute',
        status: 'open',
        priority: 'high',
        court_name: '',
        opposing_party: '',
        opened_on: new Date().toISOString().slice(0, 10),
        next_hearing_on: '',
        summary: '',
        assigned_to: '',
    });
    const activeCases = useMemo(() => legalCases.filter((item) => activeStatuses.includes(item.status)), [legalCases]);
    const noteCount = legalCases.reduce((total, item) => total + item.notes.length, 0);
    const fileCount = legalCases.reduce((total, item) => total + item.files.length, 0);
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Stands', href: '/administration/stands' },
        { title: `Stand ${stand.stand_no}`, href: `/administration/stands/${stand.id}` },
    ];

    const submitCase = (event: FormEvent) => {
        event.preventDefault();
        caseForm.post(`/administration/stands/${stand.id}/legal-cases`, {
            preserveScroll: true,
            onSuccess: () => {
                caseForm.reset();
                setCaseDialogOpen(false);
            },
        });
    };
    const addNote = (legalCase: LegalCase) => {
        const body = noteBodies[legalCase.id]?.trim();
        if (!body) return;
        setNoteProcessing(legalCase.id);
        router.post(
            `/administration/stands/${stand.id}/legal-cases/${legalCase.id}/notes`,
            { body },
            {
                preserveScroll: true,
                onSuccess: () => setNoteBodies((values) => ({ ...values, [legalCase.id]: '' })),
                onFinish: () => setNoteProcessing(null),
            },
        );
    };
    const uploadFiles = (legalCase: LegalCase, documents: File[]) => {
        if (!documents.length) return;
        setFileProcessing(legalCase.id);
        router.post(
            `/administration/stands/${stand.id}/legal-cases/${legalCase.id}/files`,
            { documents },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setFileProcessing(null);
                    if (fileInputs.current[legalCase.id]) fileInputs.current[legalCase.id]!.value = '';
                },
            },
        );
    };
    const updateCase = (legalCase: LegalCase, status: string, priority = legalCase.priority) => {
        setStatusProcessing(legalCase.id);
        router.patch(
            `/administration/stands/${stand.id}/legal-cases/${legalCase.id}`,
            { status, priority, next_hearing_on: legalCase.next_hearing_on, assigned_to: legalCase.assigned_to_id },
            { preserveScroll: true, onFinish: () => setStatusProcessing(null) },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Stand ${stand.stand_no}`} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration/stands">
                                <ArrowLeft data-icon="inline-start" /> All stands
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">Stand {stand.stand_no}</h1>
                            <Badge className="capitalize" variant="secondary">
                                {stand.status}
                            </Badge>
                            {stand.legal_flagged && (
                                <Badge className="gap-1 bg-red-700 text-white">
                                    <Flag className="size-3 fill-current" /> Legal flag
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="size-4" /> {stand.development} · {stand.phase} · {stand.location}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canManage && (
                            <Button variant="destructive" onClick={() => setCaseDialogOpen(true)}>
                                <Flag data-icon="inline-start" /> Flag legal case
                            </Button>
                        )}
                        <Button asChild>
                            <Link href={`/administration/stand-allocations?search=${encodeURIComponent(stand.stand_no)}`}>
                                Find allocations <ExternalLink data-icon="inline-end" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {stand.legal_flagged && (
                    <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-950 shadow-sm dark:border-red-800 dark:bg-red-950 dark:text-red-50">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-700 text-white">
                                <Gavel className="size-5" />
                            </span>
                            <div>
                                <p className="font-semibold">This stand has an active legal hold</p>
                                <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                                    {stand.active_legal_cases_count} active legal {stand.active_legal_cases_count === 1 ? 'case is' : 'cases are'}{' '}
                                    recorded. Review the case history and documents before allocation, transfer, or amendment.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader>
                            <CardDescription>List price</CardDescription>
                            <CardTitle>{money(stand.list_price, stand.currency)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Stand type</CardDescription>
                            <CardTitle>{stand.type}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Area</CardDescription>
                            <CardTitle>{new Intl.NumberFormat('en-ZW').format(stand.area_sqm)} m²</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Survey reference</CardDescription>
                            <CardTitle className="text-base">{stand.survey_reference || 'Not recorded'}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card className={stand.legal_flagged ? 'ring-2 ring-red-200 dark:ring-red-900' : ''}>
                    <CardHeader className="border-b">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Scale className="size-5 text-red-700" /> Legal cases
                                </CardTitle>
                                <CardDescription>Legal holds, case notes, hearings, assigned staff and supporting documents.</CardDescription>
                            </div>
                            {canManage && (
                                <Button variant="outline" size="sm" onClick={() => setCaseDialogOpen(true)}>
                                    <Plus /> New case
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-5 pt-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border bg-red-50 p-3 dark:bg-red-950">
                                <p className="text-muted-foreground text-xs">Active cases</p>
                                <p className="mt-1 text-xl font-semibold">{activeCases.length}</p>
                            </div>
                            <div className="rounded-lg border bg-blue-50 p-3 dark:bg-blue-950">
                                <p className="text-muted-foreground text-xs">Case notes</p>
                                <p className="mt-1 text-xl font-semibold">{noteCount}</p>
                            </div>
                            <div className="rounded-lg border bg-amber-50 p-3 dark:bg-amber-950">
                                <p className="text-muted-foreground text-xs">Documents</p>
                                <p className="mt-1 text-xl font-semibold">{fileCount}</p>
                            </div>
                        </div>
                        {legalCases.length === 0 && (
                            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                                <Scale className="text-muted-foreground mb-2 size-8" />
                                <p className="font-medium">No legal cases recorded</p>
                                <p className="text-muted-foreground mt-1 text-sm">This stand currently has a clear legal record.</p>
                            </div>
                        )}
                        {legalCases.map((legalCase) => (
                            <section key={legalCase.id} className="overflow-hidden rounded-xl border ring-1 ring-black/5 dark:ring-white/10">
                                <div
                                    className={`border-b p-4 ${activeStatuses.includes(legalCase.status) ? 'bg-red-50 dark:bg-red-950/50' : 'bg-muted/30'}`}
                                >
                                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline">{legalCase.case_number}</Badge>
                                                <Badge
                                                    className={
                                                        activeStatuses.includes(legalCase.status)
                                                            ? 'bg-red-700 text-white'
                                                            : 'bg-emerald-700 text-white'
                                                    }
                                                >
                                                    {label(legalCase.status)}
                                                </Badge>
                                                <Badge variant="secondary">{label(legalCase.priority)} priority</Badge>
                                            </div>
                                            <h3 className="mt-2 text-lg font-semibold">{legalCase.title}</h3>
                                            <p className="text-muted-foreground mt-1 text-sm">{label(legalCase.case_type)}</p>
                                        </div>
                                        {canManage && (
                                            <div className="flex flex-wrap gap-2">
                                                <Select
                                                    value={legalCase.priority}
                                                    onValueChange={(value) => updateCase(legalCase, legalCase.status, value)}
                                                    disabled={statusProcessing === legalCase.id}
                                                >
                                                    <SelectTrigger className="w-36">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['low', 'medium', 'high', 'critical'].map((item) => (
                                                            <SelectItem key={item} value={item}>
                                                                {label(item)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select
                                                    value={legalCase.status}
                                                    onValueChange={(value) => updateCase(legalCase, value)}
                                                    disabled={statusProcessing === legalCase.id}
                                                >
                                                    <SelectTrigger className="w-36">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['open', 'pending', 'in_court', 'resolved', 'closed'].map((item) => (
                                                            <SelectItem key={item} value={item}>
                                                                {label(item)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                    {legalCase.summary && <p className="mt-3 max-w-4xl text-sm whitespace-pre-wrap">{legalCase.summary}</p>}
                                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <dt className="text-muted-foreground text-xs">Opened</dt>
                                            <dd className="mt-1 flex items-center gap-1 font-medium">
                                                <CalendarDays className="size-3.5" /> {date(legalCase.opened_on)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground text-xs">Next hearing</dt>
                                            <dd className="mt-1 flex items-center gap-1 font-medium">
                                                <Gavel className="size-3.5" /> {date(legalCase.next_hearing_on)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground text-xs">Assigned to</dt>
                                            <dd className="mt-1 flex items-center gap-1 font-medium">
                                                <UserRound className="size-3.5" /> {legalCase.assigned_to ?? 'Unassigned'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground text-xs">Court / opposing party</dt>
                                            <dd className="mt-1 font-medium">
                                                {legalCase.court_name || '—'}
                                                {legalCase.opposing_party ? ` · ${legalCase.opposing_party}` : ''}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                                <div className="grid gap-0 xl:grid-cols-2">
                                    <div className="border-b p-4 xl:border-r xl:border-b-0">
                                        <h4 className="flex items-center gap-2 font-semibold">
                                            <MessageSquarePlus className="size-4" /> Notes ({legalCase.notes.length})
                                        </h4>
                                        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                                            {legalCase.notes.length === 0 && (
                                                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                                                    No notes have been added.
                                                </p>
                                            )}
                                            {legalCase.notes.map((note) => (
                                                <div key={note.id} className="bg-muted/20 rounded-lg border p-3">
                                                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                                                    <p className="text-muted-foreground mt-2 text-xs">
                                                        {note.created_by ?? 'Former user'} · {dateTime(note.created_at)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                        {canManage && (
                                            <div className="mt-4 space-y-2">
                                                <Textarea
                                                    value={noteBodies[legalCase.id] ?? ''}
                                                    onChange={(event) =>
                                                        setNoteBodies((values) => ({ ...values, [legalCase.id]: event.target.value }))
                                                    }
                                                    placeholder="Add a factual case note…"
                                                    rows={3}
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => addNote(legalCase)}
                                                    disabled={!noteBodies[legalCase.id]?.trim() || noteProcessing === legalCase.id}
                                                >
                                                    {noteProcessing === legalCase.id ? (
                                                        <LoaderCircle className="animate-spin" />
                                                    ) : (
                                                        <MessageSquarePlus />
                                                    )}{' '}
                                                    Add note
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h4 className="flex items-center gap-2 font-semibold">
                                            <Paperclip className="size-4" /> Files ({legalCase.files.length})
                                        </h4>
                                        <div className="mt-3 space-y-2">
                                            {legalCase.files.length === 0 && (
                                                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                                                    No supporting documents uploaded.
                                                </p>
                                            )}
                                            {legalCase.files.map((file) => (
                                                <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                                    <div className="flex min-w-0 items-start gap-2">
                                                        <FileText className="mt-0.5 size-4 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium">{file.original_name}</p>
                                                            <p className="text-muted-foreground text-xs">
                                                                {bytes(file.size_bytes)} · {file.uploaded_by ?? 'Former user'} ·{' '}
                                                                {date(file.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 gap-1">
                                                        <Button variant="outline" size="icon" className="size-8" asChild>
                                                            <a href={file.download_url} aria-label={`Download ${file.original_name}`}>
                                                                <Download />
                                                            </a>
                                                        </Button>
                                                        {canManage && (
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                className="size-8"
                                                                onClick={() =>
                                                                    router.delete(
                                                                        `/administration/stands/${stand.id}/legal-cases/${legalCase.id}/files/${file.id}`,
                                                                        { preserveScroll: true },
                                                                    )
                                                                }
                                                                aria-label={`Delete ${file.original_name}`}
                                                            >
                                                                <Trash2 />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {canManage && (
                                            <label className="bg-muted/20 hover:bg-muted/40 mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-400 px-4 text-center">
                                                {fileProcessing === legalCase.id ? (
                                                    <LoaderCircle className="mb-2 size-7 animate-spin" />
                                                ) : (
                                                    <UploadCloud className="text-muted-foreground mb-2 size-7" />
                                                )}
                                                <span className="text-sm font-medium">Choose legal documents</span>
                                                <span className="text-muted-foreground mt-1 text-xs">
                                                    PDF, Office, image, CSV or text · up to 10 files · 10 MB each
                                                </span>
                                                <input
                                                    ref={(element) => {
                                                        fileInputs.current[legalCase.id] = element;
                                                    }}
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.txt"
                                                    className="sr-only"
                                                    disabled={fileProcessing === legalCase.id}
                                                    onChange={(event) => uploadFiles(legalCase, Array.from(event.target.files ?? []))}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>Allocation history</CardTitle>
                        <CardDescription>Purchasers, payment position and next due date for this stand.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Allocated</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead>Next due</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allocations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-muted-foreground h-28 text-center">
                                            No allocation has been recorded for this stand.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {allocations.map((allocation) => (
                                    <TableRow key={allocation.id}>
                                        <TableCell className="font-medium">
                                            <Link className="hover:underline" href={`/administration/clients/${allocation.client_id}`}>
                                                {allocation.client}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{allocation.branch}</TableCell>
                                        <TableCell>{date(allocation.allocated_at)}</TableCell>
                                        <TableCell>{money(allocation.price, allocation.currency)}</TableCell>
                                        <TableCell>{money(allocation.paid, allocation.currency)}</TableCell>
                                        <TableCell>{money(allocation.balance, allocation.currency)}</TableCell>
                                        <TableCell>{date(allocation.next_due_date)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {allocation.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="view" size="sm" asChild>
                                                <Link href={`/administration/stand-allocations/${allocation.id}`}>
                                                    <TableViewIcon data-icon="inline-start" /> View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <form onSubmit={submitCase}>
                        <DialogHeader>
                            <DialogTitle>Flag stand {stand.stand_no} with a legal case</DialogTitle>
                            <DialogDescription>The stand remains flagged while at least one case is open, pending, or in court.</DialogDescription>
                        </DialogHeader>
                        <FieldGroup className="mt-5 grid gap-4 md:grid-cols-2">
                            <Field>
                                <FieldLabel htmlFor="case_number">Case number *</FieldLabel>
                                <Input
                                    id="case_number"
                                    value={caseForm.data.case_number}
                                    onChange={(event) => caseForm.setData('case_number', event.target.value)}
                                    placeholder="LC-2026-001"
                                />
                                <FieldError>{caseForm.errors.case_number}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="title">Case title *</FieldLabel>
                                <Input
                                    id="title"
                                    value={caseForm.data.title}
                                    onChange={(event) => caseForm.setData('title', event.target.value)}
                                    placeholder="Ownership dispute"
                                />
                                <FieldError>{caseForm.errors.title}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Case type *</FieldLabel>
                                <Select value={caseForm.data.case_type} onValueChange={(value) => caseForm.setData('case_type', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['ownership_dispute', 'allocation_dispute', 'boundary_dispute', 'litigation', 'other'].map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {label(item)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{caseForm.errors.case_type}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Priority *</FieldLabel>
                                <Select value={caseForm.data.priority} onValueChange={(value) => caseForm.setData('priority', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['low', 'medium', 'high', 'critical'].map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {label(item)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="opened_on">Opened on</FieldLabel>
                                <Input
                                    id="opened_on"
                                    type="date"
                                    value={caseForm.data.opened_on}
                                    onChange={(event) => caseForm.setData('opened_on', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="next_hearing_on">Next hearing</FieldLabel>
                                <Input
                                    id="next_hearing_on"
                                    type="date"
                                    value={caseForm.data.next_hearing_on}
                                    onChange={(event) => caseForm.setData('next_hearing_on', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="court_name">Court / tribunal</FieldLabel>
                                <Input
                                    id="court_name"
                                    value={caseForm.data.court_name}
                                    onChange={(event) => caseForm.setData('court_name', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="opposing_party">Opposing party</FieldLabel>
                                <Input
                                    id="opposing_party"
                                    value={caseForm.data.opposing_party}
                                    onChange={(event) => caseForm.setData('opposing_party', event.target.value)}
                                />
                            </Field>
                            <Field className="md:col-span-2">
                                <FieldLabel>Assigned staff member</FieldLabel>
                                <Select
                                    value={caseForm.data.assigned_to || 'unassigned'}
                                    onValueChange={(value) => caseForm.setData('assigned_to', value === 'unassigned' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {legalCaseAssignees.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field className="md:col-span-2">
                                <FieldLabel htmlFor="summary">Case summary</FieldLabel>
                                <Textarea
                                    id="summary"
                                    value={caseForm.data.summary}
                                    onChange={(event) => caseForm.setData('summary', event.target.value)}
                                    rows={5}
                                    placeholder="Record the legal issue, current position and immediate restrictions…"
                                />
                                <FieldDescription>Detailed updates can be added later as case notes.</FieldDescription>
                                <FieldError>{caseForm.errors.summary}</FieldError>
                            </Field>
                        </FieldGroup>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setCaseDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={caseForm.processing}>
                                {caseForm.processing ? <LoaderCircle className="animate-spin" /> : <Flag />} Create legal flag
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
