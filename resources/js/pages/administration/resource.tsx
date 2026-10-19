import BulkStandsDialog from '@/components/bulk-stands-dialog';
import ClientDirectoryFilters from '@/components/client-directory-filters';
import { FinanceFilters, FinanceSummary, financeKeys, type FinanceCard } from '@/components/finance-register-tools';
import PaymentDirectoryFilters from '@/components/payment-directory-filters';
import StandDirectoryFilters from '@/components/stand-directory-filters';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import * as Popover from '@radix-ui/react-popover';
import {
    ArrowLeft,
    Bookmark,
    Building2,
    CalendarDays,
    ChevronsUpDown,
    CircleCheck,
    CircleOff,
    Clock3,
    Eye,
    FileDown,
    Flag,
    Layers,
    LoaderCircle,
    Map as MapIcon,
    MapPin,
    MessageSquareText,
    Pencil,
    PhoneCall,
    Plus,
    Receipt,
    Rows3,
    Search,
    Sheet,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Option = { value: string | number | boolean; label: string };
type Field = {
    name: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'checkbox' | 'multiselect';
    options?: string;
    choices?: Option[];
    default?: unknown;
    required?: boolean;
    readOnly?: boolean;
    help?: string;
    step?: string;
};
type Column = { key: string; label: string; badge?: boolean };
type Resource = {
    key: string;
    title: string;
    description: string;
    columns: Column[];
    fields: Field[];
    readOnly: boolean;
    detailsEnabled: boolean;
};
type RecordData = Record<string, unknown>;
type RegisterAction = { resource: string; detail_url: string; record: RecordData };
type RegisterAdvancedFilters = {
    cooperative: string;
    area_min: string;
    area_max: string;
    balance_min: string;
    balance_max: string;
    payment_state: string;
    contact_state: string;
    last_payment_from: string;
    last_payment_to: string;
};
type Pagination = {
    data: RecordData[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};
type Props = {
    financeCards?: FinanceCard[] | null;
    resource: Resource;
    records: Pagination;
    standStats?: { total: number; available: number; allocated: number; reserved: number; planned: number; withdrawn: number } | null;
    paymentStats?: { total: number; approved: number; pending: number; totals: Array<{ currency: string; amount: number }> } | null;
    clientStats?: { total: number; active: number; prospects: number; branches: number; smsEligible: number } | null;
    registerStats?: { on_ground: number; double_allocation: number; waiting_list: number } | null;
    registerView?: boolean;
    smsProvider?: { enabled: boolean; name: string } | null;
    options: Record<string, Option[]>;
    filters: { search: string; status: string; branch: string } & Record<string, string>;
};

function parseRegisterAction(value: unknown): RegisterAction | null {
    if (!value || typeof value !== 'object') return null;
    const action = value as Partial<RegisterAction>;
    if (typeof action.resource !== 'string' || typeof action.detail_url !== 'string' || !action.record || typeof action.record !== 'object') {
        return null;
    }

    return action as RegisterAction;
}

function FinanceDetailLabel({ field, label }: { field: string; label: string }) {
    const Icon =
        field.includes('date') || field.endsWith('_at')
            ? CalendarDays
            : field.includes('branch')
              ? Building2
              : field.includes('category') || field === 'entry_type'
                ? Layers
                : field.includes('payee') ||
                    field.includes('cashier') ||
                    field.includes('poster') ||
                    field.includes('maker') ||
                    field.includes('approver')
                  ? Users
                  : field.includes('amount') || field.includes('cash') || field === 'currency_code' || field === 'variance'
                    ? Wallet
                    : field === 'status'
                      ? ShieldCheck
                      : field === 'purpose' || field === 'notes'
                        ? Bookmark
                        : Receipt;
    return (
        <dt className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {label}
        </dt>
    );
}

function displayValue(value: unknown, badge = false, key = '', resourceKey = '') {
    if (resourceKey === 'stands' && key === 'legal_flag') {
        const flag = (value ?? {}) as { active?: boolean; count?: number; stand_id?: number };
        return flag.active ? (
            <Link href={`/administration/stands/${String(flag.stand_id)}`} className="inline-flex">
                <Badge className="gap-1 bg-red-700 text-white hover:bg-red-800">
                    <Flag className="size-3" /> {flag.count} active
                </Badge>
            </Link>
        ) : (
            <span className="text-muted-foreground text-xs">Clear</span>
        );
    }
    if (financeKeys.includes(resourceKey) && ['status', 'entry_type'].includes(key) && value) {
        const label = String(value);
        const color = ['cleared', 'paid', 'approved', 'replenishment', 'refund'].includes(label)
            ? 'bg-emerald-700 text-white'
            : ['rejected', 'void', 'cancelled', 'disbursement'].includes(label)
              ? 'bg-red-700 text-white'
              : ['submitted', 'closing', 'adjustment'].includes(label)
                ? 'bg-amber-500 text-black'
                : ['open'].includes(label)
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-600 text-white';
        return <Badge className={`${color} capitalize`}>{label.replaceAll('_', ' ')}</Badge>;
    }
    if (resourceKey === 'cash-sessions' && key === 'variance') {
        if (value === null || value === undefined) return <span className="text-muted-foreground text-xs">Not declared</span>;
        const amount = Number(value);
        return (
            <span className={`font-semibold tabular-nums ${amount < 0 ? 'text-red-700' : amount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {amount === 0 ? 'Balanced' : `${amount < 0 ? 'Short' : 'Over'} ${Math.abs(amount).toFixed(2)}`}
            </span>
        );
    }
    if (resourceKey === 'stands' && key === 'allocated_clients') {
        const clients = (value ?? []) as Array<{ id: number; number: string; name: string }>;
        return clients.length ? (
            <div className="flex min-w-36 flex-col gap-2">
                {clients.map((client) => (
                    <Link key={client.id} href={`/administration/clients/${client.id}`} className="flex flex-col gap-0.5 hover:underline">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-muted-foreground text-xs">{client.number}</span>
                    </Link>
                ))}
            </div>
        ) : (
            <span className="text-muted-foreground">—</span>
        );
    }
    if (resourceKey === 'stands' && key === 'physical_status') {
        const status = String(value ?? '');
        if (status === 'available' || status === 'allocated' || status === 'reserved' || status === 'planned' || status === 'withdrawn') {
            return (
                <Badge variant={status} className="capitalize">
                    {status}
                </Badge>
            );
        }
    }
    if (key === 'last_payment' || key === 'next_payment' || key === 'next_follow_up') {
        if (!value)
            return (
                <span className="text-muted-foreground text-xs">
                    {key === 'last_payment' ? 'No payment received' : key === 'next_payment' ? 'No payment scheduled' : 'No follow-up scheduled'}
                </span>
            );
        const next = value as { date: string | null; amount?: number; currency?: string; type?: string; overdue: boolean };
        const Icon = key === 'last_payment' ? Receipt : key === 'next_payment' ? CalendarDays : PhoneCall;
        return (
            <div className="flex min-w-36 items-start gap-2">
                <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="flex flex-col gap-1">
                    <span className="text-sm whitespace-nowrap">
                        {next.date
                            ? new Intl.DateTimeFormat(
                                  'en-ZW',
                                  key === 'next_follow_up' ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' },
                              ).format(new Date(next.date))
                            : 'Date not set'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        {key === 'last_payment' || key === 'next_payment'
                            ? `${next.currency} ${new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(next.amount ?? 0)}`
                            : next.type}
                    </span>
                    {key !== 'last_payment' && next.overdue && (
                        <Badge variant="destructive" className="self-start text-xs">
                            Overdue
                        </Badge>
                    )}
                </div>
            </div>
        );
    }
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
    if (typeof value === 'boolean' || badge) {
        const positive = value === true || value === 1 || value === '1' || value === 'active' || value === 'enabled';
        const label = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
        return <Badge variant={positive ? 'default' : 'secondary'}>{label}</Badge>;
    }
    if ((key.endsWith('_at') || key.endsWith('_date')) && typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return <span>{new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(parsed)}</span>;
        }
    }
    if (
        [
            'amount',
            'total_amount',
            'expected_cash',
            'declared_cash',
            'variance',
            'expected_total',
            'declared_total',
            'deposited_total',
            'list_price',
            'effective_price',
            'stand_size',
            'stand_price',
            'interest_amount',
            'amount_paid',
            'balance',
        ].includes(key)
    ) {
        const numeric = Number(value);
        if (!Number.isNaN(numeric))
            return <span>{new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)}</span>;
    }
    const text = String(value);
    return <span title={text}>{text.length > 48 ? `${text.slice(0, 45)}…` : text}</span>;
}

function normalizeForInput(field: Field, value: unknown): unknown {
    if (field.type === 'multiselect') return Array.isArray(value) ? value : [];
    if (field.type === 'checkbox') return Boolean(value);
    if (field.type === 'datetime-local' && typeof value === 'string') return value.slice(0, 16);
    if (field.type === 'date' && typeof value === 'string') return value.slice(0, 10);
    return value ?? '';
}

function SearchableSelect({
    id,
    value,
    options,
    required,
    invalid,
    onChange,
}: {
    id: string;
    value: unknown;
    options: Option[];
    required?: boolean;
    invalid?: boolean;
    onChange: (value: Option['value'] | '') => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!open) return;
        const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
        return () => window.clearTimeout(timer);
    }, [open]);
    const selectedValue = value === '' || value === null || value === undefined ? '__none__' : String(value);
    const selected = options.find((option) => String(option.value) === selectedValue);
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = options.filter((option) => terms.every((term) => option.label.toLowerCase().includes(term)));

    return (
        <Popover.Root
            modal
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setQuery('');
            }}
        >
            <Popover.Trigger asChild>
                <Button
                    ref={triggerRef}
                    id={id}
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={`${id}-options`}
                    aria-invalid={invalid}
                    variant="outline"
                    className="text-foreground hover:bg-muted w-full justify-between bg-transparent font-normal"
                >
                    <span className={selected ? 'truncate' : 'text-muted-foreground'}>{selected?.label ?? 'Select an option'}</span>
                    <ChevronsUpDown aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                </Button>
            </Popover.Trigger>
            <Popover.Portal container={triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? undefined}>
                <Popover.Content
                    ref={contentRef}
                    align="start"
                    sideOffset={4}
                    className="bg-popover text-popover-foreground z-50 w-[var(--radix-popover-trigger-width)] rounded-md border p-0 shadow-md"
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        searchRef.current?.focus();
                    }}
                >
                    <div className="relative border-b p-2">
                        <Search
                            aria-hidden="true"
                            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
                        />
                        <Input
                            ref={searchRef}
                            aria-label="Search options"
                            placeholder="Search options..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="pl-8"
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setOpen(false);
                                    setQuery('');
                                    return;
                                }
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    if (filtered.length) {
                                        onChange(filtered[0].value);
                                        setOpen(false);
                                        setQuery('');
                                    }
                                }
                                if (event.key === 'ArrowDown') {
                                    event.preventDefault();
                                    contentRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
                                }
                            }}
                        />
                    </div>
                    <div
                        id={`${id}-options`}
                        role="listbox"
                        aria-label="Options"
                        className="max-h-64 overflow-y-auto p-1"
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                event.stopPropagation();
                                setOpen(false);
                                setQuery('');
                                return;
                            }
                            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                                event.preventDefault();
                                const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
                                const index = items.indexOf(document.activeElement as HTMLElement);
                                items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
                            }
                        }}
                    >
                        {!required && !query && (
                            <button
                                type="button"
                                role="option"
                                aria-selected={selectedValue === '__none__'}
                                className="hover:bg-muted focus:bg-muted w-full rounded-sm px-3 py-2 text-left text-sm outline-none"
                                onClick={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                            >
                                None
                            </button>
                        )}
                        {filtered.map((option) => (
                            <button
                                key={String(option.value)}
                                type="button"
                                role="option"
                                aria-selected={String(option.value) === selectedValue}
                                className="hover:bg-muted focus:bg-muted flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm outline-none"
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                    setQuery('');
                                }}
                            >
                                {option.label}
                                {String(option.value) === selectedValue && <CircleCheck aria-hidden="true" className="size-4 shrink-0" />}
                            </button>
                        ))}
                        {!filtered.length && <p className="text-muted-foreground px-3 py-6 text-center text-sm">No matching options.</p>}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

export default function ResourcePage({
    resource,
    records,
    options,
    filters,
    clientStats,
    registerStats,
    registerView = false,
    standStats,
    paymentStats,
    financeCards,
}: Props) {
    const { auth, flash } = usePage<SharedData>().props;
    const managePermission = ['expenses', 'petty-cash-entries'].includes(resource.key) ? 'expenses.manage' : 'phase-one.manage';
    const canManage = auth.permissions.includes(managePermission) && !resource.readOnly;
    const canBulkSms = auth.permissions.includes('call-centre.campaigns.manage');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [exportingGaps, setExportingGaps] = useState(false);
    const [gapsExportError, setGapsExportError] = useState('');
    const [selectedStandIds, setSelectedStandIds] = useState<string[]>([]);
    const visibleSelected = selectedStandIds.filter((id) => records.data.some((row) => String(row.id) === id));
    const exportStandsUrl = (format: string) => {
        const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value && value !== 'all'));
        visibleSelected.forEach((id) => query.append('ids[]', id));
        return `/administration/${resource.key}/export/${format}?${query}`;
    };
    const bulkSmsUrl = () => {
        const query = new URLSearchParams();
        if (visibleSelected.length) {
            query.set('audience_type', 'selected');
            visibleSelected.forEach((id) => query.append('client_ids[]', id));
        } else {
            query.set('audience_type', 'filtered');
            ['search', 'branch', 'status', 'payment', 'follow_up', 'phone', 'created_from', 'created_to', 'sort'].forEach((key) => {
                const value = filters[key];
                if (value && value !== 'all') query.set(key, value);
            });
        }
        return `/call-centre/bulk-sms?${query.toString()}`;
    };
    const [editing, setEditing] = useState<RecordData | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [branch, setBranch] = useState(filters.branch || 'all');
    const [registerAdvanced, setRegisterAdvanced] = useState<RegisterAdvancedFilters>({
        cooperative: filters.cooperative || '',
        area_min: filters.area_min || '',
        area_max: filters.area_max || '',
        balance_min: filters.balance_min || '',
        balance_max: filters.balance_max || '',
        payment_state: filters.payment_state || 'all',
        contact_state: filters.contact_state || 'all',
        last_payment_from: filters.last_payment_from || '',
        last_payment_to: filters.last_payment_to || '',
    });
    const [showRegisterAdvanced, setShowRegisterAdvanced] = useState(
        Object.entries(filters).some(
            ([key, value]) =>
                ['cooperative', 'area_min', 'area_max', 'balance_min', 'balance_max', 'last_payment_from', 'last_payment_to'].includes(key) &&
                Boolean(value),
        ) ||
            ['with_payments', 'no_payments'].includes(filters.payment_state) ||
            ['with_contact', 'without_contact'].includes(filters.contact_state),
    );
    const hasAdvancedFilters = ['stands', 'clients', 'stand-allocations'].includes(resource.key);
    const registerAdvancedActive = Object.values(registerAdvanced).some((value) => Boolean(value) && value !== 'all');
    const anyDirectoryFilterActive = Boolean(search || (status && status !== 'all') || (branch && branch !== 'all') || registerAdvancedActive);
    const isFinance = financeKeys.includes(resource.key);
    const [viewing, setViewing] = useState<RecordData | null>(null);
    const hasActions = registerView || canManage || resource.detailsEnabled || isFinance;
    const selectable = !registerView && ['stands', 'clients', 'payments'].includes(resource.key);
    const statusOptions: Record<string, string[]> = {
        stands: ['planned', 'available', 'reserved', 'allocated', 'withdrawn'],
        clients: ['prospect', 'active', 'inactive', 'blocked'],
        'stand-allocations': ['pending', 'approved', 'allocated', 'cancelled'],
    };
    const defaults = useMemo(
        () => Object.fromEntries(resource.fields.map((field) => [field.name, normalizeForInput(field, field.default)])),
        [resource],
    );
    const form = useForm<Record<string, FormDataConvertible>>(defaults as Record<string, FormDataConvertible>);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/administration' },
        { title: resource.title, href: `/administration/${resource.key}` },
    ];

    const beginCreate = () => {
        setEditing(null);
        form.clearErrors();
        form.setData(defaults as Record<string, FormDataConvertible>);
        setDialogOpen(true);
    };

    const beginEdit = (record: RecordData) => {
        setEditing(record);
        form.clearErrors();
        form.setData(
            Object.fromEntries(resource.fields.map((field) => [field.name, normalizeForInput(field, record[field.name])])) as Record<
                string,
                FormDataConvertible
            >,
        );
        setDialogOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const key = editing ? String(editing.id ?? editing.code) : '';
        const url = editing ? `/administration/${resource.key}/${key}` : `/administration/${resource.key}`;
        const options = { preserveScroll: true, onSuccess: () => setDialogOpen(false) };
        if (editing) form.put(url, options);
        else form.post(url, options);
    };

    const remove = (record: RecordData) => {
        if (!window.confirm('Remove this record from active use? This action is captured in the audit trail.')) return;
        router.delete(`/administration/${resource.key}/${String(record.id ?? record.code)}`, { preserveScroll: true });
    };

    const runSearch = (event: FormEvent) => {
        event.preventDefault();
        const query = Object.fromEntries(
            Object.entries({
                search,
                status: registerView || status === 'all' ? '' : status,
                branch: branch === 'all' ? '' : branch,
                register: filters.register || '',
                ...(registerView ? registerAdvanced : {}),
            }).filter(([, value]) => Boolean(value) && value !== 'all'),
        );
        router.get(`/administration/${resource.key}`, query, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setBranch('all');
        setRegisterAdvanced({
            cooperative: '',
            area_min: '',
            area_max: '',
            balance_min: '',
            balance_max: '',
            payment_state: 'all',
            contact_state: 'all',
            last_payment_from: '',
            last_payment_to: '',
        });
        router.get(`/administration/${resource.key}`, filters.register ? { register: filters.register } : {}, { preserveState: true, replace: true });
    };

    const registerHref = (register = '') => {
        const query = new URLSearchParams();
        if (register) query.set('register', register);
        if (filters.branch && filters.branch !== 'all') query.set('branch', filters.branch);
        if (filters.search) query.set('search', filters.search);
        if (register) {
            Object.entries(registerAdvanced).forEach(([key, value]) => {
                if (value && value !== 'all') query.set(key, value);
            });
        }
        const suffix = query.toString();
        return `/administration/${resource.key}${suffix ? `?${suffix}` : ''}`;
    };

    const gapsWorkbookExportHref = () => {
        const query = new URLSearchParams();
        if (filters.branch && filters.branch !== 'all') query.set('branch', filters.branch);
        if (filters.search) query.set('search', filters.search);
        const suffix = query.toString();
        return `/administration/gaps-register/export${suffix ? `?${suffix}` : ''}`;
    };

    const exportGapsWorkbook = async () => {
        if (exportingGaps) return;

        setExportingGaps(true);
        setGapsExportError('');

        try {
            const response = await fetch(gapsWorkbookExportHref(), {
                credentials: 'same-origin',
                headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            });
            if (!response.ok) throw new Error(`Export failed with status ${response.status}.`);

            const workbook = await response.blob();
            const disposition = response.headers.get('Content-Disposition') ?? '';
            const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
            const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
            const filename = encodedName
                ? decodeURIComponent(encodedName)
                : (plainName ?? `GAPS-INDEX-${new Date().toISOString().slice(0, 10)}.xlsx`);
            const downloadUrl = URL.createObjectURL(workbook);
            const download = document.createElement('a');
            download.href = downloadUrl;
            download.download = filename;
            document.body.appendChild(download);
            download.click();
            download.remove();
            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
        } catch {
            setGapsExportError('The GAPS workbook could not be exported. Please try again.');
        } finally {
            setExportingGaps(false);
        }
    };

    const fieldOptions = (field: Field) => field.choices ?? (field.options ? (options[field.options] ?? []) : []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={resource.title} />
            <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration">
                                <ArrowLeft data-icon="inline-start" /> Administration
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-primary size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">{resource.title}</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">{resource.description}</p>
                    </div>
                    {(canManage || resource.key === 'stands' || ['clients', 'stand-allocations'].includes(resource.key)) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {['clients', 'stand-allocations'].includes(resource.key) && (
                                <Button variant="excel" disabled={exportingGaps} aria-busy={exportingGaps} onClick={() => void exportGapsWorkbook()}>
                                    {exportingGaps ? (
                                        <LoaderCircle data-icon="inline-start" className="animate-spin" />
                                    ) : (
                                        <Sheet data-icon="inline-start" />
                                    )}
                                    {exportingGaps ? 'Preparing workbook…' : 'Export GAPS workbook'}
                                </Button>
                            )}
                            {resource.key === 'stands' && (
                                <>
                                    <Button variant="outline" asChild>
                                        <Link href="/administration/stands/map">
                                            <MapIcon data-icon="inline-start" /> View stands map
                                        </Link>
                                    </Button>
                                    {canManage && <BulkStandsDialog options={options} />}
                                </>
                            )}
                            {canManage && (
                                <Button onClick={beginCreate}>
                                    <Plus data-icon="inline-start" /> Add record
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {gapsExportError && (
                    <Alert variant="destructive" role="alert">
                        <AlertDescription>{gapsExportError}</AlertDescription>
                    </Alert>
                )}

                {resource.key === 'payments' && paymentStats && (
                    <section aria-label="Payment statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            { label: 'Total payments', value: paymentStats.total, icon: Receipt, color: 'bg-blue-100 text-blue-700' },
                            { label: 'Approved', value: paymentStats.approved, icon: CircleCheck, color: 'bg-emerald-100 text-emerald-700' },
                            { label: 'Awaiting approval', value: paymentStats.pending, icon: Clock3, color: 'bg-amber-100 text-amber-700' },
                            {
                                label: 'Approved amount',
                                icon: Wallet,
                                color: 'bg-violet-100 text-violet-700',
                                value:
                                    paymentStats.totals
                                        .map((item) => `${item.currency} ${item.amount.toLocaleString('en-ZW', { minimumFractionDigits: 2 })}`)
                                        .join(' / ') || 'No approved payments',
                            },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <Card key={label}>
                                <CardHeader>
                                    <div className="flex items-center justify-between gap-3">
                                        <CardDescription>{label}</CardDescription>
                                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                                            <Icon aria-hidden="true" className="size-5" />
                                        </span>
                                    </div>
                                    <CardTitle className="text-xl">{value}</CardTitle>
                                </CardHeader>
                            </Card>
                        ))}
                    </section>
                )}
                {resource.key === 'stands' && standStats && (
                    <section aria-label="Stand statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                        {[
                            { label: 'Total stands', value: standStats.total, icon: MapPin, color: 'text-foreground' },
                            { label: 'Available', value: standStats.available, icon: CircleCheck, color: 'text-emerald-700' },
                            { label: 'Allocated', value: standStats.allocated, icon: Building2, color: 'text-blue-700' },
                            { label: 'Reserved', value: standStats.reserved, icon: Bookmark, color: 'text-amber-600' },
                            { label: 'Planned', value: standStats.planned, icon: Layers, color: 'text-violet-700' },
                            { label: 'Withdrawn', value: standStats.withdrawn, icon: CircleOff, color: 'text-destructive' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <Card key={label} className="ring-foreground/10 border-0 shadow-none ring-1">
                                <CardHeader className="flex-row items-center justify-between gap-2 p-4 pb-2">
                                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                                    <Icon aria-hidden="true" className={`size-4 shrink-0 ${color}`} />
                                </CardHeader>
                                <CardContent className="flex flex-col gap-1 p-4 pt-0">
                                    <p className="text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
                                    <CardDescription>Matching current filters</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </section>
                )}
                {resource.key === 'clients' && clientStats && !registerStats && (
                    <section aria-label="Client statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            { label: 'Total clients', value: clientStats.total, detail: 'Clients matching current filters', icon: Users },
                            { label: 'Active clients', value: clientStats.active, detail: 'Currently active clients', icon: UserCheck },
                            { label: 'Prospects', value: clientStats.prospects, detail: 'Potential clients in the pipeline', icon: UserPlus },
                            {
                                label: 'Owning branches',
                                value: clientStats.branches,
                                detail: 'Branches represented by these clients',
                                icon: Building2,
                            },
                        ].map(({ label, value, detail, icon: Icon }) => (
                            <Card key={label} className="ring-foreground/10 border-0 shadow-none ring-1">
                                <CardHeader className="flex-row items-center justify-between gap-3 p-4 pb-2">
                                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                                    <Icon aria-hidden="true" className="text-muted-foreground size-4" />
                                </CardHeader>
                                <CardContent className="flex flex-col gap-1 p-4 pt-0">
                                    <p className="text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
                                    <CardDescription>{detail}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </section>
                )}

                {['clients', 'stand-allocations'].includes(resource.key) && registerStats && (
                    <>
                        <section aria-label="GAPS register statistics" className="grid gap-4 md:grid-cols-3">
                            {[
                                {
                                    key: 'on_ground',
                                    label: 'On Ground',
                                    value: registerStats.on_ground,
                                    detail: 'Allocated stand records',
                                    icon: MapPin,
                                    color: 'bg-emerald-100 text-emerald-700',
                                },
                                {
                                    key: 'double_allocation',
                                    label: 'Double Allocation',
                                    value: registerStats.double_allocation,
                                    detail: 'Disputed or special allocations',
                                    icon: Layers,
                                    color: 'bg-amber-100 text-amber-700',
                                },
                                {
                                    key: 'waiting_list',
                                    label: 'Waiting List',
                                    value: registerStats.waiting_list,
                                    detail: 'Prospective clients awaiting allocation',
                                    icon: Users,
                                    color: 'bg-blue-100 text-blue-700',
                                },
                            ].map(({ key, label, value, detail, icon: Icon, color }) => (
                                <Link key={key} href={registerHref(key)} preserveState className="group rounded-lg outline-none focus-visible:ring-2">
                                    <Card
                                        className={`group-hover:bg-muted/40 h-full border-0 shadow-none ring-1 transition-colors ${
                                            filters.register === key ? 'ring-primary ring-2' : 'ring-foreground/10'
                                        }`}
                                    >
                                        <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-2">
                                            <div>
                                                <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                                                <CardDescription className="mt-1">{detail}</CardDescription>
                                            </div>
                                            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                                                <Icon aria-hidden="true" className="size-5" />
                                            </span>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <p className="text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </section>

                        <nav aria-label="GAPS register tabs" className="bg-muted/30 flex max-w-full gap-1 overflow-x-auto rounded-lg border p-1">
                            {[
                                {
                                    key: '',
                                    label: resource.key === 'clients' ? 'All clients' : 'All allocations',
                                    icon: resource.key === 'clients' ? Users : Rows3,
                                },
                                { key: 'on_ground', label: 'On Ground', icon: MapPin },
                                { key: 'double_allocation', label: 'Double Allocation', icon: Layers },
                                { key: 'waiting_list', label: 'Waiting List', icon: Users },
                            ].map(({ key, label, icon: Icon }) => (
                                <Button
                                    key={key || 'all'}
                                    variant={(filters.register || '') === key ? 'default' : 'ghost'}
                                    size="sm"
                                    className="shrink-0"
                                    asChild
                                >
                                    <Link href={registerHref(key)} preserveState>
                                        <Icon aria-hidden="true" data-icon="inline-start" className="size-4" />
                                        {label}
                                    </Link>
                                </Button>
                            ))}
                        </nav>
                    </>
                )}

                {financeCards && <FinanceSummary cards={financeCards} />}

                <Card className="min-w-0 overflow-hidden">
                    <CardContent className="p-0">
                        {isFinance ? (
                            <FinanceFilters resourceKey={resource.key} filters={filters} options={options} />
                        ) : resource.key === 'payments' ? (
                            <>
                                <PaymentDirectoryFilters filters={filters} options={options} />
                                <div className="flex flex-wrap items-center gap-2 border-b p-4">
                                    <span className="text-muted-foreground mr-auto text-sm">
                                        {visibleSelected.length
                                            ? `${visibleSelected.length} payments selected on this page`
                                            : 'Export all matching payments, or select rows below'}
                                    </span>
                                    {visibleSelected.length > 0 && (
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedStandIds([])}>
                                            Clear selection
                                        </Button>
                                    )}
                                    <Button variant="excel" size="sm" asChild>
                                        <a href={exportStandsUrl('excel')}>
                                            <Sheet data-icon="inline-start" />
                                            Export Excel
                                        </a>
                                    </Button>
                                    <Button variant="pdf" size="sm" asChild>
                                        <a href={exportStandsUrl('pdf')}>
                                            <FileDown data-icon="inline-start" />
                                            Export PDF
                                        </a>
                                    </Button>
                                </div>
                            </>
                        ) : resource.key === 'stands' ? (
                            <>
                                <StandDirectoryFilters filters={filters} options={options} />
                                <div className="flex flex-wrap items-center gap-2 border-b p-4">
                                    <span className="text-muted-foreground mr-auto text-sm">
                                        {visibleSelected.length
                                            ? `${visibleSelected.length} stands selected on this page`
                                            : 'Export all matching stands, or select rows below'}
                                    </span>
                                    {visibleSelected.length > 0 && (
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedStandIds([])}>
                                            Clear selection
                                        </Button>
                                    )}
                                    <Button variant="excel" size="sm" asChild>
                                        <a href={exportStandsUrl('excel')}>
                                            <Sheet data-icon="inline-start" />
                                            Export Excel
                                        </a>
                                    </Button>
                                    <Button variant="pdf" size="sm" asChild>
                                        <a href={exportStandsUrl('pdf')}>
                                            <FileDown data-icon="inline-start" />
                                            Export PDF
                                        </a>
                                    </Button>
                                </div>
                            </>
                        ) : resource.key === 'clients' && !registerView ? (
                            <>
                                <ClientDirectoryFilters filters={filters} branches={options.branches ?? []} total={records.total} />
                                <div className="flex flex-wrap items-center gap-2 border-b p-4">
                                    <span className="text-muted-foreground mr-auto text-sm">
                                        {visibleSelected.length
                                            ? `${visibleSelected.length} clients selected on this page`
                                            : 'Export all matching clients, or select rows below'}
                                    </span>
                                    {visibleSelected.length > 0 && (
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedStandIds([])}>
                                            Clear selection
                                        </Button>
                                    )}
                                    {canBulkSms && (
                                        <Button size="sm" asChild>
                                            <Link href={bulkSmsUrl()}>
                                                <MessageSquareText data-icon="inline-start" />
                                                Bulk SMS
                                            </Link>
                                        </Button>
                                    )}
                                    <Button variant="excel" size="sm" asChild>
                                        <a href={exportStandsUrl('excel')}>
                                            <Sheet data-icon="inline-start" />
                                            Export Excel
                                        </a>
                                    </Button>
                                    <Button variant="pdf" size="sm" asChild>
                                        <a href={exportStandsUrl('pdf')}>
                                            <FileDown data-icon="inline-start" />
                                            Export PDF
                                        </a>
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-3 border-b p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <form onSubmit={runSearch} className="flex w-full flex-col gap-2 lg:flex-row">
                                        <div className="relative flex-1">
                                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                            <Input
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                                className="h-9 pl-9"
                                                placeholder={
                                                    hasAdvancedFilters
                                                        ? 'Stand number, client name, phone or reference…'
                                                        : `Search ${resource.title.toLowerCase()}…`
                                                }
                                            />
                                        </div>
                                        {hasAdvancedFilters && (
                                            <>
                                                <Select value={branch} onValueChange={setBranch}>
                                                    <SelectTrigger className="h-9 lg:w-44" aria-label="Filter by branch">
                                                        <SelectValue placeholder="All branches" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem value="all">All branches</SelectItem>
                                                            {(options.branches ?? []).map((option) => (
                                                                <SelectItem key={String(option.value)} value={String(option.value)}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                {!registerView && (
                                                    <Select value={status} onValueChange={setStatus}>
                                                        <SelectTrigger className="h-9 lg:w-40" aria-label="Filter by status">
                                                            <SelectValue placeholder="All statuses" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectGroup>
                                                                <SelectItem value="all">All statuses</SelectItem>
                                                                {(statusOptions[resource.key] ?? []).map((value) => (
                                                                    <SelectItem key={value} value={value} className="capitalize">
                                                                        {value.replaceAll('_', ' ')}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </>
                                        )}
                                        <Button type="submit" variant="outline" size="sm">
                                            <Search data-icon="inline-start" /> Search
                                        </Button>
                                        {registerView && (
                                            <Button
                                                type="button"
                                                variant={registerAdvancedActive ? 'default' : 'outline'}
                                                size="sm"
                                                aria-expanded={showRegisterAdvanced}
                                                onClick={() => setShowRegisterAdvanced((open) => !open)}
                                            >
                                                <SlidersHorizontal data-icon="inline-start" /> Advanced
                                            </Button>
                                        )}
                                        {hasAdvancedFilters && anyDirectoryFilterActive && (
                                            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                                                <X data-icon="inline-start" /> Clear
                                            </Button>
                                        )}
                                    </form>
                                    <p className="text-muted-foreground shrink-0 text-xs">
                                        {records.total} record{records.total === 1 ? '' : 's'}
                                    </p>
                                </div>
                                {registerView && showRegisterAdvanced && (
                                    <div className="grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                                        <Field>
                                            <FieldLabel htmlFor="register_cooperative">Co-operative</FieldLabel>
                                            <Input
                                                id="register_cooperative"
                                                value={registerAdvanced.cooperative}
                                                onChange={(event) =>
                                                    setRegisterAdvanced((current) => ({ ...current, cooperative: event.target.value }))
                                                }
                                                placeholder="Name contains…"
                                            />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Field>
                                                <FieldLabel htmlFor="register_area_min">Min m²</FieldLabel>
                                                <Input
                                                    id="register_area_min"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={registerAdvanced.area_min}
                                                    onChange={(event) =>
                                                        setRegisterAdvanced((current) => ({ ...current, area_min: event.target.value }))
                                                    }
                                                />
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="register_area_max">Max m²</FieldLabel>
                                                <Input
                                                    id="register_area_max"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={registerAdvanced.area_max}
                                                    onChange={(event) =>
                                                        setRegisterAdvanced((current) => ({ ...current, area_max: event.target.value }))
                                                    }
                                                />
                                            </Field>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Field>
                                                <FieldLabel htmlFor="register_balance_min">Min balance</FieldLabel>
                                                <Input
                                                    id="register_balance_min"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={registerAdvanced.balance_min}
                                                    onChange={(event) =>
                                                        setRegisterAdvanced((current) => ({ ...current, balance_min: event.target.value }))
                                                    }
                                                />
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="register_balance_max">Max balance</FieldLabel>
                                                <Input
                                                    id="register_balance_max"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={registerAdvanced.balance_max}
                                                    onChange={(event) =>
                                                        setRegisterAdvanced((current) => ({ ...current, balance_max: event.target.value }))
                                                    }
                                                />
                                            </Field>
                                        </div>
                                        <Field>
                                            <FieldLabel>Payment activity</FieldLabel>
                                            <Select
                                                value={registerAdvanced.payment_state}
                                                onValueChange={(value) => setRegisterAdvanced((current) => ({ ...current, payment_state: value }))}
                                            >
                                                <SelectTrigger aria-label="Filter by payment activity">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All payment activity</SelectItem>
                                                    <SelectItem value="with_payments">Has payments</SelectItem>
                                                    <SelectItem value="no_payments">No payments</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field>
                                            <FieldLabel>Contact availability</FieldLabel>
                                            <Select
                                                value={registerAdvanced.contact_state}
                                                onValueChange={(value) => setRegisterAdvanced((current) => ({ ...current, contact_state: value }))}
                                            >
                                                <SelectTrigger aria-label="Filter by contact availability">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All contacts</SelectItem>
                                                    <SelectItem value="with_contact">Has contact</SelectItem>
                                                    <SelectItem value="without_contact">No contact</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="register_payment_from">Last payment from</FieldLabel>
                                            <Input
                                                id="register_payment_from"
                                                type="date"
                                                value={registerAdvanced.last_payment_from}
                                                onChange={(event) =>
                                                    setRegisterAdvanced((current) => ({ ...current, last_payment_from: event.target.value }))
                                                }
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="register_payment_to">Last payment to</FieldLabel>
                                            <Input
                                                id="register_payment_to"
                                                type="date"
                                                value={registerAdvanced.last_payment_to}
                                                onChange={(event) =>
                                                    setRegisterAdvanced((current) => ({ ...current, last_payment_to: event.target.value }))
                                                }
                                            />
                                        </Field>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="max-w-full overflow-x-auto">
                            <Table pagination={false} className={registerView ? 'min-w-[1500px]' : undefined}>
                                <TableHeader>
                                    <TableRow>
                                        {selectable && (
                                            <TableHead className="w-10">
                                                <Checkbox
                                                    aria-label={`Select all ${resource.key} on this page`}
                                                    checked={
                                                        records.data.length > 0 && visibleSelected.length === records.data.length
                                                            ? true
                                                            : visibleSelected.length
                                                              ? 'indeterminate'
                                                              : false
                                                    }
                                                    onCheckedChange={(checked) =>
                                                        setSelectedStandIds(checked === true ? records.data.map((row) => String(row.id)) : [])
                                                    }
                                                />
                                            </TableHead>
                                        )}
                                        {resource.columns.map((column) => (
                                            <TableHead key={column.key}>{column.label}</TableHead>
                                        ))}
                                        {hasActions && <TableHead className="w-36 text-right">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.data.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={resource.columns.length + (hasActions ? 1 : 0) + (selectable ? 1 : 0)}
                                                className="text-muted-foreground h-32 text-center"
                                            >
                                                No records found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {records.data.map((record) => {
                                        const registerAction = registerView
                                            ? resource.key === 'stand-allocations'
                                                ? (parseRegisterAction(record.allocation_action) ?? parseRegisterAction(record.client_action))
                                                : parseRegisterAction(record.client_action)
                                            : null;

                                        return (
                                            <TableRow key={String(record.id ?? record.code)}>
                                                {selectable && (
                                                    <TableCell>
                                                        <Checkbox
                                                            aria-label={`Select ${resource.key === 'clients' ? record.client_no : resource.key === 'payments' ? (record.external_reference ?? record.id) : record.stand_no}`}
                                                            checked={visibleSelected.includes(String(record.id))}
                                                            onCheckedChange={(checked) =>
                                                                setSelectedStandIds((ids) =>
                                                                    checked
                                                                        ? [...new Set([...ids, String(record.id)])]
                                                                        : ids.filter((id) => id !== String(record.id)),
                                                                )
                                                            }
                                                        />
                                                    </TableCell>
                                                )}
                                                {resource.columns.map((column) => (
                                                    <TableCell
                                                        key={column.key}
                                                        className={column.key === resource.columns[0]?.key ? 'font-medium' : ''}
                                                    >
                                                        {displayValue(record[column.key], column.badge, column.key, resource.key)}
                                                    </TableCell>
                                                ))}
                                                {hasActions && (
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {registerView && registerAction && (
                                                                <>
                                                                    <Button variant="view" size="sm" className="h-8" asChild>
                                                                        <Link href={registerAction.detail_url} aria-label="View details">
                                                                            <Eye data-icon="inline-start" />
                                                                            View
                                                                        </Link>
                                                                    </Button>
                                                                    {canManage && registerAction.resource === resource.key && (
                                                                        <>
                                                                            <Button
                                                                                variant="edit"
                                                                                size="sm"
                                                                                className="h-8"
                                                                                onClick={() => beginEdit(registerAction.record)}
                                                                                aria-label="Edit record"
                                                                            >
                                                                                <Pencil data-icon="inline-start" />
                                                                                Edit
                                                                            </Button>
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                className="h-8"
                                                                                onClick={() => remove(registerAction.record)}
                                                                                aria-label="Deactivate record"
                                                                            >
                                                                                <Trash2 data-icon="inline-start" />
                                                                                Deactivate
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                            {isFinance && (
                                                                <Button variant="view" size="sm" className="h-8" onClick={() => setViewing(record)}>
                                                                    <Eye className="size-4" />
                                                                    View
                                                                </Button>
                                                            )}
                                                            {!registerView && resource.detailsEnabled && (
                                                                <Button variant="view" size="sm" className="h-8" asChild>
                                                                    <Link
                                                                        href={`/administration/${resource.key}/${String(record.id)}`}
                                                                        aria-label="View details"
                                                                    >
                                                                        <Eye data-icon="inline-start" />
                                                                        View
                                                                    </Link>
                                                                </Button>
                                                            )}
                                                            {!registerView && canManage && (
                                                                <>
                                                                    <Button
                                                                        variant="edit"
                                                                        size="sm"
                                                                        className="h-8"
                                                                        onClick={() => beginEdit(record)}
                                                                        aria-label="Edit record"
                                                                    >
                                                                        <Pencil data-icon="inline-start" />
                                                                        Edit
                                                                    </Button>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="h-8"
                                                                        onClick={() => remove(record)}
                                                                        aria-label="Deactivate record"
                                                                    >
                                                                        <Trash2 data-icon="inline-start" />
                                                                        Deactivate
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {records.total >= 10 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                                <p className="text-muted-foreground text-xs">
                                    Showing {records.from ?? 0}–{records.to ?? 0} of {records.total}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-muted-foreground text-xs">Rows per page</span>
                                    <Select
                                        value={filters.per_page || '10'}
                                        onValueChange={(value) =>
                                            router.get(
                                                `/administration/${resource.key}`,
                                                { ...filters, per_page: value },
                                                { preserveState: true, preserveScroll: true, replace: true },
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-20" aria-label="Rows per page">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {[10, 20, 50, 100].map((value) => (
                                                    <SelectItem key={value} value={String(value)}>
                                                        {value}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {records.links.map((link, index) => (
                                        <Button
                                            key={`${link.label}-${index}`}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            asChild={Boolean(link.url)}
                                        >
                                            {link.url ? (
                                                <Link href={link.url} preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} />
                                            ) : (
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog
                open={Boolean(viewing)}
                onOpenChange={(open) => {
                    if (!open) setViewing(null);
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt aria-hidden="true" className="text-muted-foreground size-5" />
                            {resource.title} · Record #{String(viewing?.id ?? '')}
                        </DialogTitle>
                        <DialogDescription>Recorded details for this branch. Amounts are shown in the record currency.</DialogDescription>
                    </DialogHeader>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        {[
                            ...resource.columns,
                            ...resource.fields
                                .filter((field) => !resource.columns.some((column) => column.key === field.name) && !field.name.endsWith('_id'))
                                .map((field) => ({ key: field.name, label: field.label })),
                        ].map((column) => (
                            <div key={column.key} className="min-w-0 rounded-lg border p-3">
                                <FinanceDetailLabel field={column.key} label={column.label} />
                                <dd className="font-medium break-words">
                                    {viewing && displayValue(viewing[column.key], false, column.key, resource.key)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setViewing(null)}>
                            <X aria-hidden="true" className="size-4" />
                            Close
                        </Button>
                        {canManage && viewing && (
                            <Button
                                variant="edit"
                                onClick={() => {
                                    const record = viewing;
                                    setViewing(null);
                                    beginEdit(record);
                                }}
                            >
                                <Pencil className="size-4" />
                                Edit record
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={dialogOpen}
                onOpenChange={(next) => {
                    if (next) setDialogOpen(true);
                }}
            >
                <DialogContent
                    showCloseButton={false}
                    className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-5xl"
                    onEscapeKeyDown={(event) => event.preventDefault()}
                    onPointerDownOutside={(event) => event.preventDefault()}
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${resource.title}` : `Add ${resource.title}`}</DialogTitle>
                        <DialogDescription>Fields marked with an asterisk are required. Every saved change is audited.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {resource.fields.map((field) => {
                                const value = form.data[field.name];
                                const error = form.errors[field.name];
                                const fullWidth = field.type === 'textarea' || field.type === 'multiselect';
                                return (
                                    <Field
                                        key={field.name}
                                        data-invalid={Boolean(error)}
                                        className={fullWidth ? 'sm:col-span-2 lg:col-span-3' : undefined}
                                    >
                                        {field.type === 'checkbox' ? (
                                            <div className="flex items-center gap-2 rounded-md border p-3">
                                                <Checkbox
                                                    id={field.name}
                                                    checked={Boolean(value)}
                                                    aria-invalid={Boolean(error)}
                                                    onCheckedChange={(checked) => form.setData(field.name, checked === true)}
                                                />
                                                <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
                                            </div>
                                        ) : field.type === 'multiselect' ? (
                                            <>
                                                <FieldLabel>{field.label}</FieldLabel>
                                                <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                                                    {fieldOptions(field).map((option) => {
                                                        const selected = Array.isArray(value) && value.map(String).includes(String(option.value));
                                                        return (
                                                            <label
                                                                key={String(option.value)}
                                                                className="flex cursor-pointer items-center gap-2 text-sm"
                                                            >
                                                                <Checkbox
                                                                    checked={selected}
                                                                    aria-invalid={Boolean(error)}
                                                                    onCheckedChange={(checked) => {
                                                                        const current = Array.isArray(value) ? value : [];
                                                                        form.setData(
                                                                            field.name,
                                                                            checked === true
                                                                                ? [...current, option.value]
                                                                                : current.filter((item) => String(item) !== String(option.value)),
                                                                        );
                                                                    }}
                                                                />
                                                                {option.label}
                                                            </label>
                                                        );
                                                    })}
                                                    {fieldOptions(field).length === 0 && (
                                                        <p className="text-muted-foreground text-sm">No options available.</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <FieldLabel htmlFor={field.name}>
                                                    {field.label}
                                                    {field.required ? ' *' : ''}
                                                </FieldLabel>
                                                {field.type === 'textarea' ? (
                                                    <Textarea
                                                        id={field.name}
                                                        value={String(value ?? '')}
                                                        aria-invalid={Boolean(error)}
                                                        onChange={(event) => form.setData(field.name, event.target.value)}
                                                        className="min-h-24"
                                                    />
                                                ) : field.type === 'select' && Boolean(field.options) ? (
                                                    <SearchableSelect
                                                        id={field.name}
                                                        value={value}
                                                        options={fieldOptions(field)}
                                                        required={field.required}
                                                        invalid={Boolean(error)}
                                                        onChange={(selected) => form.setData(field.name, selected)}
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <Select
                                                        value={value === '' || value === null || value === undefined ? '__none__' : String(value)}
                                                        onValueChange={(selected) => {
                                                            if (selected === '__none__') return form.setData(field.name, '');
                                                            const match = fieldOptions(field).find((option) => String(option.value) === selected);
                                                            form.setData(field.name, match?.value ?? selected);
                                                        }}
                                                    >
                                                        <SelectTrigger id={field.name} className="h-9" aria-invalid={Boolean(error)}>
                                                            <SelectValue placeholder="Select an option" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectGroup>
                                                                {!field.required && <SelectItem value="__none__">None</SelectItem>}
                                                                {fieldOptions(field).map((option) => (
                                                                    <SelectItem key={String(option.value)} value={String(option.value)}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Input
                                                        id={field.name}
                                                        type={field.type ?? 'text'}
                                                        readOnly={field.readOnly}
                                                        placeholder={field.readOnly ? 'Generated on save' : undefined}
                                                        step={field.step}
                                                        value={String(value ?? '')}
                                                        aria-invalid={Boolean(error)}
                                                        onChange={(event) => form.setData(field.name, event.target.value)}
                                                        className="h-9"
                                                    />
                                                )}
                                                {field.help && <FieldDescription>{field.help}</FieldDescription>}
                                            </>
                                        )}
                                        <FieldError>{error}</FieldError>
                                    </Field>
                                );
                            })}
                        </FieldGroup>
                        <DialogFooter className="bg-muted/50 sticky -bottom-6 -mx-6 -mb-6 border-t px-6 py-4">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving…' : 'Save record'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
