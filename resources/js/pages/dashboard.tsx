import { DashboardQuickActions } from '@/components/dashboard-quick-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CircleDollarSign,
    ClipboardCheck,
    Clock3,
    ExternalLink,
    Eye,
    HandCoins,
    Landmark,
    ReceiptText,
    Users,
    WalletCards,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

type Props = {
    dashboardTitle: string;
    dashboardAudience: string;
    metrics: {
        portfolioValue: number;
        activeClients: number;
        allocatedStands: number;
        availableStands: number;
        totalCharges: number;
        collections: number;
        outstanding: number;
        approvedExpenses: number;
        pettyCashBalance: number;
        pendingApprovals: number;
    };
    financialTrend: Array<{ month: string; label: string; charges: number; collections: number; expenses: number }>;
    inventory: Array<{ status: string; total: number; branch_total: number }>;
    inventoryRegisters: Array<{
        key: string;
        label: string;
        description: string;
        total: number;
        branch_total: number;
        href: string;
    }>;
    exchangeRates: Array<{
        base: string;
        quote: string;
        quote_label: string;
        buy_rate: number;
        sell_rate: number | null;
        source: string;
        source_type: string;
        updated_at: string;
        is_fallback: boolean;
    }>;
    recentPayments: Array<{
        id: number;
        client: string;
        method: string | null;
        branch: string | null;
        amount: number;
        currency: string;
        status: string;
        received_at: string | null;
    }>;
    approvalQueue: Array<{
        id: number;
        expense_no: string;
        payee: string;
        amount: number;
        currency: string;
        branch: string | null;
        submitted_at: string | null;
    }>;
    branchFilter: {
        selected: string;
        label: string;
        canViewAll: boolean;
        options: Array<{ id: string; code: string; name: string }>;
        inventoryIsOrganizationWide: boolean;
    };
    canViewReports: boolean;
    canViewExpenses: boolean;
    canApprovePayments: boolean;
    currency: string;
};

const formatMoney = (value: number, currency = 'USD') =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');
const formatRate = (value: number) => new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value);

const statusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (['approved', 'paid', 'allocated'].includes(status)) return 'default';
    if (['rejected', 'reversed', 'cancelled'].includes(status)) return 'destructive';
    if (['pending', 'submitted'].includes(status)) return 'secondary';
    return 'outline';
};

function CurrencyFlag({ code }: { code: string }) {
    const flagClass = 'size-6 overflow-hidden rounded-full border border-border bg-background shadow-xs';

    if (code === 'USD') {
        return (
            <span className={flagClass} title="United States" aria-label="United States flag">
                <svg viewBox="0 0 28 28" className="size-full" role="img" aria-hidden="true">
                    <defs>
                        <clipPath id="usd-flag-clip">
                            <circle cx="14" cy="14" r="14" />
                        </clipPath>
                    </defs>
                    <g clipPath="url(#usd-flag-clip)">
                        <rect width="28" height="28" fill="#fff" />
                        {[0, 4, 8, 12, 16, 20, 24].map((y) => (
                            <rect key={y} y={y} width="28" height="2" fill="#b22234" />
                        ))}
                        <rect width="13" height="14" fill="#3c3b6e" />
                        {[3, 7, 11].flatMap((x) => [3, 7, 11].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.75" fill="#fff" />))}
                    </g>
                </svg>
            </span>
        );
    }

    if (code === 'ZWG') {
        return (
            <span className={flagClass} title="Zimbabwe" aria-label="Zimbabwe flag">
                <svg viewBox="0 0 28 28" className="size-full" role="img" aria-hidden="true">
                    <defs>
                        <clipPath id="zwg-flag-clip">
                            <circle cx="14" cy="14" r="14" />
                        </clipPath>
                    </defs>
                    <g clipPath="url(#zwg-flag-clip)">
                        <rect width="28" height="28" fill="#319208" />
                        <rect y="4" width="28" height="4" fill="#ffd200" />
                        <rect y="8" width="28" height="4" fill="#de2010" />
                        <rect y="12" width="28" height="4" fill="#000" />
                        <rect y="16" width="28" height="4" fill="#de2010" />
                        <rect y="20" width="28" height="4" fill="#ffd200" />
                        <path d="M0 0 14 14 0 28Z" fill="#fff" stroke="#000" strokeWidth="0.8" />
                        <path d="m4.2 10.2 1.15 2.35 2.6.38-1.88 1.83.44 2.59-2.31-1.22-2.31 1.22.44-2.59-1.88-1.83 2.6-.38Z" fill="#de2010" />
                    </g>
                </svg>
            </span>
        );
    }

    return (
        <span className={flagClass} title="South Africa" aria-label="South Africa flag">
            <svg viewBox="0 0 28 28" className="size-full" role="img" aria-hidden="true">
                <defs>
                    <clipPath id="zar-flag-clip">
                        <circle cx="14" cy="14" r="14" />
                    </clipPath>
                </defs>
                <g clipPath="url(#zar-flag-clip)">
                    <rect width="28" height="14" fill="#de3831" />
                    <rect y="14" width="28" height="14" fill="#002395" />
                    <path d="M0 0v28l14-14Z" fill="#000" />
                    <path d="m0 2 12 12L0 26" fill="none" stroke="#ffb612" strokeWidth="7" />
                    <path d="m0 2 12 12L0 26M12 14h16" fill="none" stroke="#fff" strokeWidth="5" />
                    <path d="m0 2 12 12L0 26M12 14h16" fill="none" stroke="#007a4d" strokeWidth="3" />
                </g>
            </svg>
        </span>
    );
}

export default function Dashboard({
    dashboardTitle,
    dashboardAudience,
    metrics,
    financialTrend,
    inventory,
    inventoryRegisters,
    exchangeRates,
    recentPayments,
    approvalQueue,
    branchFilter,
    canViewReports,
    canViewExpenses,
    canApprovePayments,
    currency,
}: Props) {
    const [inventoryView, setInventoryView] = useState<'registers' | 'physical'>('registers');
    const [inventoryScope, setInventoryScope] = useState<'organization' | 'branch'>('organization');
    const trendMaximum = Math.max(...financialTrend.flatMap((item) => [item.charges, item.collections, item.expenses]), 1);
    const inventoryTotal = inventory.reduce((total, item) => total + item.total, 0);
    const inventoryItems =
        inventoryView === 'registers'
            ? inventoryRegisters
            : inventory.map((item) => ({
                  key: item.status,
                  label: item.status.replaceAll('_', ' '),
                  description: 'Physical stand status',
                  total: item.total,
                  branch_total: item.branch_total,
                  href: `/administration/stands?status=${encodeURIComponent(item.status)}`,
              }));
    const scopedInventoryTotal = inventoryItems.reduce((total, item) => total + (inventoryScope === 'branch' ? item.branch_total : item.total), 0);
    const pendingRecentPayments = recentPayments.filter((payment) => payment.status === 'pending').length;
    const metricCards = [
        {
            label: 'Portfolio value',
            value: formatMoney(metrics.portfolioValue, currency),
            detail: `${inventoryTotal} organization-wide stands`,
            icon: Building2,
        },
        {
            label: 'Active clients',
            value: metrics.activeClients.toLocaleString(),
            detail: `${metrics.allocatedStands} allocated stands`,
            icon: Users,
        },
        {
            label: 'Collections',
            value: formatMoney(metrics.collections, currency),
            detail: `${formatMoney(metrics.outstanding, currency)} outstanding`,
            icon: WalletCards,
        },
        {
            label: 'Approved expenses',
            value: formatMoney(metrics.approvedExpenses, currency),
            detail: `${metrics.pendingApprovals} awaiting approval`,
            icon: ReceiptText,
        },
        {
            label: 'Available inventory',
            value: metrics.availableStands.toLocaleString(),
            detail: 'Organization-wide inventory',
            icon: Landmark,
        },
        { label: 'Petty cash balance', value: formatMoney(metrics.pettyCashBalance, currency), detail: 'Current ledger position', icon: HandCoins },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={dashboardTitle} />
            <div className="flex max-w-full min-w-0 flex-1 flex-col gap-4 p-3 sm:gap-5 sm:p-4 md:p-6 [&_.rounded-lg]:min-w-0">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <Badge variant="secondary">{dashboardAudience}</Badge>
                            <Badge variant="outline">{branchFilter.label}</Badge>
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">{dashboardTitle}</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">
                            A live view of the property portfolio, collections, expenditure, approvals and cash controls.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        {branchFilter.options.length > 1 && (
                            <Select
                                value={branchFilter.selected}
                                onValueChange={(branch) => router.post('/select-branch', { branch_id: Number(branch) })}
                            >
                                <SelectTrigger className="w-full sm:w-56" aria-label="Switch active branch">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {branchFilter.options.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id}>
                                                {branch.name} ({branch.code})
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                        {canViewReports && (
                            <Button
                                asChild
                                className="border-chart-1 bg-chart-1 ring-chart-2/25 hover:bg-chart-1/90 border text-white shadow-sm ring-1 hover:shadow-md dark:text-white"
                            >
                                <Link href="/reports">
                                    Open reports
                                    <ArrowRight className="text-chart-2" data-icon="inline-end" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-6">
                    {metricCards.map((metric) => (
                        <Card key={metric.label}>
                            <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-2 sm:p-6 sm:pb-2">
                                <CardDescription>{metric.label}</CardDescription>
                                <metric.icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
                                <p className="text-lg font-semibold tracking-tight break-words sm:text-xl">{metric.value}</p>
                                <p className="text-muted-foreground mt-1 text-xs">{metric.detail}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <DashboardQuickActions />

                <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.8fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial movement</CardTitle>
                            <CardDescription>Charges, approved collections and approved expenses over the last six months.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                                <span className="flex items-center gap-2">
                                    <span className="bg-chart-1 size-2 rounded-full" />
                                    Charges
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-chart-2 size-2 rounded-full" />
                                    Collections
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-chart-3 size-2 rounded-full" />
                                    Expenses
                                </span>
                            </div>
                            <div className="grid h-52 min-w-0 grid-cols-6 items-end gap-1.5 sm:h-64 sm:gap-3">
                                {financialTrend.map((item) => (
                                    <div key={item.label} className="flex h-full flex-col justify-end gap-2" title={item.label}>
                                        <div className="flex flex-1 items-end justify-center gap-1">
                                            <div
                                                className="bg-chart-1 w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.charges / trendMaximum) * 100, item.charges ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="bg-chart-2 w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.collections / trendMaximum) * 100, item.collections ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="bg-chart-3 w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.expenses / trendMaximum) * 100, item.expenses ? 4 : 0)}%` }}
                                            />
                                        </div>
                                        <p className="text-muted-foreground text-center text-xs">{item.month}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="gap-3">
                            <div>
                                <CardTitle>Portfolio inventory</CardTitle>
                                <CardDescription>
                                    {inventoryView === 'registers'
                                        ? 'Register groups aligned with the GAPS workbook.'
                                        : 'Physical stand status across the property portfolio.'}
                                </CardDescription>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <Select value={inventoryView} onValueChange={(value) => setInventoryView(value as 'registers' | 'physical')}>
                                    <SelectTrigger aria-label="Inventory view" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="registers">GAPS registers</SelectItem>
                                            <SelectItem value="physical">Physical status</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <Select value={inventoryScope} onValueChange={(value) => setInventoryScope(value as 'organization' | 'branch')}>
                                    <SelectTrigger aria-label="Inventory scope" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="organization">Organization-wide</SelectItem>
                                            <SelectItem value="branch">{branchFilter.label}</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {inventoryItems.map((item) => {
                                const total = inventoryScope === 'branch' ? item.branch_total : item.total;
                                const branchQuery =
                                    inventoryScope === 'branch' ? `${item.href.includes('?') ? '&' : '?'}branch=${branchFilter.selected}` : '';

                                return (
                                    <Link
                                        key={`${inventoryView}-${item.key}`}
                                        href={`${item.href}${branchQuery}`}
                                        className="focus-visible:ring-ring group hover:bg-muted -m-2 flex flex-col gap-2 rounded-md p-2 transition-colors outline-none focus-visible:ring-2"
                                        aria-label={`View ${total} ${item.label.toLowerCase()} records`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="min-w-0">
                                                <span className="block capitalize group-hover:underline">{item.label}</span>
                                                <span className="text-muted-foreground block text-xs">{item.description}</span>
                                            </span>
                                            <span className="flex shrink-0 items-center gap-1 font-medium">
                                                {total.toLocaleString()}
                                                <ArrowRight className="size-3.5" aria-hidden="true" />
                                            </span>
                                        </div>
                                        <div className="bg-muted h-2 overflow-hidden rounded-full">
                                            <div
                                                className="bg-primary h-full rounded-full"
                                                style={{ width: `${scopedInventoryTotal ? (total / scopedInventoryTotal) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </Link>
                                );
                            })}
                            {scopedInventoryTotal === 0 && (
                                <p className="text-muted-foreground py-2 text-center text-sm">No records in this scope.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div>
                                <CardTitle>Recent collections</CardTitle>
                                <CardDescription>Latest payments recorded across active branches.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {pendingRecentPayments > 0 && (
                                    <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                                        <Clock3 className="size-3" aria-hidden="true" />
                                        {pendingRecentPayments} pending
                                    </Badge>
                                )}
                                <CircleDollarSign className="text-muted-foreground size-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-3 md:hidden">
                                {recentPayments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className={`rounded-lg border p-3 ${
                                            payment.status === 'pending'
                                                ? 'border-amber-300 bg-amber-50/80 shadow-[inset_3px_0_0_0_rgb(251_191_36)] dark:border-amber-900 dark:bg-amber-950/20'
                                                : ''
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium break-words">{payment.client || 'Unassigned'}</p>
                                                <p className="text-muted-foreground text-xs">{payment.branch}</p>
                                            </div>
                                            <span className="shrink-0 font-semibold">{formatMoney(payment.amount, payment.currency)}</span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <span className="text-muted-foreground">
                                                {payment.method ?? '—'} · {formatDate(payment.received_at)}
                                            </span>
                                            {payment.status === 'pending' ? (
                                                <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                                                    <Clock3 className="size-3" aria-hidden="true" />
                                                    Needs approval
                                                </Badge>
                                            ) : (
                                                <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                                            )}
                                        </div>
                                        <Button
                                            className="mt-3 w-full"
                                            size="sm"
                                            variant={payment.status === 'pending' ? 'default' : 'outline'}
                                            asChild
                                        >
                                            <Link href={`/administration/payments/${payment.id}`}>
                                                <Eye className="size-4" />
                                                {payment.status === 'pending' && canApprovePayments ? 'Review payment' : 'View payment'}
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                                {recentPayments.length === 0 && (
                                    <p className="text-muted-foreground py-5 text-center text-sm">No collections recorded yet.</p>
                                )}
                            </div>
                            <div className="hidden min-w-0 md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Method</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentPayments.map((payment) => (
                                            <TableRow
                                                key={payment.id}
                                                className={
                                                    payment.status === 'pending'
                                                        ? 'border-l-4 border-l-amber-400 bg-amber-50/70 dark:bg-amber-950/15'
                                                        : ''
                                                }
                                            >
                                                <TableCell>
                                                    <p className="font-medium">{payment.client || 'Unassigned'}</p>
                                                    <p className="text-muted-foreground text-xs">{payment.branch}</p>
                                                </TableCell>
                                                <TableCell>{payment.method ?? '—'}</TableCell>
                                                <TableCell>{formatDate(payment.received_at)}</TableCell>
                                                <TableCell>
                                                    {payment.status === 'pending' ? (
                                                        <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                                                            <Clock3 className="size-3" aria-hidden="true" />
                                                            Needs approval
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatMoney(payment.amount, payment.currency)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant={payment.status === 'pending' ? 'default' : 'outline'} asChild>
                                                        <Link href={`/administration/payments/${payment.id}`}>
                                                            <Eye className="size-4" />
                                                            {payment.status === 'pending' && canApprovePayments ? 'Review' : 'View'}
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {recentPayments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                                                    No collections recorded yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-5">
                        <Card>
                            <CardHeader>
                                <CardTitle>Exchange rates</CardTitle>
                                <CardDescription>Live USD rates for ZiG and the South African rand.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table pagination={false}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pair</TableHead>
                                            <TableHead className="text-right">Buy</TableHead>
                                            <TableHead className="text-right">Sell</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {exchangeRates.map((rate) => (
                                            <TableRow key={`${rate.base}-${rate.quote}`}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex shrink-0 -space-x-1.5">
                                                            <CurrencyFlag code={rate.base} />
                                                            <CurrencyFlag code={rate.quote} />
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="flex items-center gap-2 font-medium">
                                                                <span>
                                                                    {rate.base} / {rate.quote_label}
                                                                </span>
                                                                <Badge variant="outline">{rate.quote}</Badge>
                                                            </span>
                                                            <span className="text-muted-foreground block text-xs">
                                                                {rate.source} · {formatDate(rate.updated_at)}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatRate(rate.buy_rate)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {rate.sell_rate === null ? '—' : formatRate(rate.sell_rate)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {exchangeRates.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                                                    Exchange rates are temporarily unavailable.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                                <p className="text-muted-foreground text-xs">Indicative rates cached for 30 minutes.</p>
                                <Button variant="link" size="sm" asChild>
                                    <a href="https://zimrate.com" target="_blank" rel="noreferrer">
                                        Rates by ZimRate <ExternalLink data-icon="inline-end" />
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>

                        {canViewExpenses && (
                            <Card>
                                <CardHeader className="flex flex-row items-start justify-between gap-4">
                                    <div>
                                        <CardTitle>Approval queue</CardTitle>
                                        <CardDescription>Expense submissions requiring a decision.</CardDescription>
                                    </div>
                                    <ClipboardCheck className="text-muted-foreground size-5" />
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3">
                                    {approvalQueue.map((approval) => (
                                        <Link
                                            key={approval.id}
                                            href="/approvals"
                                            className="hover:bg-accent flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{approval.payee}</p>
                                                <p className="text-muted-foreground truncate text-xs">
                                                    {approval.expense_no} · {approval.branch} · {formatDate(approval.submitted_at)}
                                                </p>
                                            </div>
                                            <p className="shrink-0 font-medium">{formatMoney(approval.amount, approval.currency)}</p>
                                        </Link>
                                    ))}
                                    {approvalQueue.length === 0 && (
                                        <p className="text-muted-foreground py-8 text-center text-sm">The approval queue is clear.</p>
                                    )}
                                    <Button
                                        asChild
                                        className="border-chart-2 bg-chart-2 ring-chart-1/15 hover:bg-chart-2/90 border text-white shadow-sm ring-1 hover:shadow-md dark:text-white"
                                    >
                                        <Link href="/approvals">
                                            Review all approvals
                                            <ArrowRight className="text-primary" data-icon="inline-end" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
