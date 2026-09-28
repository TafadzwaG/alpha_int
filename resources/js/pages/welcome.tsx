import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Building2,
    Check,
    ChevronRight,
    CircleDollarSign,
    Files,
    Landmark,
    LayoutDashboard,
    MapPinned,
    Menu,
    ShieldCheck,
    Sparkles,
    UsersRound,
    X,
} from 'lucide-react';
import { useState } from 'react';

const brand = {
    navy: '#1E2641',
    sage: '#759987',
    ink: '#1E2641',
} as const;

const modules = [
    {
        icon: MapPinned,
        eyebrow: 'Land portfolio',
        title: 'Every stand, file and allocation in one clear view.',
        description: 'Follow developments from phase planning to client allocation, with reliable status history across every branch.',
    },
    {
        icon: CircleDollarSign,
        eyebrow: 'Finance and collections',
        title: 'Collections that reconcile back to the source.',
        description: 'Record multi-currency payments, issue traceable receipts and keep client balances grounded in an immutable ledger.',
    },
    {
        icon: ShieldCheck,
        eyebrow: 'Governance',
        title: 'Approvals and accountability built into the workflow.',
        description: 'Protect sensitive actions with role-based access, maker-checker approval and a complete audit trail.',
    },
];

const operatingPillars = [
    { icon: Building2, label: 'Multi-branch operations' },
    { icon: UsersRound, label: 'Client lifecycle management' },
    { icon: Landmark, label: 'Financial control' },
    { icon: BarChart3, label: 'Decision-ready reporting' },
];

const governanceItems = [
    'Maker-checker approvals for sensitive actions',
    'Branch-aware roles and permissions',
    'Append-only financial and audit records',
];

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const primaryHref = auth.user ? route('dashboard') : route('login');

    return (
        <>
            <Head title="Alpha Land ERP">
                <meta name="description" content="The central operations platform for Alpha International Land Developers." />
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
            </Head>

            <div className="min-h-screen overflow-hidden bg-[#FDFDFC] font-['Instrument_Sans'] text-[#1E2641] selection:bg-[#759987] selection:text-white">
                <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E8E8E4]/90 bg-[#FDFDFC]/90 backdrop-blur-xl">
                    <nav className="mx-auto flex min-h-24 max-w-[1320px] items-center justify-between gap-4 px-5 py-2 sm:px-8 lg:px-10">
                        <a href="#top" className="flex shrink-0 items-center" aria-label="Alpha Land home">
                            <img
                                src="/images/alpha-land-logo.png"
                                alt="Alpha International Land Developers"
                                className="h-[4.75rem] w-auto max-w-[5.25rem] object-contain"
                            />
                        </a>

                        <div className="hidden flex-1 items-center justify-end gap-3 min-[430px]:flex md:gap-6 lg:justify-center lg:gap-8">
                            {[
                                ['Platform', '#platform'],
                                ['Capabilities', '#capabilities'],
                                ['Governance', '#governance'],
                            ].map(([label, href]) => (
                                <a
                                    key={label}
                                    href={href}
                                    className="relative pb-1 text-xs font-medium whitespace-nowrap text-[#1E2641]/80 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-[#759987] after:transition-transform hover:text-[#759987] hover:after:scale-x-100 md:text-sm"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>

                        <div className="hidden shrink-0 items-center gap-2.5 min-[1050px]:flex">
                            {!auth.user && (
                                <Link
                                    href={route('register')}
                                    className="inline-flex h-9 items-center justify-center rounded-md px-3.5 text-sm font-medium text-[#1E2641] transition-colors hover:bg-[#EDF3F0]"
                                >
                                    Request access
                                </Link>
                            )}
                            <Link
                                href={primaryHref}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#1E2641] px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-[#2A3454]"
                            >
                                {auth.user ? <LayoutDashboard className="h-4 w-4" /> : null}
                                {auth.user ? 'Dashboard' : 'Portal login'}
                            </Link>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMenuOpen((open) => !open)}
                            className="grid h-9 w-9 place-items-center rounded-md text-[#1E2641] transition-colors hover:bg-[#EDF3F0] min-[430px]:hidden"
                            aria-expanded={menuOpen}
                            aria-controls="mobile-nav"
                            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
                        >
                            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </nav>

                    {menuOpen && (
                        <div id="mobile-nav" className="border-t border-[#E8E8E4] bg-[#FDFDFC]/95 px-5 py-4 backdrop-blur-xl min-[430px]:hidden">
                            <div className="mx-auto flex max-w-[1320px] flex-col gap-1">
                                {[
                                    ['Platform', '#platform'],
                                    ['Capabilities', '#capabilities'],
                                    ['Governance', '#governance'],
                                ].map(([label, href]) => (
                                    <a
                                        key={label}
                                        href={href}
                                        onClick={() => setMenuOpen(false)}
                                        className="rounded-lg px-3 py-3 text-sm font-medium text-[#1E2641] hover:bg-[#EDF3F0]"
                                    >
                                        {label}
                                    </a>
                                ))}
                                <div className="my-2 h-px bg-[#E8E8E4]" />
                                {!auth.user && (
                                    <Link
                                        href={route('register')}
                                        className="rounded-lg px-3 py-3 text-sm font-medium text-[#1E2641] hover:bg-[#EDF3F0]"
                                    >
                                        Request access
                                    </Link>
                                )}
                                <Link
                                    href={primaryHref}
                                    className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1E2641] px-4 text-sm font-medium text-white"
                                >
                                    {auth.user ? 'Open dashboard' : 'Portal login'}
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </header>

                <main id="top">
                    <section className="relative min-h-[92vh] overflow-hidden pt-24">
                        <HeroBackdrop />

                        <div className="relative z-10 mx-auto flex min-h-[calc(92vh-6rem)] max-w-[1320px] items-center px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
                            <div className="grid w-full items-center gap-12 lg:grid-cols-12 lg:gap-10">
                                <div className="lg:col-span-7">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#D9E1DD] bg-white/80 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm">
                                        <Sparkles className="h-3.5 w-3.5 text-[#1E2641]" />
                                        <span>Alpha Land Operations</span>
                                        <span className="hidden text-[#6B7280] sm:inline">· One connected workspace</span>
                                    </div>

                                    <h1 className="mt-6 max-w-3xl text-4xl leading-[1.02] font-bold tracking-[-0.045em] text-[#1E2641] sm:text-5xl lg:text-6xl xl:text-7xl">
                                        Land operations, <span className="text-[#759987]">brought into view.</span>
                                    </h1>

                                    <p className="mt-5 max-w-xl text-base leading-relaxed text-[#4F596B] sm:text-lg">
                                        A secure, connected workspace for managing property portfolios, client accounts, collections and approvals
                                        across Alpha Land.
                                    </p>

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {['Role-based access', 'Multi-branch visibility', 'Traceable approvals'].map((item) => (
                                            <span
                                                key={item}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-[#D9E1DD] bg-white/75 px-2.5 py-1 text-xs font-medium text-[#1E2641] backdrop-blur-sm"
                                            >
                                                <Check className="h-3.5 w-3.5 text-[#759987]" />
                                                {item}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <Link
                                            href={primaryHref}
                                            className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1E2641] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#2A3454]"
                                        >
                                            {auth.user ? 'Continue to dashboard' : 'Enter your workspace'}
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                        <a
                                            href="#platform"
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#759987] bg-white/80 px-5 text-sm font-semibold text-[#1E2641] shadow-xs transition-colors hover:bg-[#759987] hover:text-white"
                                        >
                                            Explore the platform
                                            <ChevronRight className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>

                                <div className="lg:col-span-5">
                                    <OperationsPanel />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="relative border-y border-[#E8E8E4] bg-white/70 py-8">
                        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-7 px-5 sm:px-8 lg:grid-cols-4 lg:px-10">
                            {operatingPillars.map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-3 lg:justify-center">
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#EDF3F0] text-[#759987]">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="text-xs font-semibold text-[#3F485A] sm:text-sm">{label}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="platform" className="relative overflow-hidden px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
                        <div className="pointer-events-none absolute top-12 right-[-8rem] h-72 w-72 rounded-full bg-[#EDF3F0] blur-3xl" />
                        <div className="relative mx-auto max-w-[1240px]">
                            <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                                <div>
                                    <p className="font-mono text-xs tracking-[0.18em] text-[#759987] uppercase">// The connected platform</p>
                                    <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-[-0.035em] text-[#1E2641] sm:text-4xl">
                                        One system from first enquiry to final balance.
                                    </h2>
                                </div>
                                <p className="max-w-xl text-sm leading-7 text-[#667085] sm:text-base lg:justify-self-end">
                                    Alpha Land ERP connects the records teams depend on every day, so branch activity, client progress and financial
                                    decisions share the same trusted context.
                                </p>
                            </div>

                            <div id="capabilities" className="mt-12 grid gap-5 lg:grid-cols-3">
                                {modules.map((module, index) => (
                                    <ModuleCard key={module.eyebrow} {...module} index={index} />
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="governance" className="px-5 pb-20 sm:px-8 lg:px-10 lg:pb-24">
                        <div className="relative mx-auto grid max-w-[1240px] overflow-hidden rounded-2xl bg-[#1E2641] px-6 py-12 text-white shadow-2xl shadow-[#1E2641]/15 sm:px-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-14 lg:py-14">
                            <div className="pointer-events-none absolute -top-40 -right-16 h-96 w-96 rounded-full border-[64px] border-white/[0.035]" />
                            <div className="pointer-events-none absolute -bottom-36 left-[28%] h-72 w-72 rounded-full bg-[#759987]/20 blur-3xl" />
                            <div className="relative">
                                <p className="font-mono text-xs tracking-[0.18em] text-[#AFC5BA] uppercase">// Built for responsible growth</p>
                                <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                                    Clear controls. Better decisions. Stronger service.
                                </h2>
                                <p className="mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
                                    Give every team the information they need while preserving branch boundaries, approval authority and a dependable
                                    record of every critical action.
                                </p>
                            </div>

                            <div className="relative mt-8 grid gap-2.5 lg:mt-0 lg:justify-self-end">
                                {governanceItems.map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur lg:min-w-[390px]"
                                    >
                                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#759987] text-white">
                                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                                        </span>
                                        <span className="text-xs font-medium text-white/90 sm:text-sm">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-[#E8E8E4] bg-[#F7F8F7] px-5 py-16 text-center sm:px-8 lg:px-10">
                        <div className="mx-auto max-w-2xl">
                            <p className="font-mono text-xs tracking-[0.18em] text-[#759987] uppercase">// Your workspace</p>
                            <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#1E2641] sm:text-4xl">Your portfolio starts here.</h2>
                            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#667085] sm:text-base">
                                Access the workspace to manage land, clients, collections and approvals with confidence.
                            </p>
                            <Link
                                href={primaryHref}
                                className="group mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1E2641] px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#2A3454]"
                            >
                                {auth.user ? 'Open dashboard' : 'Sign in to Alpha Land ERP'}
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        </div>
                    </section>
                </main>

                <footer className="border-t border-[#E8E8E4] bg-white px-5 py-8 sm:px-8 lg:px-10">
                    <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
                        <div className="flex items-center gap-3">
                            <LogoMark compact />
                            <div>
                                <p className="text-xs font-semibold text-[#1E2641]">Alpha International Land Developers</p>
                                <p className="mt-0.5 text-[10px] font-medium tracking-[0.08em] text-[#759987] uppercase">Operations Portal</p>
                            </div>
                        </div>
                        <p className="text-xs text-[#737B8C]">Property Managers · Property Sales · Land Developers</p>
                    </div>
                </footer>
            </div>
        </>
    );
}

function LogoMark({ compact = false }: { compact?: boolean }) {
    const size = compact ? 'h-12 w-12' : 'h-16 w-16';

    return (
        <span className={`flex shrink-0 items-center justify-center ${size}`}>
            <img src="/images/alpha-land-logo.png" alt="" className="h-full w-full object-contain" />
        </span>
    );
}

function HeroBackdrop() {
    return (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#FDFDFC_0%,#F8FAF9_72%,#FDFDFC_100%)]" />
            <div className="absolute -top-24 -left-20 h-[30rem] w-[30rem] rounded-full bg-[#759987]/16 blur-3xl" />
            <div className="absolute top-1/4 -right-24 h-[24rem] w-[24rem] rounded-full bg-[#1E2641]/10 blur-3xl" />
            <div
                className="absolute inset-0 opacity-35"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(30, 38, 65, 0.12) 1px, transparent 0)',
                    backgroundSize: '32px 32px',
                    maskImage: 'linear-gradient(to bottom, black 0%, transparent 88%)',
                }}
            />
            <svg className="absolute top-[18%] left-[7%] h-44 w-44 opacity-30" viewBox="0 0 120 120" fill="none">
                <line x1="20" y1="60" x2="55" y2="30" stroke={brand.ink} strokeOpacity="0.12" />
                <line x1="55" y1="30" x2="95" y2="55" stroke={brand.ink} strokeOpacity="0.12" />
                <line x1="55" y1="30" x2="70" y2="90" stroke={brand.sage} strokeOpacity="0.4" />
                <line x1="20" y1="60" x2="70" y2="90" stroke={brand.navy} strokeOpacity="0.2" />
                <circle cx="20" cy="60" r="5" fill={brand.sage} fillOpacity="0.45" />
                <circle cx="55" cy="30" r="6" fill={brand.navy} fillOpacity="0.28" />
                <circle cx="95" cy="55" r="4" fill={brand.sage} fillOpacity="0.4" />
                <circle cx="70" cy="90" r="5" fill={brand.navy} fillOpacity="0.24" />
            </svg>
        </div>
    );
}

function OperationsPanel() {
    const metrics = [
        { icon: MapPinned, label: 'Land portfolio', value: 'Mapped', color: brand.navy },
        { icon: Files, label: 'Client files', value: 'Connected', color: brand.sage },
        { icon: ShieldCheck, label: 'Access control', value: 'Protected', color: brand.ink },
    ];

    return (
        <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-[linear-gradient(135deg,rgba(30,38,65,0.13),rgba(117,153,135,0.12))] blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-[#D9E1DD] bg-white/90 shadow-2xl shadow-black/10 backdrop-blur-md">
                <div className="h-1 bg-[linear-gradient(90deg,#1E2641,#759987)]" />

                <div className="flex items-center justify-between gap-3 border-b border-[#E8E8E4] px-5 py-4">
                    <div>
                        <p className="font-mono text-[10px] tracking-[0.18em] text-[#7A8190] uppercase">Operations pulse</p>
                        <p className="mt-0.5 text-sm font-bold text-[#1E2641]">Portfolio command centre</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#759987]/30 bg-[#EDF3F0] px-2.5 py-1 text-[10px] font-semibold text-[#5A7A6D]">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#759987] opacity-50" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#759987]" />
                        </span>
                        Active
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-px bg-[#E8E8E4]">
                    {metrics.map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="bg-white/95 px-2 py-4 text-center sm:px-3">
                            <span className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDF3F0]">
                                <Icon className="h-4 w-4" style={{ color }} />
                            </span>
                            <p className="font-mono text-xs font-bold tracking-tight text-[#1E2641] sm:text-sm">{value}</p>
                            <p className="mt-0.5 text-[9px] leading-snug text-[#737B8C] sm:text-[10px]">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="border-b border-[#E8E8E4] px-5 py-3">
                    <p className="flex items-center gap-2 text-xs text-[#737B8C]">
                        <BarChart3 className="h-3.5 w-3.5 text-[#759987]" />
                        <span>
                            <strong className="font-semibold text-[#1E2641]">One live view</strong> across branches, balances and approvals
                        </span>
                    </p>
                </div>

                <div className="space-y-2 p-4">
                    <p className="px-1 text-[10px] font-semibold tracking-[0.14em] text-[#737B8C] uppercase">Workflow health</p>
                    {[
                        ['Portfolio records', 'Synchronized', '94%'],
                        ['Client accounts', 'Reconciled', '87%'],
                        ['Approval controls', 'Enforced', '100%'],
                    ].map(([title, status, progress]) => (
                        <div key={title} className="rounded-xl border border-[#E2E5E3] bg-white px-3 py-3 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-[#1E2641]">{title}</p>
                                    <p className="mt-0.5 text-[11px] text-[#737B8C]">{status}</p>
                                </div>
                                <span className="font-mono text-xs font-bold text-[#759987]">{progress}</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EDF3F0]">
                                <div className="h-full rounded-full bg-[#759987]" style={{ width: progress }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-[#E8E8E4] px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A7A6D]">
                        Built around your property portfolio
                        <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                </div>
            </div>
        </div>
    );
}

function ModuleCard({ icon: Icon, eyebrow, title, description, index }: (typeof modules)[number] & { index: number }) {
    return (
        <article className="group flex h-full flex-col rounded-xl border border-[#E2E5E3] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#759987]/45 hover:shadow-lg hover:shadow-[#1E2641]/8">
            <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#EDF3F0] text-[#759987] transition-colors group-hover:bg-[#1E2641] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs font-bold text-[#BEC4C1]">0{index + 1}</span>
            </div>
            <p className="mt-7 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#759987] uppercase">{eyebrow}</p>
            <h3 className="mt-3 text-lg leading-7 font-semibold tracking-[-0.02em] text-[#1E2641]">{title}</h3>
            <p className="mt-3 flex-1 text-sm leading-7 text-[#667085]">{description}</p>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-[#5A7A6D]">
                Built into the workspace
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
        </article>
    );
}
