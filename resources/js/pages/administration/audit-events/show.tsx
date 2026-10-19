import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Copy, GitCompareArrows, Network, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';

type Change = { field: string; status: 'added' | 'removed' | 'changed'; before: unknown; after: unknown };
type AuditEvent = {
    id: number;
    event_type: string;
    subject_type: string;
    subject_id: number;
    subject: string;
    actor: { id: number; name: string; email: string } | null;
    branch: { id: number; name: string; code: string } | null;
    occurred_at: string;
    created_at: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    changes: Change[];
    ip_hash: string | null;
    user_agent_hash: string | null;
    previous_hash: string | null;
    event_hash: string;
    integrity: { valid: boolean; hash_valid: boolean; chain_valid: boolean; expected_hash: string; expected_previous_hash: string | null };
};
type Props = { event: AuditEvent; navigation: { previous: number | null; next: number | null } };

const formatDate = (value: string) => new Intl.DateTimeFormat('en-ZW', { dateStyle: 'full', timeStyle: 'long' }).format(new Date(value));
const labelEvent = (value: string) => value.replaceAll('.', ' · ').replaceAll('_', ' ');
const displayValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
};

function HashValue({ label, value }: { label: string; value: string | null }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="bg-muted/50 ring-foreground/10 flex flex-col gap-2 rounded-lg p-3 ring-1">
            <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
                {value && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                            await navigator.clipboard.writeText(value);
                            setCopied(true);
                            window.setTimeout(() => setCopied(false), 1500);
                        }}
                    >
                        <Copy data-icon="inline-start" />
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                )}
            </div>
            <code className="text-xs leading-relaxed break-all">{value ?? 'Genesis event — no previous hash'}</code>
        </div>
    );
}

function Snapshot({ title, description, value }: { title: string; description: string; value: Record<string, unknown> | null }) {
    return (
        <Card className="ring-foreground/10 border-0 shadow-none ring-1">
            <CardHeader className="border-b">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                {value ? (
                    <pre className="bg-muted max-h-[32rem] overflow-auto rounded-lg p-4 text-xs leading-relaxed">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center">
                        <p className="font-medium">No {title.toLowerCase()} snapshot</p>
                        <p className="text-muted-foreground mt-1 text-sm">This event did not record a value for this side of the change.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AuditEventShow({ event, navigation }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/administration' },
        { title: 'Audit events', href: '/administration/audit-events' },
        { title: `Event #${event.id}`, href: `/administration/audit-events/${event.id}` },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Audit event #${event.id}`} />
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration/audit-events">
                                <ArrowLeft data-icon="inline-start" />
                                Audit events
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-2">
                            <ShieldCheck aria-hidden="true" />
                            <h1 className="text-2xl font-semibold tracking-tight">Event #{event.id}</h1>
                            <Badge variant="outline" className="capitalize">
                                {labelEvent(event.event_type)}
                            </Badge>
                            <Badge
                                variant={event.integrity.valid ? 'outline' : 'destructive'}
                                className={event.integrity.valid ? 'bg-chart-2/10 text-chart-2' : ''}
                            >
                                {event.integrity.valid ? 'Integrity verified' : 'Integrity issue'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            Recorded {formatDate(event.occurred_at)} against {event.subject}.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {navigation.previous && (
                            <Button variant="outline" asChild>
                                <Link href={`/administration/audit-events/${navigation.previous}`}>
                                    <ArrowLeft data-icon="inline-start" />
                                    Older
                                </Link>
                            </Button>
                        )}
                        {navigation.next && (
                            <Button variant="outline" asChild>
                                <Link href={`/administration/audit-events/${navigation.next}`}>
                                    Newer
                                    <ArrowRight data-icon="inline-end" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {!event.integrity.valid && (
                    <Alert variant="destructive">
                        <CircleAlert aria-hidden="true" />
                        <AlertTitle>Audit chain verification failed</AlertTitle>
                        <AlertDescription>
                            {!event.integrity.hash_valid && 'The stored event contents no longer produce the recorded hash. '}
                            {!event.integrity.chain_valid && 'The previous-hash link does not match the preceding organization event.'}
                        </AlertDescription>
                    </Alert>
                )}

                <section className="bg-card grid gap-x-8 gap-y-5 rounded-xl border p-5 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Actor', event.actor ? `${event.actor.name}\n${event.actor.email}` : 'System'],
                        ['Branch', event.branch ? `${event.branch.name} (${event.branch.code})` : 'Organization-wide'],
                        ['Subject', `${event.subject_type} #${event.subject_id}`],
                        ['Recorded at', formatDate(event.occurred_at)],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
                            <p className="mt-1 font-medium whitespace-pre-line">{value}</p>
                        </div>
                    ))}
                </section>

                <Card className="ring-foreground/10 border-0 shadow-none ring-1">
                    <CardHeader className="border-b">
                        <div className="flex items-center gap-2">
                            <GitCompareArrows aria-hidden="true" />
                            <CardTitle>Recorded changes</CardTitle>
                        </div>
                        <CardDescription>Field-level comparison derived from the immutable before and after snapshots.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {event.changes.length ? (
                            <div className="overflow-hidden rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Field</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Before</TableHead>
                                            <TableHead>After</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {event.changes.map((change) => (
                                            <TableRow key={change.field}>
                                                <TableCell className="font-mono text-xs font-medium">{change.field}</TableCell>
                                                <TableCell>
                                                    <Badge variant={change.status === 'removed' ? 'destructive' : 'outline'} className="capitalize">
                                                        {change.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <pre className="max-w-md text-xs break-words whitespace-pre-wrap">
                                                        {displayValue(change.before)}
                                                    </pre>
                                                </TableCell>
                                                <TableCell>
                                                    <pre className="max-w-md text-xs break-words whitespace-pre-wrap">
                                                        {displayValue(change.after)}
                                                    </pre>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed p-8 text-center">
                                <p className="font-medium">No field-level difference</p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    This event records an action or reference without a changed snapshot.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Snapshot title="Before" description="State captured immediately before the action." value={event.before} />
                    <Snapshot title="After" description="State captured immediately after the action." value={event.after} />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card className="ring-foreground/10 border-0 shadow-none ring-1">
                        <CardHeader className="border-b">
                            <div className="flex items-center gap-2">
                                <Network aria-hidden="true" />
                                <CardTitle>Integrity chain</CardTitle>
                            </div>
                            <CardDescription>Cryptographic links used to detect altered or removed audit entries.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 pt-6">
                            <HashValue label="Previous event hash" value={event.previous_hash} />
                            <HashValue label="Event hash" value={event.event_hash} />
                            <div className="flex flex-wrap gap-2">
                                <Badge variant={event.integrity.hash_valid ? 'outline' : 'destructive'}>
                                    {event.integrity.hash_valid ? 'Payload hash verified' : 'Payload hash mismatch'}
                                </Badge>
                                <Badge variant={event.integrity.chain_valid ? 'outline' : 'destructive'}>
                                    {event.integrity.chain_valid ? 'Chain link verified' : 'Chain link mismatch'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="ring-foreground/10 border-0 shadow-none ring-1">
                        <CardHeader className="border-b">
                            <div className="flex items-center gap-2">
                                <UserRound aria-hidden="true" />
                                <CardTitle>Request fingerprints</CardTitle>
                            </div>
                            <CardDescription>Privacy-preserving hashes recorded from the originating request.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 pt-6">
                            <HashValue label="IP address hash" value={event.ip_hash} />
                            <HashValue label="User agent hash" value={event.user_agent_hash} />
                            <p className="text-muted-foreground text-xs">Raw IP addresses and browser strings are not stored in the audit event.</p>
                        </CardContent>
                    </Card>
                </div>

                {event.integrity.valid && (
                    <Alert>
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>Verification complete</AlertTitle>
                        <AlertDescription>The event payload hash and its link to the preceding organization event both match.</AlertDescription>
                    </Alert>
                )}
            </div>
        </AppLayout>
    );
}
