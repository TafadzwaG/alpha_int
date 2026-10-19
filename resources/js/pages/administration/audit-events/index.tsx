import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, ArrowLeft, CalendarDays, Eye, Filter, Fingerprint, RotateCcw, Search, ShieldCheck, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type Option = { value: string; label: string };
type AuditEvent = {
    id: number;
    occurred_at: string;
    actor: string;
    actor_email: string | null;
    branch: string;
    event_type: string;
    subject_type: string;
    subject: string;
    event_hash: string;
    integrity_status: 'verified' | 'issue';
    change_count: number;
};
type Pagination = {
    data: AuditEvent[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};
type Filters = { search: string; event_type: string; subject_type: string; actor: string; branch: string; date_from: string; date_to: string };
type Props = {
    events: Pagination;
    filters: Filters;
    stats: {
        total: number;
        last_24_hours: number;
        actors: number;
        event_types: number;
        integrity: { valid: boolean; issues: number; verified: number };
    };
    options: { eventTypes: Option[]; subjectTypes: Option[]; actors: Option[]; branches: Option[] };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administration', href: '/administration' },
    { title: 'Audit events', href: '/administration/audit-events' },
];

const labelEvent = (value: string) => value.replaceAll('.', ' · ').replaceAll('_', ' ');
const formatDate = (value: string) => new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function FilterSelect({
    id,
    label,
    value,
    options,
    allLabel,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    options: Option[];
    allLabel: string;
    onChange: (value: string) => void;
}) {
    return (
        <Field>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem value="all">{allLabel}</SelectItem>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </Field>
    );
}

export default function AuditEventsIndex({ events, filters, stats, options }: Props) {
    const [values, setValues] = useState(filters);
    const activeFilters = Object.entries(filters).filter(([key, value]) => value && value !== 'all' && !(key === 'search' && !value.trim())).length;
    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get('/administration/audit-events', Object.fromEntries(Object.entries(values).filter(([, value]) => value && value !== 'all')), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };
    const clearFilters = () => {
        const cleared: Filters = { search: '', event_type: 'all', subject_type: 'all', actor: 'all', branch: 'all', date_from: '', date_to: '' };
        setValues(cleared);
        router.get('/administration/audit-events', {}, { preserveState: true, replace: true });
    };
    const cards = [
        { label: 'Total events', value: stats.total, detail: 'Visible audit records', icon: Activity },
        { label: 'Last 24 hours', value: stats.last_24_hours, detail: 'Recent recorded activity', icon: CalendarDays },
        { label: 'Actors', value: stats.actors, detail: 'Distinct accountable users', icon: Users },
        { label: 'Event types', value: stats.event_types, detail: 'Tracked action categories', icon: Fingerprint },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit events" />
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration">
                                <ArrowLeft data-icon="inline-start" />
                                Administration
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-2">
                            <ShieldCheck aria-hidden="true" />
                            <h1 className="text-2xl font-semibold tracking-tight">Audit events</h1>
                            <Badge
                                className={stats.integrity.valid ? 'bg-chart-2/10 text-chart-2' : ''}
                                variant={stats.integrity.valid ? 'outline' : 'destructive'}
                            >
                                {stats.integrity.valid ? 'Chain verified' : `${stats.integrity.issues} integrity issues`}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 max-w-3xl">
                            Investigate user activity, configuration changes, transaction events, and the tamper-evident hash chain.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => (
                        <Card key={card.label} className="ring-foreground/10 border-0 shadow-none ring-1">
                            <CardHeader className="flex-row items-start justify-between">
                                <div>
                                    <CardDescription>{card.label}</CardDescription>
                                    <CardTitle className="mt-2 text-3xl">{card.value.toLocaleString()}</CardTitle>
                                </div>
                                <card.icon className="text-muted-foreground" aria-hidden="true" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-xs">{card.detail}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="ring-foreground/10 border-0 shadow-none ring-1">
                    <CardHeader className="border-b">
                        <div className="flex flex-wrap items-center gap-2">
                            <Filter aria-hidden="true" />
                            <CardTitle>Investigation filters</CardTitle>
                            {activeFilters > 0 && <Badge variant="secondary">{activeFilters} active</Badge>}
                        </div>
                        <CardDescription>Combine actor, branch, event, subject, and date criteria. Filters are preserved in the URL.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form className="flex flex-col gap-5" onSubmit={applyFilters}>
                            <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Field className="xl:col-span-2">
                                    <FieldLabel htmlFor="audit-search">Search logs</FieldLabel>
                                    <div className="relative">
                                        <Search
                                            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="audit-search"
                                            value={values.search}
                                            onChange={(event) => setValues({ ...values, search: event.target.value })}
                                            className="pl-9"
                                        />
                                    </div>
                                </Field>
                                <FilterSelect
                                    id="event-type"
                                    label="Event type"
                                    value={values.event_type}
                                    options={options.eventTypes}
                                    allLabel="All event types"
                                    onChange={(value) => setValues({ ...values, event_type: value })}
                                />
                                <FilterSelect
                                    id="subject-type"
                                    label="Subject type"
                                    value={values.subject_type}
                                    options={options.subjectTypes}
                                    allLabel="All subject types"
                                    onChange={(value) => setValues({ ...values, subject_type: value })}
                                />
                                <FilterSelect
                                    id="actor"
                                    label="Actor"
                                    value={values.actor}
                                    options={options.actors}
                                    allLabel="All actors"
                                    onChange={(value) => setValues({ ...values, actor: value })}
                                />
                                <FilterSelect
                                    id="branch"
                                    label="Branch"
                                    value={values.branch}
                                    options={options.branches}
                                    allLabel="All branches"
                                    onChange={(value) => setValues({ ...values, branch: value })}
                                />
                                <Field>
                                    <FieldLabel htmlFor="date-from">From date</FieldLabel>
                                    <Input
                                        id="date-from"
                                        type="date"
                                        value={values.date_from}
                                        onChange={(event) => setValues({ ...values, date_from: event.target.value })}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="date-to">To date</FieldLabel>
                                    <Input
                                        id="date-to"
                                        type="date"
                                        min={values.date_from || undefined}
                                        value={values.date_to}
                                        onChange={(event) => setValues({ ...values, date_to: event.target.value })}
                                    />
                                </Field>
                            </FieldGroup>
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit">
                                    <Filter data-icon="inline-start" />
                                    Apply filters
                                </Button>
                                <Button type="button" variant="outline" onClick={clearFilters}>
                                    <RotateCcw data-icon="inline-start" />
                                    Clear
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <section className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">Event log</h2>
                            <p className="text-muted-foreground text-sm">
                                Showing {events.from ?? 0}–{events.to ?? 0} of {events.total.toLocaleString()} matching events.
                            </p>
                        </div>
                        <p className="text-muted-foreground text-xs">{stats.integrity.verified.toLocaleString()} chain entries verified</p>
                    </div>
                    <div className="overflow-hidden rounded-md border">
                        <Table pagination={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>When</TableHead>
                                    <TableHead>Actor & branch</TableHead>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Changes</TableHead>
                                    <TableHead>Integrity</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.data.map((auditEvent) => (
                                    <TableRow key={auditEvent.id}>
                                        <TableCell className="whitespace-nowrap">
                                            <p className="font-medium">{formatDate(auditEvent.occurred_at)}</p>
                                            <p className="text-muted-foreground text-xs">Event #{auditEvent.id}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{auditEvent.actor}</p>
                                            <p className="text-muted-foreground text-xs">{auditEvent.branch}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {labelEvent(auditEvent.event_type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{auditEvent.subject}</p>
                                            <p className="text-muted-foreground text-xs">{auditEvent.subject_type}</p>
                                        </TableCell>
                                        <TableCell>{auditEvent.change_count.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={auditEvent.integrity_status === 'verified' ? 'outline' : 'destructive'}
                                                className={auditEvent.integrity_status === 'verified' ? 'bg-chart-2/10 text-chart-2' : ''}
                                            >
                                                {auditEvent.integrity_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="view" size="sm" asChild>
                                                <Link href={`/administration/audit-events/${auditEvent.id}`}>
                                                    <Eye data-icon="inline-start" />
                                                    View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {events.data.length === 0 && (
                            <div className="flex min-h-40 flex-col items-center justify-center gap-2 border-t border-dashed p-6 text-center">
                                <Search className="text-muted-foreground" aria-hidden="true" />
                                <p className="font-medium">No audit events match these filters</p>
                                <p className="text-muted-foreground text-sm">Broaden the search or clear one or more filters.</p>
                            </div>
                        )}
                    </div>
                    {events.links.length > 3 && (
                        <div className="flex flex-wrap justify-end gap-2">
                            {events.links.map((link, index) => (
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
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
