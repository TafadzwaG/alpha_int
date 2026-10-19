import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { BadgePercent, CircleGauge, HandCoins, Percent, Plus, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Option = { value: string; label: string };
type Policy = {
    id: number;
    name: string;
    base_annual_rate: number;
    grace_days: number;
    merit_window_months: number;
    merit_exemption_threshold: number;
    merit_discount_threshold: number;
    discounted_annual_rate: number;
    minimum_overdue_balance: number;
    active: boolean;
};
type Assessment = {
    account_id: number;
    account_no: string;
    client: string;
    client_no: string | null;
    branch: string | null;
    currency: string;
    merit_score: number | null;
    payments_reviewed: number;
    determined_rate: number;
    determination: string;
    overdue_balance: number;
    estimated_interest: number;
    oldest_due_date: string | null;
    exemption: { id: number; reason: string; rate_override: number; starts_on: string; ends_on: string | null } | null;
};
type Props = {
    policy: Policy;
    assessments: Assessment[];
    summary: { accounts: number; overdue_balance: number; estimated_interest: number; merit_exemptions: number; discounted_accounts: number };
    accountOptions: Option[];
    currency: string;
    permissions: { manage: boolean };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Interest review', href: '/accounting/interest-review' },
];
const money = (value: number, currency: string) =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
const determinationLabel: Record<string, string> = {
    standard: 'Standard rate',
    merit_discount: 'Merit discount',
    merit_exempt: 'Merit exempt',
    approved_exemption: 'Approved override',
    policy_inactive: 'Policy inactive',
};

export default function InterestReview({ policy, assessments, summary, accountOptions, currency, permissions }: Props) {
    const [exemptionOpen, setExemptionOpen] = useState(false);
    const policyForm = useForm({
        name: policy.name,
        base_annual_rate: String(policy.base_annual_rate),
        grace_days: String(policy.grace_days),
        merit_window_months: String(policy.merit_window_months),
        merit_exemption_threshold: String(policy.merit_exemption_threshold),
        merit_discount_threshold: String(policy.merit_discount_threshold),
        discounted_annual_rate: String(policy.discounted_annual_rate),
        minimum_overdue_balance: String(policy.minimum_overdue_balance),
        active: policy.active,
    });
    const exemptionForm = useForm({
        client_account_id: accountOptions[0]?.value ?? '',
        starts_on: new Date().toISOString().slice(0, 10),
        ends_on: '',
        rate_override: '0',
        reason: '',
    });
    const savePolicy = (event: FormEvent) => {
        event.preventDefault();
        policyForm.patch('/accounting/interest-policy', { preserveScroll: true });
    };
    const saveExemption = (event: FormEvent) => {
        event.preventDefault();
        exemptionForm.post('/accounting/interest-exemptions', {
            preserveScroll: true,
            onSuccess: () => {
                setExemptionOpen(false);
                exemptionForm.reset('ends_on', 'reason');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Interest review" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Payment merit controls
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Interest rates & exemptions</h1>
                        <p className="text-muted-foreground mt-1 max-w-3xl">
                            Determine overdue interest from payment performance, with explicit approved overrides that remain auditable.
                        </p>
                    </div>
                    {permissions.manage && (
                        <Button onClick={() => setExemptionOpen(true)} disabled={!accountOptions.length}>
                            <Plus data-icon="inline-start" /> Approve exemption
                        </Button>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Accounts reviewed', value: summary.accounts.toLocaleString(), icon: CircleGauge },
                        { label: 'Overdue principal', value: money(summary.overdue_balance, currency), icon: HandCoins },
                        { label: 'Estimated interest', value: money(summary.estimated_interest, currency), icon: Percent },
                        { label: 'Exempt accounts', value: summary.merit_exemptions.toLocaleString(), icon: ShieldCheck },
                        { label: 'Discounted accounts', value: summary.discounted_accounts.toLocaleString(), icon: BadgePercent },
                    ].map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                                <CardDescription>{label}</CardDescription>
                                <Icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-semibold tracking-tight">{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Determination policy</CardTitle>
                        <CardDescription>
                            Simple daily interest starts after the grace period. Payment merit is the percentage of reviewed charges settled by their
                            due date plus grace days.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={savePolicy} className="flex flex-col gap-4">
                            <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <Field className="sm:col-span-2">
                                    <FieldLabel>Policy name</FieldLabel>
                                    <Input
                                        value={policyForm.data.name}
                                        onChange={(event) => policyForm.setData('name', event.target.value)}
                                        disabled={!permissions.manage}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Base annual rate (%)</FieldLabel>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.0001"
                                        value={policyForm.data.base_annual_rate}
                                        onChange={(event) => policyForm.setData('base_annual_rate', event.target.value)}
                                        disabled={!permissions.manage}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Grace period (days)</FieldLabel>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="365"
                                        value={policyForm.data.grace_days}
                                        onChange={(event) => policyForm.setData('grace_days', event.target.value)}
                                        disabled={!permissions.manage}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Merit review window (months)</FieldLabel>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="36"
                                        value={policyForm.data.merit_window_months}
                                        onChange={(event) => policyForm.setData('merit_window_months', event.target.value)}
                                        disabled={!permissions.manage}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Full exemption threshold (%)</FieldLabel>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={policyForm.data.merit_exemption_threshold}
                                        onChange={(event) => policyForm.setData('merit_exemption_threshold', event.target.value)}
                                        disabled={!permissions.manage}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Discount threshold (%)</FieldLabel>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={policyForm.data.merit_discount_threshold}
                                        onChange={(event) => policyForm.setData('merit_discount_threshold', event.target.value)}
                                        disabled={!permissions.manage}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Discounted annual rate (%)</FieldLabel>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.0001"
                                        value={policyForm.data.discounted_annual_rate}
                                        onChange={(event) => policyForm.setData('discounted_annual_rate', event.target.value)}
                                        disabled={!permissions.manage}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Minimum overdue balance</FieldLabel>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={policyForm.data.minimum_overdue_balance}
                                        onChange={(event) => policyForm.setData('minimum_overdue_balance', event.target.value)}
                                        disabled={!permissions.manage}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Policy status</FieldLabel>
                                    <Select
                                        value={policyForm.data.active ? 'active' : 'inactive'}
                                        onValueChange={(value) => policyForm.setData('active', value === 'active')}
                                        disabled={!permissions.manage}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </FieldGroup>
                            <FieldError>{policyForm.errors.merit_discount_threshold || policyForm.errors.discounted_annual_rate}</FieldError>
                            {permissions.manage && (
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={policyForm.processing}>
                                        Save interest policy
                                    </Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>

                <section className="bg-card flex flex-col rounded-xl border">
                    <div className="flex flex-col gap-1 border-b px-4 py-4">
                        <h2 className="font-medium">Account rate assessment</h2>
                        <p className="text-muted-foreground text-sm">Recommended rates are calculated for review and are not posted automatically.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <Table pagination={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client account</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Oldest due</TableHead>
                                    <TableHead className="text-right">Merit score</TableHead>
                                    <TableHead>Decision</TableHead>
                                    <TableHead className="text-right">Rate</TableHead>
                                    <TableHead className="text-right">Overdue</TableHead>
                                    <TableHead className="text-right">Estimated interest</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assessments.map((row) => (
                                    <TableRow key={row.account_id}>
                                        <TableCell>
                                            <p className="font-medium">{row.client}</p>
                                            <p className="text-muted-foreground text-xs">{row.account_no}</p>
                                        </TableCell>
                                        <TableCell>{row.branch ?? '—'}</TableCell>
                                        <TableCell>{row.oldest_due_date ?? '—'}</TableCell>
                                        <TableCell className="text-right">
                                            {row.merit_score === null ? 'Insufficient history' : `${row.merit_score.toFixed(1)}%`}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    row.determined_rate === 0
                                                        ? 'secondary'
                                                        : row.determination === 'standard'
                                                          ? 'destructive'
                                                          : 'outline'
                                                }
                                            >
                                                {determinationLabel[row.determination] ?? row.determination}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{row.determined_rate.toFixed(2)}%</TableCell>
                                        <TableCell className="text-right">{money(row.overdue_balance, row.currency)}</TableCell>
                                        <TableCell className="text-right font-medium">{money(row.estimated_interest, row.currency)}</TableCell>
                                        <TableCell className="text-right">
                                            {permissions.manage && row.exemption && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        router.delete(`/accounting/interest-exemptions/${row.exemption?.id}`, {
                                                            preserveScroll: true,
                                                        })
                                                    }
                                                >
                                                    Revoke
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>

            <Dialog open={exemptionOpen} onOpenChange={(open) => !exemptionForm.processing && setExemptionOpen(open)}>
                <DialogContent onInteractOutside={(event) => event.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Approve interest exemption</DialogTitle>
                        <DialogDescription>
                            Record a zero-rate exemption or a specific rate override with dates and a full audit reason.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={saveExemption} className="flex flex-col gap-4">
                        <Field>
                            <FieldLabel>Client account</FieldLabel>
                            <Select
                                value={exemptionForm.data.client_account_id}
                                onValueChange={(value) => exemptionForm.setData('client_account_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {accountOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <FieldError>{exemptionForm.errors.client_account_id}</FieldError>
                        </Field>
                        <FieldGroup className="grid gap-4 sm:grid-cols-3">
                            <Field>
                                <FieldLabel>Starts on</FieldLabel>
                                <Input
                                    type="date"
                                    value={exemptionForm.data.starts_on}
                                    onChange={(event) => exemptionForm.setData('starts_on', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Ends on</FieldLabel>
                                <Input
                                    type="date"
                                    value={exemptionForm.data.ends_on}
                                    onChange={(event) => exemptionForm.setData('ends_on', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Rate override (%)</FieldLabel>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.0001"
                                    value={exemptionForm.data.rate_override}
                                    onChange={(event) => exemptionForm.setData('rate_override', event.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                        <Field>
                            <FieldLabel>Merit / approval reason</FieldLabel>
                            <Textarea
                                rows={4}
                                value={exemptionForm.data.reason}
                                onChange={(event) => exemptionForm.setData('reason', event.target.value)}
                                placeholder="Explain the payment history, dispute, hardship or approved commercial reason."
                            />
                            <FieldError>{exemptionForm.errors.reason}</FieldError>
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setExemptionOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={exemptionForm.processing || exemptionForm.data.reason.trim().length < 10}>
                                Approve override
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
