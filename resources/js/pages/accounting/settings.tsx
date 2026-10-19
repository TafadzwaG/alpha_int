import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpenCheck,
    CalendarClock,
    CalendarRange,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    FileKey2,
    Landmark,
    LoaderCircle,
    Lock,
    Pencil,
    Percent,
    Plus,
    Settings2,
    ShieldCheck,
    TriangleAlert,
    Unlock,
} from 'lucide-react';
import moment from 'moment';
import { FormEvent, useMemo, useState } from 'react';

type Account = { id: number; code: string; name: string };
type Currency = { code: string; name: string; symbol: string; decimal_places: number };
type Period = {
    id: number;
    period_number: number;
    name: string;
    starts_on: string;
    ends_on: string;
    status: string;
    closed_at: string | null;
};
type FiscalYear = { id: number; name: string; starts_on: string; ends_on: string; status: string; periods: Period[] };
type TaxCode = {
    id: number;
    code: string;
    name: string;
    rate: number;
    type: string;
    active: boolean;
    input_account: Account | null;
    output_account: Account | null;
};
type AccountingSettings = {
    base_currency_code: string;
    fiscal_year_start_month: number;
    default_tax_code: string | null;
    default_payment_terms_days: number;
    journal_prefix: string;
    source_posting_mode: string;
    updated_at: string | null;
};
type Props = {
    fiscalYears: FiscalYear[];
    taxCodes: TaxCode[];
    accounts: Account[];
    currencies: Currency[];
    accountingSettings: AccountingSettings;
    permissions: { manage: boolean; closePeriod: boolean };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Accounting setup', href: '/accounting/settings' },
];

const monthOptions = moment.months().map((month, index) => ({ value: index + 1, label: month }));
const formatDate = (date: string) => moment.utc(date).format('D MMM YYYY');

export default function AccountingSettings({ fiscalYears, taxCodes, accounts, currencies, accountingSettings, permissions }: Props) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [taxOpen, setTaxOpen] = useState(false);
    const [selectedTax, setSelectedTax] = useState<TaxCode | null>(null);
    const [periodPending, setPeriodPending] = useState<Period | null>(null);
    const [periodProcessing, setPeriodProcessing] = useState(false);
    const currentYear = fiscalYears.find((year) => year.status === 'open') ?? fiscalYears[0];
    const currentPeriod = currentYear?.periods.find((period) =>
        moment().isBetween(moment.utc(period.starts_on), moment.utc(period.ends_on), 'day', '[]'),
    );
    const openPeriods = fiscalYears.flatMap((year) => year.periods).filter((period) => period.status === 'open').length;
    const activeTaxCodes = taxCodes.filter((tax) => tax.active).length;

    const settingsForm = useForm({
        base_currency_code: accountingSettings.base_currency_code,
        fiscal_year_start_month: accountingSettings.fiscal_year_start_month,
        default_tax_code: accountingSettings.default_tax_code ?? '',
        default_payment_terms_days: accountingSettings.default_payment_terms_days,
        journal_prefix: accountingSettings.journal_prefix,
        source_posting_mode: accountingSettings.source_posting_mode,
    });
    const taxForm = useForm({
        code: '',
        name: '',
        rate: '0',
        type: 'vat',
        input_account_id: '',
        output_account_id: '',
        active: true as boolean,
    });

    const defaultTax = useMemo(() => taxCodes.find((tax) => tax.code === accountingSettings.default_tax_code), [accountingSettings, taxCodes]);

    const submitSettings = (event: FormEvent) => {
        event.preventDefault();
        settingsForm.patch('/accounting/settings', {
            preserveScroll: true,
            onSuccess: () => setSettingsOpen(false),
        });
    };

    const openCreateTax = () => {
        setSelectedTax(null);
        taxForm.clearErrors();
        taxForm.setData({ code: '', name: '', rate: '0', type: 'vat', input_account_id: '', output_account_id: '', active: true });
        setTaxOpen(true);
    };

    const openEditTax = (tax: TaxCode) => {
        setSelectedTax(tax);
        taxForm.clearErrors();
        taxForm.setData({
            code: tax.code,
            name: tax.name,
            rate: String(tax.rate),
            type: tax.type,
            input_account_id: tax.input_account ? String(tax.input_account.id) : '',
            output_account_id: tax.output_account ? String(tax.output_account.id) : '',
            active: tax.active,
        });
        setTaxOpen(true);
    };

    const submitTax = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setTaxOpen(false);
                setSelectedTax(null);
                taxForm.reset();
            },
        };
        if (selectedTax) {
            taxForm.patch(`/accounting/tax-codes/${selectedTax.id}`, options);
            return;
        }
        taxForm.post('/accounting/tax-codes', options);
    };

    const confirmPeriodChange = () => {
        if (!periodPending) return;
        setPeriodProcessing(true);
        router.patch(
            `/accounting/periods/${periodPending.id}`,
            { status: periodPending.status === 'open' ? 'closed' : 'open' },
            {
                preserveScroll: true,
                onSuccess: () => setPeriodPending(null),
                onFinish: () => setPeriodProcessing(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounting setup" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <Card className="border-primary/20 bg-primary text-primary-foreground overflow-hidden shadow-sm">
                    <CardHeader className="gap-5 md:flex-row md:items-end md:justify-between">
                        <div className="flex max-w-2xl flex-col gap-2">
                            <Badge variant="secondary" className="w-fit">
                                Financial control centre
                            </Badge>
                            <div>
                                <CardTitle className="text-2xl">Accounting setup</CardTitle>
                                <CardDescription className="text-primary-foreground/75 mt-1">
                                    Govern reporting currency, fiscal periods, posting behaviour and tax mappings from one controlled workspace.
                                </CardDescription>
                            </div>
                        </div>
                        {permissions.manage && (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
                                    <Settings2 data-icon="inline-start" />
                                    Edit controls
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
                                    onClick={openCreateTax}
                                >
                                    <Plus data-icon="inline-start" />
                                    New tax code
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ControlStat
                        icon={CircleDollarSign}
                        label="Reporting currency"
                        value={accountingSettings.base_currency_code}
                        note="Organisation base currency"
                    />
                    <ControlStat
                        icon={CalendarRange}
                        label="Current fiscal year"
                        value={currentYear?.name ?? 'Not configured'}
                        note={currentPeriod?.name ?? 'No current period'}
                    />
                    <ControlStat
                        icon={Unlock}
                        label="Open periods"
                        value={String(openPeriods)}
                        note={`${fiscalYears.length} fiscal year${fiscalYears.length === 1 ? '' : 's'} configured`}
                    />
                    <ControlStat icon={Percent} label="Active tax codes" value={String(activeTaxCodes)} note={`${taxCodes.length} total mappings`} />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                    <Card>
                        <CardHeader className="flex-row items-start justify-between gap-3">
                            <div>
                                <CardTitle>Control profile</CardTitle>
                                <CardDescription>Defaults applied across the accounting workspace.</CardDescription>
                            </div>
                            <ShieldCheck className="text-muted-foreground size-5" />
                        </CardHeader>
                        <CardContent className="flex flex-col gap-1">
                            <SettingRow
                                icon={Landmark}
                                label="Base currency"
                                value={accountingSettings.base_currency_code}
                                detail="Financial statements and base ledger values"
                            />
                            <SettingRow
                                icon={CalendarClock}
                                label="Fiscal year starts"
                                value={monthOptions[accountingSettings.fiscal_year_start_month - 1]?.label ?? 'January'}
                                detail="Controls the reporting-year convention"
                            />
                            <SettingRow
                                icon={Percent}
                                label="Default tax"
                                value={defaultTax ? `${defaultTax.code} · ${Number(defaultTax.rate).toFixed(2)}%` : 'No default'}
                                detail="Preselected on eligible source documents"
                            />
                            <SettingRow
                                icon={Clock3}
                                label="Supplier terms"
                                value={`${accountingSettings.default_payment_terms_days} days`}
                                detail="Default due-date window for new suppliers"
                            />
                            <SettingRow
                                icon={FileKey2}
                                label="Journal prefix"
                                value={accountingSettings.journal_prefix}
                                detail="Manual journal numbering convention"
                            />
                            <SettingRow
                                icon={BookOpenCheck}
                                label="Source posting"
                                value={accountingSettings.source_posting_mode === 'automatic' ? 'Automatic' : 'Manual review'}
                                detail="Operational documents to general ledger"
                            />
                            <div className="bg-muted/50 text-muted-foreground mt-3 rounded-md px-3 py-2 text-xs">
                                {accountingSettings.updated_at
                                    ? `Last changed ${moment(accountingSettings.updated_at).format('D MMM YYYY [at] HH:mm')}`
                                    : 'Using the default accounting control profile'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-start justify-between gap-3">
                            <div>
                                <CardTitle>Fiscal calendar</CardTitle>
                                <CardDescription>Close completed periods to prevent new ledger postings.</CardDescription>
                            </div>
                            {currentYear && <Badge variant={currentYear.status === 'open' ? 'default' : 'secondary'}>{currentYear.status}</Badge>}
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {fiscalYears.map((year) => (
                                <section key={year.id} className="flex flex-col gap-3">
                                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                                        <div>
                                            <p className="font-semibold">{year.name}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {formatDate(year.starts_on)} – {formatDate(year.ends_on)}
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            {year.periods.filter((period) => period.status === 'closed').length}/{year.periods.length} closed
                                        </Badge>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {year.periods.map((period) => {
                                            const isCurrent = currentPeriod?.id === period.id;
                                            const isOpen = period.status === 'open';
                                            return (
                                                <div
                                                    key={period.id}
                                                    className="bg-card flex items-center justify-between gap-3 rounded-md border p-3 shadow-xs"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="truncate text-sm font-medium">
                                                                {moment.utc(period.starts_on).format('MMM')}
                                                            </span>
                                                            {isCurrent && <Badge variant="secondary">Current</Badge>}
                                                        </div>
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            {moment.utc(period.starts_on).format('D MMM')} –{' '}
                                                            {moment.utc(period.ends_on).format('D MMM')}
                                                        </p>
                                                    </div>
                                                    {permissions.closePeriod ? (
                                                        <Button
                                                            size="icon"
                                                            variant={isOpen ? 'outline' : 'secondary'}
                                                            aria-label={`${isOpen ? 'Close' : 'Reopen'} ${period.name}`}
                                                            onClick={() => setPeriodPending(period)}
                                                        >
                                                            {isOpen ? <Unlock /> : <Lock />}
                                                        </Button>
                                                    ) : isOpen ? (
                                                        <Unlock className="text-muted-foreground size-4" />
                                                    ) : (
                                                        <Lock className="text-muted-foreground size-4" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex-row items-start justify-between gap-3">
                        <div>
                            <CardTitle>Tax code register</CardTitle>
                            <CardDescription>Reusable input and output tax mappings for supplier bills and sales documents.</CardDescription>
                        </div>
                        <Percent className="text-muted-foreground size-5" />
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-md border">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead>Input account</TableHead>
                                        <TableHead>Output account</TableHead>
                                        <TableHead>Status</TableHead>
                                        {permissions.manage && <TableHead className="text-right">Action</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {taxCodes.map((tax) => (
                                        <TableRow key={tax.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-semibold">{tax.code}</span>
                                                    {tax.code === accountingSettings.default_tax_code && <Badge variant="secondary">Default</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell>{tax.name}</TableCell>
                                            <TableCell className="capitalize">{tax.type}</TableCell>
                                            <TableCell className="text-right font-medium">{Number(tax.rate).toFixed(2)}%</TableCell>
                                            <TableCell>{tax.input_account ? `${tax.input_account.code} · ${tax.input_account.name}` : '—'}</TableCell>
                                            <TableCell>
                                                {tax.output_account ? `${tax.output_account.code} · ${tax.output_account.name}` : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={tax.active ? 'default' : 'outline'}>{tax.active ? 'Active' : 'Inactive'}</Badge>
                                            </TableCell>
                                            {permissions.manage && (
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="outline" onClick={() => openEditTax(tax)}>
                                                        <Pencil data-icon="inline-start" />
                                                        Edit
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog
                open={periodPending !== null}
                onOpenChange={(open) => {
                    if (!open && !periodProcessing) setPeriodPending(null);
                }}
            >
                <AlertDialogContent className="max-w-md overflow-hidden p-0">
                    {periodPending && (
                        <>
                            <div className="flex flex-col gap-4 p-6">
                                <div
                                    className={`flex size-11 items-center justify-center rounded-full ${
                                        periodPending.status === 'open' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                                    }`}
                                >
                                    {periodPending.status === 'open' ? <TriangleAlert className="size-5" /> : <Unlock className="size-5" />}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <AlertDialogTitle className="text-lg font-semibold">
                                        {periodPending.status === 'open' ? `Close ${periodPending.name}?` : `Reopen ${periodPending.name}?`}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground text-sm leading-6">
                                        {periodPending.status === 'open'
                                            ? `This will stop all new manual and automated journal postings dated ${formatDate(periodPending.starts_on)} to ${formatDate(periodPending.ends_on)}.`
                                            : `This will allow new journal postings dated ${formatDate(periodPending.starts_on)} to ${formatDate(periodPending.ends_on)} again.`}
                                    </AlertDialogDescription>
                                </div>
                                <div className="bg-muted/40 rounded-lg border p-4">
                                    <p className="text-sm font-medium">What happens next</p>
                                    <ul className="text-muted-foreground mt-3 flex flex-col gap-2.5 text-sm">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                                            <span>
                                                {periodPending.status === 'open'
                                                    ? 'Existing posted journals and financial reports remain unchanged.'
                                                    : 'Authorised users can create and post entries into this period.'}
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                                            <span>
                                                {periodPending.status === 'open'
                                                    ? 'Any draft journals in this period must be posted or removed first.'
                                                    : 'The period can be closed again after corrections are completed.'}
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
                                            <span>This control change is recorded in the audit trail with your user and time.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="bg-muted/50 flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                                <AlertDialogCancel asChild>
                                    <Button type="button" variant="secondary" disabled={periodProcessing}>
                                        Keep period {periodPending.status === 'open' ? 'open' : 'closed'}
                                    </Button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                    <Button
                                        type="button"
                                        variant={periodPending.status === 'open' ? 'destructive' : 'default'}
                                        disabled={periodProcessing}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            confirmPeriodChange();
                                        }}
                                    >
                                        {periodProcessing && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
                                        {periodPending.status === 'open' ? 'Close period' : 'Reopen period'}
                                    </Button>
                                </AlertDialogAction>
                            </div>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={settingsOpen} onOpenChange={(open) => !settingsForm.processing && setSettingsOpen(open)}>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" onInteractOutside={(event) => event.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Edit accounting controls</DialogTitle>
                        <DialogDescription>
                            These organisation-wide defaults affect new accounting activity. Every change is retained in the audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitSettings} className="flex flex-col gap-5">
                        <FieldGroup className="grid gap-5 sm:grid-cols-2">
                            <Field data-invalid={Boolean(settingsForm.errors.base_currency_code)}>
                                <FieldLabel>Base currency</FieldLabel>
                                <Select
                                    value={settingsForm.data.base_currency_code}
                                    onValueChange={(value) => settingsForm.setData('base_currency_code', value)}
                                >
                                    <SelectTrigger aria-invalid={Boolean(settingsForm.errors.base_currency_code)}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {currencies.map((currency) => (
                                                <SelectItem key={currency.code} value={currency.code}>
                                                    {currency.code} · {currency.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldDescription>Used for base ledger values and reports.</FieldDescription>
                                <FieldError>{settingsForm.errors.base_currency_code}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(settingsForm.errors.fiscal_year_start_month)}>
                                <FieldLabel>Fiscal year starts</FieldLabel>
                                <Select
                                    value={String(settingsForm.data.fiscal_year_start_month)}
                                    onValueChange={(value) => settingsForm.setData('fiscal_year_start_month', Number(value))}
                                >
                                    <SelectTrigger aria-invalid={Boolean(settingsForm.errors.fiscal_year_start_month)}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {monthOptions.map((month) => (
                                                <SelectItem key={month.value} value={String(month.value)}>
                                                    {month.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{settingsForm.errors.fiscal_year_start_month}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(settingsForm.errors.default_tax_code)}>
                                <FieldLabel>Default tax code</FieldLabel>
                                <Select
                                    value={settingsForm.data.default_tax_code}
                                    onValueChange={(value) => settingsForm.setData('default_tax_code', value)}
                                >
                                    <SelectTrigger aria-invalid={Boolean(settingsForm.errors.default_tax_code)}>
                                        <SelectValue placeholder="Select a tax code" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {taxCodes
                                                .filter((tax) => tax.active)
                                                .map((tax) => (
                                                    <SelectItem key={tax.id} value={tax.code}>
                                                        {tax.code} · {tax.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{settingsForm.errors.default_tax_code}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(settingsForm.errors.default_payment_terms_days)}>
                                <FieldLabel htmlFor="default_payment_terms_days">Default supplier terms</FieldLabel>
                                <Input
                                    id="default_payment_terms_days"
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={settingsForm.data.default_payment_terms_days}
                                    aria-invalid={Boolean(settingsForm.errors.default_payment_terms_days)}
                                    onChange={(event) => settingsForm.setData('default_payment_terms_days', Number(event.target.value))}
                                />
                                <FieldDescription>Number of days before a new supplier bill is due.</FieldDescription>
                                <FieldError>{settingsForm.errors.default_payment_terms_days}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(settingsForm.errors.journal_prefix)}>
                                <FieldLabel htmlFor="journal_prefix">Journal prefix</FieldLabel>
                                <Input
                                    id="journal_prefix"
                                    maxLength={10}
                                    value={settingsForm.data.journal_prefix}
                                    aria-invalid={Boolean(settingsForm.errors.journal_prefix)}
                                    onChange={(event) =>
                                        settingsForm.setData('journal_prefix', event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
                                    }
                                />
                                <FieldDescription>Uppercase letters, numbers and hyphens only.</FieldDescription>
                                <FieldError>{settingsForm.errors.journal_prefix}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(settingsForm.errors.source_posting_mode)}>
                                <FieldLabel>Source document posting</FieldLabel>
                                <Select
                                    value={settingsForm.data.source_posting_mode}
                                    onValueChange={(value) => settingsForm.setData('source_posting_mode', value)}
                                >
                                    <SelectTrigger aria-invalid={Boolean(settingsForm.errors.source_posting_mode)}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="automatic">Automatic posting</SelectItem>
                                            <SelectItem value="manual">Manual review</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{settingsForm.errors.source_posting_mode}</FieldError>
                            </Field>
                        </FieldGroup>
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={settingsForm.processing}>
                                <CheckCircle2 data-icon="inline-start" />
                                Save controls
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={taxOpen} onOpenChange={(open) => !taxForm.processing && setTaxOpen(open)}>
                <DialogContent className="max-w-2xl" onInteractOutside={(event) => event.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{selectedTax ? `Edit ${selectedTax.code}` : 'Create tax code'}</DialogTitle>
                        <DialogDescription>Map this code to the appropriate tax control accounts.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitTax} className="flex flex-col gap-5">
                        <FieldGroup className="grid gap-5 sm:grid-cols-2">
                            <Field data-invalid={Boolean(taxForm.errors.code)}>
                                <FieldLabel htmlFor="tax_code">Code</FieldLabel>
                                <Input
                                    id="tax_code"
                                    value={taxForm.data.code}
                                    aria-invalid={Boolean(taxForm.errors.code)}
                                    onChange={(event) => taxForm.setData('code', event.target.value.toUpperCase())}
                                />
                                <FieldError>{taxForm.errors.code}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(taxForm.errors.name)}>
                                <FieldLabel htmlFor="tax_name">Name</FieldLabel>
                                <Input
                                    id="tax_name"
                                    value={taxForm.data.name}
                                    aria-invalid={Boolean(taxForm.errors.name)}
                                    onChange={(event) => taxForm.setData('name', event.target.value)}
                                />
                                <FieldError>{taxForm.errors.name}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(taxForm.errors.rate)}>
                                <FieldLabel htmlFor="tax_rate">Rate (%)</FieldLabel>
                                <Input
                                    id="tax_rate"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.0001"
                                    value={taxForm.data.rate}
                                    aria-invalid={Boolean(taxForm.errors.rate)}
                                    onChange={(event) => taxForm.setData('rate', event.target.value)}
                                />
                                <FieldError>{taxForm.errors.rate}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(taxForm.errors.type)}>
                                <FieldLabel>Type</FieldLabel>
                                <Select value={taxForm.data.type} onValueChange={(value) => taxForm.setData('type', value)}>
                                    <SelectTrigger aria-invalid={Boolean(taxForm.errors.type)}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {['vat', 'zero', 'exempt', 'withholding'].map((item) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{taxForm.errors.type}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(taxForm.errors.input_account_id)}>
                                <FieldLabel>Input tax account</FieldLabel>
                                <Select value={taxForm.data.input_account_id} onValueChange={(value) => taxForm.setData('input_account_id', value)}>
                                    <SelectTrigger aria-invalid={Boolean(taxForm.errors.input_account_id)}>
                                        <SelectValue placeholder="Optional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {accounts.map((account) => (
                                                <SelectItem key={account.id} value={String(account.id)}>
                                                    {account.code} · {account.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{taxForm.errors.input_account_id}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(taxForm.errors.output_account_id)}>
                                <FieldLabel>Output tax account</FieldLabel>
                                <Select value={taxForm.data.output_account_id} onValueChange={(value) => taxForm.setData('output_account_id', value)}>
                                    <SelectTrigger aria-invalid={Boolean(taxForm.errors.output_account_id)}>
                                        <SelectValue placeholder="Optional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {accounts.map((account) => (
                                                <SelectItem key={account.id} value={String(account.id)}>
                                                    {account.code} · {account.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{taxForm.errors.output_account_id}</FieldError>
                            </Field>
                            {selectedTax && (
                                <Field data-invalid={Boolean(taxForm.errors.active)}>
                                    <FieldLabel>Status</FieldLabel>
                                    <Select
                                        value={taxForm.data.active ? 'active' : 'inactive'}
                                        onValueChange={(value) => taxForm.setData('active', value === 'active')}
                                    >
                                        <SelectTrigger aria-invalid={Boolean(taxForm.errors.active)}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FieldError>{taxForm.errors.active}</FieldError>
                                </Field>
                            )}
                        </FieldGroup>
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setTaxOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={taxForm.processing || !taxForm.data.code || !taxForm.data.name}>
                                {selectedTax ? 'Save tax code' : 'Create tax code'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function ControlStat({ icon: Icon, label, value, note }: { icon: typeof Settings2; label: string; value: string; note: string }) {
    return (
        <Card>
            <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
                    <p className="mt-2 truncate text-xl font-semibold">{value}</p>
                    <p className="text-muted-foreground mt-1 truncate text-xs">{note}</p>
                </div>
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                </div>
            </CardContent>
        </Card>
    );
}

function SettingRow({ icon: Icon, label, value, detail }: { icon: typeof Settings2; label: string; value: string; detail: string }) {
    return (
        <div className="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors">
            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-muted-foreground truncate text-xs">{detail}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold">{value}</p>
        </div>
    );
}
