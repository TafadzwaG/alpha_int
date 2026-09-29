import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CalendarClock, CircleDollarSign, ClockAlert, Percent, ReceiptText, TriangleAlert, Users, WalletCards } from 'lucide-react';
import { type AgingBucket, type Debtor } from './types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Accounting', href: '/accounting' }];

type Props = {
    currency: string;
    summary: {
        totalReceivables: number;
        overdueReceivables: number;
        over90: number;
        debtorCount: number;
        overdueDebtorCount: number;
        unallocatedReceipts: number;
        collectionRate: number;
    };
    aging: AgingBucket[];
    monthly: Array<{ month: string; label: string; billed: number; collected: number }>;
    topDebtors: Debtor[];
    recentPayments: Array<{
        id: number;
        client: string;
        account_no: string | null;
        branch: string | null;
        method: string | null;
        amount: number;
        received_at: string | null;
    }>;
    generatedAt: string;
};

const money = (value: number, currency: string) =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

const date = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');

const overdueVariant = (days: number): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (days > 90) return 'destructive';
    if (days > 60) return 'default';
    if (days > 0) return 'secondary';
    return 'outline';
};

export default function AccountingDashboard({ currency, summary, aging, monthly, topDebtors, recentPayments, generatedAt }: Props) {
    const trendMaximum = Math.max(...monthly.flatMap((item) => [item.billed, item.collected]), 1);
    const agingMaximum = Math.max(...aging.map((item) => item.total), 1);
    const metrics = [
        {
            label: 'Total receivables',
            value: money(summary.totalReceivables, currency),
            detail: `${summary.debtorCount} debtor accounts`,
            icon: WalletCards,
        },
        {
            label: 'Overdue receivables',
            value: money(summary.overdueReceivables, currency),
            detail: `${summary.overdueDebtorCount} overdue debtors`,
            icon: ClockAlert,
        },
        { label: '90+ day exposure', value: money(summary.over90, currency), detail: 'Priority recovery balance', icon: TriangleAlert },
        { label: 'Active debtors', value: summary.debtorCount.toLocaleString(), detail: 'Accounts with open balances', icon: Users },
        { label: 'Collection rate', value: `${summary.collectionRate.toFixed(1)}%`, detail: 'Collections against six-month billings', icon: Percent },
        {
            label: 'Unallocated receipts',
            value: money(summary.unallocatedReceipts, currency),
            detail: 'Approved cash awaiting allocation',
            icon: ReceiptText,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounting dashboard" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Accounting workspace
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Accounting dashboard</h1>
                        <p className="text-muted-foreground mt-1 max-w-3xl">
                            Monitor receivables, debtor ageing, collections and unapplied cash across the permitted branches.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/administration/payments">View payments</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/accounting/debtors">
                                View debtors <ArrowRight data-icon="inline-end" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    {metrics.map((metric) => (
                        <Card key={metric.label}>
                            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                                <CardDescription>{metric.label}</CardDescription>
                                <metric.icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-semibold tracking-tight">{metric.value}</p>
                                <p className="text-muted-foreground mt-1 text-xs">{metric.detail}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Billing and collections</CardTitle>
                            <CardDescription>Posted charges compared with approved receipts over the last six months.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-2">
                                    <span className="bg-primary size-2 rounded-full" /> Billed
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-foreground size-2 rounded-full" /> Collected
                                </span>
                            </div>
                            <div className="grid min-h-64 grid-cols-6 items-end gap-3">
                                {monthly.map((item) => (
                                    <div key={item.label} className="flex h-full flex-col justify-end gap-2" title={item.label}>
                                        <div className="flex flex-1 items-end justify-center gap-1">
                                            <div
                                                className="bg-primary w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.billed / trendMaximum) * 100, item.billed ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="bg-foreground w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.collected / trendMaximum) * 100, item.collected ? 4 : 0)}%` }}
                                            />
                                        </div>
                                        <p className="text-muted-foreground text-center text-xs">{item.month}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Receivables ageing</CardTitle>
                            <CardDescription>Outstanding balances grouped by days past due.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {aging.map((bucket) => (
                                <Link key={bucket.key} href={`/accounting/debtors?bucket=${bucket.key}`} className="group flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium group-hover:underline">{bucket.label}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {bucket.accounts} account{bucket.accounts === 1 ? '' : 's'}
                                            </p>
                                        </div>
                                        <p className="font-semibold">{money(bucket.total, currency)}</p>
                                    </div>
                                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{ width: `${(bucket.total / agingMaximum) * 100}%` }}
                                        />
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/accounting/debtors">
                                    Open ageing schedule <ArrowRight data-icon="inline-end" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div>
                                <CardTitle>Priority debtors</CardTitle>
                                <CardDescription>Largest balances requiring collection follow-up.</CardDescription>
                            </div>
                            <CalendarClock className="text-muted-foreground size-5" />
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Debtor</TableHead>
                                        <TableHead>Account</TableHead>
                                        <TableHead>Oldest due</TableHead>
                                        <TableHead>Age</TableHead>
                                        <TableHead className="text-right">Outstanding</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topDebtors.map((debtor) => (
                                        <TableRow key={debtor.account_id}>
                                            <TableCell>
                                                <p className="font-medium">{debtor.client}</p>
                                                <p className="text-muted-foreground text-xs">{debtor.branch}</p>
                                            </TableCell>
                                            <TableCell>{debtor.account_no}</TableCell>
                                            <TableCell>{date(debtor.oldest_due_date)}</TableCell>
                                            <TableCell>
                                                <Badge variant={overdueVariant(debtor.days_overdue)}>
                                                    {debtor.days_overdue > 0 ? `${debtor.days_overdue} days` : 'Current'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{money(debtor.outstanding, currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div>
                                <CardTitle>Recent collections</CardTitle>
                                <CardDescription>Latest approved receipts applied to debtor accounts.</CardDescription>
                            </div>
                            <CircleDollarSign className="text-muted-foreground size-5" />
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {recentPayments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{payment.client}</p>
                                        <p className="text-muted-foreground truncate text-xs">
                                            {payment.account_no} · {payment.method} · {date(payment.received_at)}
                                        </p>
                                    </div>
                                    <p className="shrink-0 font-medium">{money(payment.amount, currency)}</p>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="justify-between gap-3">
                            <p className="text-muted-foreground text-xs">Updated {date(generatedAt)}</p>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/administration/payments">
                                    All payments <ArrowRight data-icon="inline-end" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
