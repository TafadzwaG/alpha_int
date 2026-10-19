import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Filter,
    LoaderCircle,
    MessageSquareText,
    RefreshCw,
    Send,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Call centre', href: '/call-centre' },
    { title: 'Bulk SMS', href: '/call-centre/bulk-sms' },
];

type AudienceType = 'selected' | 'filtered';
type ClientPreview = {
    id: number;
    clientNo: string;
    name: string;
    branch: string | null;
    phone: string | null;
    eligible: boolean;
    exclusionReason: string | null;
};
type Campaign = {
    id: number;
    name: string;
    status: string;
    provider: string;
    audienceType: string;
    branch: string | null;
    recipientCount: number;
    sentCount: number;
    simulatedCount: number;
    failedCount: number;
    createdAt: string | null;
    createdBy: string | null;
};
type Props = {
    audience: {
        type: AudienceType;
        filters: Record<string, string>;
        selectedIds: number[];
        matching: number;
        eligible: number;
        excluded: number;
        clients: ClientPreview[];
    };
    branches: Array<{ value: string | number; label: string }>;
    provider: { enabled: boolean; name: string };
    summary: { campaigns: number; inProgress: number; sent: number; simulated: number; failed: number };
    campaigns: Campaign[];
};

const templates = {
    general: '',
    payment_reminder: 'Alpha Land reminder: your property account has a payment due. Please contact your branch if you need assistance.',
    statement_ready: 'Alpha Land: your latest property account statement is ready. Please contact your branch for a copy or further assistance.',
    appointment: 'Alpha Land: this is a reminder about your scheduled appointment. Please contact your branch if you need to reschedule.',
};

const dateTime = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'completed') return 'default';
    if (status === 'completed_with_errors') return 'destructive';
    if (['queued', 'processing'].includes(status)) return 'secondary';
    return 'outline';
}

export default function BulkSmsIndex({ audience, branches, provider, summary, campaigns }: Props) {
    const { flash } = usePage<SharedData>().props;
    const [template, setTemplate] = useState<keyof typeof templates>('general');
    const form = useForm({
        idempotency_key: crypto.randomUUID(),
        name: '',
        message: '',
        audience_type: audience.type as AudienceType,
        client_ids: audience.selectedIds,
        filters: {
            search: audience.filters.search ?? '',
            branch: audience.filters.branch ?? 'all',
            status: audience.filters.status ?? 'all',
            payment: audience.filters.payment ?? 'all',
            follow_up: audience.filters.follow_up ?? 'all',
            phone: audience.filters.phone ?? 'all',
            created_from: audience.filters.created_from ?? '',
            created_to: audience.filters.created_to ?? '',
            sort: audience.filters.sort ?? 'newest',
        },
    });

    const characters = Array.from(form.data.message).length;
    const unicode = Array.from(form.data.message).some((character) => (character.codePointAt(0) ?? 0) > 127);
    const singleLimit = unicode ? 70 : 160;
    const multipartLimit = unicode ? 67 : 153;
    const segments = characters === 0 ? 0 : characters <= singleLimit ? 1 : Math.ceil(characters / multipartLimit);
    const audienceCount = audience.eligible;
    const estimatedSegments = audienceCount * segments;
    const activeFilterCount = useMemo(
        () => Object.values(form.data.filters).filter((value) => Boolean(value) && value !== 'all' && value !== 'newest').length,
        [form.data.filters],
    );

    const updateFilter = (key: keyof typeof form.data.filters, value: string) => {
        form.setData('filters', { ...form.data.filters, [key]: value });
    };

    const previewAudience = () => {
        const query: Record<string, string | number[]> = { audience_type: form.data.audience_type };
        if (form.data.audience_type === 'selected') {
            query.client_ids = form.data.client_ids;
        } else {
            Object.entries(form.data.filters).forEach(([key, value]) => {
                if (value && value !== 'all') query[key] = value;
            });
        }
        router.get('/call-centre/bulk-sms', query, { preserveScroll: true, preserveState: false, replace: true });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/call-centre/bulk-sms', { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bulk SMS" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Client messaging
                        </Badge>
                        <div className="flex items-center gap-2">
                            <MessageSquareText className="size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">Bulk SMS</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">Build a consent-aware audience, preview it, and queue an auditable SMS campaign.</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/administration/clients">
                            <ArrowLeft data-icon="inline-start" /> Select clients
                        </Link>
                    </Button>
                </div>

                {flash?.success && (
                    <Alert>
                        <CheckCircle2 aria-hidden="true" />
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'SMS-ready audience', value: audience.eligible, detail: `${audience.matching} matching clients`, icon: Users },
                        { label: 'Excluded', value: audience.excluded, detail: 'Missing consent, opted out or no phone', icon: CircleAlert },
                        {
                            label: 'Campaigns in progress',
                            value: summary.inProgress,
                            detail: `${summary.campaigns} campaigns recorded`,
                            icon: Clock3,
                        },
                        {
                            label: provider.enabled ? 'Messages sent' : 'Messages simulated',
                            value: provider.enabled ? summary.sent : summary.simulated,
                            detail: `${summary.failed} failed deliveries`,
                            icon: Send,
                        },
                    ].map((stat) => (
                        <Card key={stat.label} className="py-0">
                            <CardHeader className="flex-row items-start justify-between border-b py-4">
                                <div>
                                    <CardDescription>{stat.label}</CardDescription>
                                    <CardTitle className="mt-2 text-2xl">{stat.value.toLocaleString()}</CardTitle>
                                </div>
                                <stat.icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent className="text-muted-foreground py-3 text-xs">{stat.detail}</CardContent>
                        </Card>
                    ))}
                </div>

                <form onSubmit={submit} className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <Card className="min-w-0 py-0">
                        <CardHeader className="border-b py-5">
                            <CardTitle>Compose campaign</CardTitle>
                            <CardDescription>Choose the audience and message. Sending is performed asynchronously by the queue.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 py-5">
                            <Alert>
                                <ShieldCheck aria-hidden="true" />
                                <AlertDescription>
                                    {provider.enabled
                                        ? `${provider.name} delivery is enabled. Only consented clients will be queued.`
                                        : 'Safe simulation is active. Twilio settings are reserved; no external SMS will be sent until Twilio is enabled.'}
                                </AlertDescription>
                            </Alert>

                            <FieldGroup className="gap-5">
                                <Field data-invalid={Boolean(form.errors.audience_type) || undefined}>
                                    <FieldLabel htmlFor="sms-audience">Audience</FieldLabel>
                                    <Select
                                        value={form.data.audience_type}
                                        onValueChange={(value) => form.setData('audience_type', value as AudienceType)}
                                    >
                                        <SelectTrigger id="sms-audience" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="selected" disabled={!audience.selectedIds.length}>
                                                    Selected clients ({audience.selectedIds.length})
                                                </SelectItem>
                                                <SelectItem value="filtered">Advanced-filter audience</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        {form.data.audience_type === 'selected'
                                            ? 'The selected client IDs from the client directory are locked into this campaign.'
                                            : 'Filters are evaluated again when the campaign is queued.'}
                                    </FieldDescription>
                                    <FieldError>{form.errors.audience_type || form.errors.client_ids}</FieldError>
                                </Field>

                                {form.data.audience_type === 'filtered' && (
                                    <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium">Advanced audience filters</p>
                                                <p className="text-muted-foreground text-sm">
                                                    {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
                                                </p>
                                            </div>
                                            <Filter className="text-muted-foreground size-4" />
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Field>
                                                <FieldLabel htmlFor="sms-search">Client search</FieldLabel>
                                                <Input
                                                    id="sms-search"
                                                    value={form.data.filters.search}
                                                    onChange={(event) => updateFilter('search', event.target.value)}
                                                />
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="sms-branch">Owning branch</FieldLabel>
                                                <Select value={form.data.filters.branch} onValueChange={(value) => updateFilter('branch', value)}>
                                                    <SelectTrigger id="sms-branch">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem value="all">All accessible branches</SelectItem>
                                                            {branches.map((branch) => (
                                                                <SelectItem key={String(branch.value)} value={String(branch.value)}>
                                                                    {branch.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="sms-status">Client status</FieldLabel>
                                                <Select value={form.data.filters.status} onValueChange={(value) => updateFilter('status', value)}>
                                                    <SelectTrigger id="sms-status">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem value="all">All statuses</SelectItem>
                                                            <SelectItem value="prospect">Prospect</SelectItem>
                                                            <SelectItem value="active">Active</SelectItem>
                                                            <SelectItem value="inactive">Inactive</SelectItem>
                                                            <SelectItem value="blocked">Blocked</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="sms-payment">Payment position</FieldLabel>
                                                <Select value={form.data.filters.payment} onValueChange={(value) => updateFilter('payment', value)}>
                                                    <SelectTrigger id="sms-payment">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem value="all">Any payment position</SelectItem>
                                                            <SelectItem value="overdue">Overdue</SelectItem>
                                                            <SelectItem value="upcoming">Upcoming</SelectItem>
                                                            <SelectItem value="none">No scheduled payment</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="sms-follow-up">Follow-up position</FieldLabel>
                                                <Select
                                                    value={form.data.filters.follow_up}
                                                    onValueChange={(value) => updateFilter('follow_up', value)}
                                                >
                                                    <SelectTrigger id="sms-follow-up">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem value="all">Any follow-up position</SelectItem>
                                                            <SelectItem value="overdue">Overdue</SelectItem>
                                                            <SelectItem value="upcoming">Upcoming</SelectItem>
                                                            <SelectItem value="none">No follow-up</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="sms-phone">Phone readiness</FieldLabel>
                                                <Select value={form.data.filters.phone} onValueChange={(value) => updateFilter('phone', value)}>
                                                    <SelectTrigger id="sms-phone">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem value="all">All phone states</SelectItem>
                                                            <SelectItem value="with_phone">SMS-ready only</SelectItem>
                                                            <SelectItem value="without_phone">Without SMS-ready phone</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="sms-created-from">Created from</FieldLabel>
                                                <Input
                                                    id="sms-created-from"
                                                    type="date"
                                                    value={form.data.filters.created_from}
                                                    onChange={(event) => updateFilter('created_from', event.target.value)}
                                                />
                                            </Field>
                                            <Field>
                                                <FieldLabel htmlFor="sms-created-to">Created to</FieldLabel>
                                                <Input
                                                    id="sms-created-to"
                                                    type="date"
                                                    value={form.data.filters.created_to}
                                                    onChange={(event) => updateFilter('created_to', event.target.value)}
                                                />
                                            </Field>
                                        </div>
                                        <Button type="button" variant="outline" onClick={previewAudience}>
                                            <RefreshCw data-icon="inline-start" /> Preview audience
                                        </Button>
                                    </div>
                                )}

                                <div className="grid gap-5 md:grid-cols-2">
                                    <Field>
                                        <FieldLabel htmlFor="sms-template">Message template</FieldLabel>
                                        <Select
                                            value={template}
                                            onValueChange={(value) => {
                                                const next = value as keyof typeof templates;
                                                setTemplate(next);
                                                form.setData('message', templates[next]);
                                            }}
                                        >
                                            <SelectTrigger id="sms-template">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="general">Blank message</SelectItem>
                                                    <SelectItem value="payment_reminder">Payment reminder</SelectItem>
                                                    <SelectItem value="statement_ready">Statement ready</SelectItem>
                                                    <SelectItem value="appointment">Appointment reminder</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field data-invalid={Boolean(form.errors.name) || undefined}>
                                        <FieldLabel htmlFor="sms-name">Campaign name</FieldLabel>
                                        <Input
                                            id="sms-name"
                                            value={form.data.name}
                                            onChange={(event) => form.setData('name', event.target.value)}
                                            aria-invalid={Boolean(form.errors.name) || undefined}
                                        />
                                        <FieldError>{form.errors.name}</FieldError>
                                    </Field>
                                </div>
                                <Field data-invalid={Boolean(form.errors.message) || undefined}>
                                    <FieldLabel htmlFor="sms-message">Message</FieldLabel>
                                    <Textarea
                                        id="sms-message"
                                        rows={6}
                                        maxLength={800}
                                        value={form.data.message}
                                        onChange={(event) => form.setData('message', event.target.value)}
                                        aria-invalid={Boolean(form.errors.message) || undefined}
                                    />
                                    <FieldDescription>
                                        {characters}/800 characters · approximately {segments} SMS segment{segments === 1 ? '' : 's'} per recipient
                                    </FieldDescription>
                                    <FieldError>{form.errors.message}</FieldError>
                                </Field>
                            </FieldGroup>
                        </CardContent>
                    </Card>

                    <div className="space-y-5">
                        <Card className="py-0">
                            <CardHeader className="border-b py-5">
                                <CardTitle>Audience review</CardTitle>
                                <CardDescription>Current preview after consent and opt-out controls.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 py-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-muted/50 rounded-lg p-3">
                                        <p className="text-muted-foreground text-xs">Matching</p>
                                        <p className="mt-1 text-xl font-semibold">{audience.matching}</p>
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-3">
                                        <p className="text-muted-foreground text-xs">SMS-ready</p>
                                        <p className="mt-1 text-xl font-semibold">{audience.eligible}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {audience.clients.slice(0, 8).map((client) => (
                                        <div key={client.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{client.name}</p>
                                                <p className="text-muted-foreground truncate text-xs">
                                                    {client.clientNo} · {client.branch ?? 'No branch'}
                                                </p>
                                            </div>
                                            <Badge variant={client.eligible ? 'secondary' : 'outline'}>
                                                {client.eligible ? 'Ready' : client.exclusionReason}
                                            </Badge>
                                        </div>
                                    ))}
                                    {!audience.clients.length && (
                                        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                                            No clients match this audience.
                                        </div>
                                    )}
                                </div>
                                {audience.matching > 8 && (
                                    <p className="text-muted-foreground text-xs">Showing 8 of {audience.matching} matching clients.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="py-0">
                            <CardHeader className="border-b py-5">
                                <CardTitle>Campaign preview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 py-5">
                                <div className="text-sm">
                                    <p>
                                        <span className="font-semibold">{audienceCount.toLocaleString()}</span> recipients
                                    </p>
                                    <p className="text-muted-foreground">Up to {estimatedSegments.toLocaleString()} SMS segments</p>
                                </div>
                                <Button
                                    className="w-full"
                                    type="submit"
                                    disabled={form.processing || audienceCount === 0 || !form.data.name.trim() || !form.data.message.trim()}
                                >
                                    {form.processing ? (
                                        <LoaderCircle className="animate-spin" data-icon="inline-start" />
                                    ) : (
                                        <Send data-icon="inline-start" />
                                    )}
                                    {form.processing ? 'Queuing campaign…' : 'Queue SMS campaign'}
                                </Button>
                                <p className="text-muted-foreground text-xs">
                                    The campaign, audience filters, recipients and delivery outcomes are retained in the audit trail.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </form>

                <Card className="min-w-0 py-0">
                    <CardHeader className="border-b py-5">
                        <CardTitle>Recent SMS campaigns</CardTitle>
                        <CardDescription>Latest organization campaigns and delivery outcomes.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Campaign</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Audience</TableHead>
                                        <TableHead>Results</TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {campaigns.map((campaign) => (
                                        <TableRow key={campaign.id}>
                                            <TableCell>
                                                <p className="font-medium">{campaign.name}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {campaign.createdBy ?? 'Unknown'}
                                                    {campaign.branch ? ` · ${campaign.branch}` : ''}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariant(campaign.status)}>{humanize(campaign.status)}</Badge>
                                            </TableCell>
                                            <TableCell>{humanize(campaign.provider)}</TableCell>
                                            <TableCell>
                                                {humanize(campaign.audienceType)} · {campaign.recipientCount}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {campaign.sentCount} sent · {campaign.simulatedCount} simulated · {campaign.failedCount} failed
                                            </TableCell>
                                            <TableCell>{dateTime(campaign.createdAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!campaigns.length && (
                                        <TableRow>
                                            <TableCell colSpan={6}>
                                                <div className="text-muted-foreground m-4 rounded-lg border border-dashed p-8 text-center">
                                                    No SMS campaigns have been queued yet.
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
