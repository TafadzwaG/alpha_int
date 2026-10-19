import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, CircleDollarSign, Download, FileSpreadsheet, FileText, Filter, Headphones, Percent, TriangleAlert } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Option, humanize, money } from '../types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Call centre', href: '/call-centre' },
    { title: 'Reports', href: '/call-centre/reports' },
];
const chartConfig = {
    calls: { label: 'Interactions', color: 'var(--chart-1)' },
    contacts: { label: 'Contacts', color: 'var(--chart-2)' },
} satisfies ChartConfig;

type Props = {
    organization: { name: string };
    generatedAt: string;
    period: { from: string; to: string };
    currency: string;
    summary: {
        interactions: number;
        contacts: number;
        contactRate: number;
        promises: number;
        promiseValue: number;
        brokenPromises: number;
        completedTasks: number;
        overdueTasks: number;
        collections: number;
    };
    daily: Array<{ date: string; label: string; calls: number; contacts: number }>;
    outcomes: Array<{ outcome: string; total: number }>;
    agentPerformance: Array<{ agent: string; interactions: number; contacts: number; contactRate: number; completedTasks: number }>;
    branchPerformance: Array<{ branch: string; calls: number; contacts: number; openTasks: number; promises: number; collections: number }>;
    branches: Option[];
    filters: { branch: string; from: string; to: string };
};

export default function CallCentreReports({ summary, daily, outcomes, agentPerformance, branchPerformance, branches, filters, currency }: Props) {
    const [values, setValues] = useState(filters);
    const query = useMemo(() => new URLSearchParams(values).toString(), [values]);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get('/call-centre/reports', values, { preserveState: true, replace: true });
    };
    const metrics = [
        { label: 'Interactions', value: summary.interactions.toLocaleString(), detail: `${summary.contacts} successful contacts`, icon: Headphones },
        { label: 'Contact rate', value: `${summary.contactRate.toFixed(1)}%`, detail: 'Connected interactions', icon: Percent },
        {
            label: 'Promise value',
            value: money(summary.promiseValue, currency),
            detail: `${summary.promises} promises · ${summary.brokenPromises} broken`,
            icon: CheckCircle2,
        },
        {
            label: 'Completed tasks',
            value: summary.completedTasks.toLocaleString(),
            detail: `${summary.overdueTasks} currently overdue`,
            icon: TriangleAlert,
        },
        { label: 'Collections', value: money(summary.collections, currency), detail: 'Approved payments in period', icon: CircleDollarSign },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Call centre reports" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Operational reporting
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Call centre reports</h1>
                        <p className="text-muted-foreground mt-1">
                            Analyse contact rates, queue throughput, promises, collections and branch performance.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="pdf" asChild>
                            <a href={`/call-centre/reports/export/pdf?${query}`}>
                                <FileText data-icon="inline-start" /> Export PDF
                            </a>
                        </Button>
                        <Button variant="excel" asChild>
                            <a href={`/call-centre/reports/export/excel?${query}`}>
                                <FileSpreadsheet data-icon="inline-start" /> Export Excel
                            </a>
                        </Button>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Report filters</CardTitle>
                        <CardDescription>Build a branch or organization-wide report for a custom period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit}>
                            <FieldGroup className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto] md:items-end">
                                <Field>
                                    <FieldLabel>Branch</FieldLabel>
                                    <Select value={values.branch} onValueChange={(branch) => setValues({ ...values, branch })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="all">All accessible branches</SelectItem>
                                                {branches.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="report-from">From</FieldLabel>
                                    <Input
                                        id="report-from"
                                        type="date"
                                        value={values.from}
                                        onChange={(event) => setValues({ ...values, from: event.target.value })}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="report-to">To</FieldLabel>
                                    <Input
                                        id="report-to"
                                        type="date"
                                        value={values.to}
                                        onChange={(event) => setValues({ ...values, to: event.target.value })}
                                    />
                                </Field>
                                <Button type="submit">
                                    <Filter data-icon="inline-start" /> Apply report
                                </Button>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily contact performance</CardTitle>
                            <CardDescription>
                                Interactions compared with successful contacts for the selected period (last 31 days shown).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-72 w-full">
                                <BarChart data={daily} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="calls" fill="var(--color-calls)" radius={3} />
                                    <Bar dataKey="contacts" fill="var(--color-contacts)" radius={3} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Interaction outcomes</CardTitle>
                            <CardDescription>Outcome distribution for the reporting window.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {outcomes.length === 0 && <p className="text-muted-foreground py-12 text-center">No activity in this period.</p>}
                            {outcomes.map((outcome) => (
                                <div key={outcome.outcome} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                    <span>{humanize(outcome.outcome)}</span>
                                    <Badge variant="secondary">{outcome.total}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agent performance</CardTitle>
                            <CardDescription>Interactions, contact rate and completed follow-up work.</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Agent</TableHead>
                                        <TableHead className="text-right">Interactions</TableHead>
                                        <TableHead className="text-right">Contacts</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead className="text-right">Tasks</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agentPerformance.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                                                No agent activity.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {agentPerformance.map((row) => (
                                        <TableRow key={row.agent}>
                                            <TableCell className="font-medium">{row.agent}</TableCell>
                                            <TableCell className="text-right">{row.interactions}</TableCell>
                                            <TableCell className="text-right">{row.contacts}</TableCell>
                                            <TableCell className="text-right">{row.contactRate.toFixed(1)}%</TableCell>
                                            <TableCell className="text-right">{row.completedTasks}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Branch performance</CardTitle>
                            <CardDescription>Activity, open queue, promises and collections by accessible branch.</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Branch</TableHead>
                                        <TableHead className="text-right">Calls</TableHead>
                                        <TableHead className="text-right">Contacts</TableHead>
                                        <TableHead className="text-right">Open</TableHead>
                                        <TableHead className="text-right">Promises</TableHead>
                                        <TableHead className="text-right">Collections</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {branchPerformance.map((row) => (
                                        <TableRow key={row.branch}>
                                            <TableCell className="font-medium">{row.branch}</TableCell>
                                            <TableCell className="text-right">{row.calls}</TableCell>
                                            <TableCell className="text-right">{row.contacts}</TableCell>
                                            <TableCell className="text-right">{row.openTasks}</TableCell>
                                            <TableCell className="text-right">{row.promises}</TableCell>
                                            <TableCell className="text-right">{money(row.collections, currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
                        <div>
                            <p className="font-medium">Portable reporting included</p>
                            <p className="text-muted-foreground text-xs">
                                PDF is presentation-ready; Excel includes executive summary, agents, branches and daily activity sheets.
                            </p>
                        </div>
                        <Button variant="excel" asChild>
                            <a href={`/call-centre/reports/export/excel?${query}`}>
                                <Download data-icon="inline-start" /> Download workbook
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
