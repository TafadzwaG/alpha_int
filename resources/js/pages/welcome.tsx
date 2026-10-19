import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import AppearanceTabs from '@/components/appearance-tabs';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Building2,
    Check,
    ChevronRight,
    CircleDollarSign,
    Landmark,
    LayoutDashboard,
    LogIn,
    MapPinned,
    Menu,
    ShieldCheck,
    Sparkles,
    UsersRound,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const brand = {
    navy: '#1E2641',
    sage: '#759987',
    ink: '#1E2641',
} as const;

const heroImages = [
    '/images/hero/estate-aerial.webp',
    '/images/hero/modern-homes.webp',
    '/images/hero/surveyed-stands.webp',
    '/images/hero/gated-community.webp',
] as const;

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

const branchLocations = [
    { name: 'Harare', x: 244.8, y: 91.7, labelX: 237, labelY: 106, anchor: 'end' },
    { name: 'Shamva', x: 261.9, y: 74.8, labelX: 270, labelY: 71, anchor: 'start' },
    { name: 'Beitbridge', x: 210.5, y: 234.8, labelX: 214, labelY: 251, anchor: 'middle' },
    { name: 'Redcliffe', x: 203.4, y: 131, labelX: 212, labelY: 128, anchor: 'start' },
    { name: 'Bulawayo', x: 164.3, y: 167.4, labelX: 156, labelY: 163, anchor: 'end' },
    { name: 'Gwanda', x: 177.9, y: 193, labelX: 186, labelY: 207, anchor: 'start' },
    { name: 'Plumtree', x: 139.3, y: 178.3, labelX: 130, labelY: 190, anchor: 'end' },
] as const;

const zimbabweOutline =
    'M 249.3 236 L 232 232.7 L 221 236.6 L 205.2 231.1 L 192 230.8 L 171.2 216 L 145.9 211 L 136.3 190.3 L 136.3 178.8 L 122.3 175.3 L 85.4 139.5 L 75.1 120.6 L 68.6 114.8 L 56 88.7 L 92.5 92.3 L 103.1 96 L 114.1 95.3 L 132.1 74.2 L 160.5 47.3 L 172.2 44.8 L 176.1 33.5 L 194.7 20.5 L 219.4 16 L 221.5 28.2 L 248.7 27.5 L 263.9 34.4 L 270.9 42.5 L 286.4 44.8 L 303.4 55.3 L 303.4 96.6 L 297.1 119.2 L 295.7 143.6 L 300.9 153.3 L 297.2 172.5 L 292.3 175.4 L 283.7 199 L 249.3 236 Z';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const primaryHref = auth.user ? route('dashboard') : route('login');

    useEffect(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-reveal]'));

        if (elements.length === 0) {
            return;
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reducedMotion || !('IntersectionObserver' in window)) {
            elements.forEach((element) => element.setAttribute('data-reveal-state', 'visible'));
            return;
        }

        document.documentElement.classList.add('scroll-reveal-ready');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.setAttribute('data-reveal-state', 'visible');
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
        );

        elements.forEach((element) => observer.observe(element));

        return () => {
            observer.disconnect();
            document.documentElement.classList.remove('scroll-reveal-ready');
        };
    }, []);

    return (
        <>
            <Head title="Alpha Land ERP">
                <meta name="description" content="The central operations platform for Alpha International Land Developers." />
                <link rel="preload" as="image" href={heroImages[0]} type="image/webp" />
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
            </Head>

            <div className="welcome-shell min-h-screen overflow-hidden bg-[#FDFDFC] font-['Instrument_Sans'] text-[#1E2641] selection:bg-[#759987] selection:text-white">
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

                        <AppearanceToggleDropdown className="hidden shrink-0 min-[430px]:block" />

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
                                {auth.user ? <LayoutDashboard className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
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
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-semibold tracking-[0.14em] text-[#737B8C] uppercase">Appearance</p>
                                    <AppearanceTabs className="mt-2 flex w-full" />
                                </div>
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
                                <div data-scroll-reveal="left" className="lg:col-span-6">
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

                                <div data-scroll-reveal="right" className="lg:col-span-6" style={{ transitionDelay: '120ms' }}>
                                    <OperationsPanel />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="relative border-y border-[#E8E8E4] bg-white/70 py-8">
                        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-7 px-5 sm:px-8 lg:grid-cols-4 lg:px-10">
                            {operatingPillars.map(({ icon: Icon, label }, index) => (
                                <div
                                    key={label}
                                    data-scroll-reveal="up"
                                    className="flex items-center gap-3 lg:justify-center"
                                    style={{ transitionDelay: `${index * 80}ms` }}
                                >
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
                                <div data-scroll-reveal="left">
                                    <p className="font-mono text-xs tracking-[0.18em] text-[#759987] uppercase">// The connected platform</p>
                                    <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-[-0.035em] text-[#1E2641] sm:text-4xl">
                                        One system from first enquiry to final balance.
                                    </h2>
                                </div>
                                <p
                                    data-scroll-reveal="right"
                                    className="max-w-xl text-sm leading-7 text-[#667085] sm:text-base lg:justify-self-end"
                                    style={{ transitionDelay: '100ms' }}
                                >
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
                        <div
                            data-scroll-reveal="up"
                            className="relative mx-auto grid max-w-[1240px] overflow-hidden rounded-2xl bg-[#1E2641] px-6 py-12 text-white shadow-2xl shadow-[#1E2641]/15 sm:px-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-14 lg:py-14"
                        >
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
                        <div data-scroll-reveal="up" className="mx-auto max-w-2xl">
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
                    <div
                        data-scroll-reveal="up"
                        className="mx-auto flex max-w-[1240px] flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left"
                    >
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
    const delays = ['0s', '-24s', '-16s', '-8s'];

    return (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute inset-0 overflow-hidden bg-[#E8EFEB]">
                {heroImages.map((src, index) => (
                    <img
                        key={src}
                        src={src}
                        alt=""
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                        className="hero-slide absolute inset-0 h-full w-full object-cover object-center"
                        style={{ animationDelay: delays[index] }}
                    />
                ))}
            </div>
            <div className="welcome-hero-side-overlay absolute inset-0 bg-[linear-gradient(90deg,rgba(253,253,252,0.97)_0%,rgba(253,253,252,0.91)_34%,rgba(248,250,249,0.64)_58%,rgba(30,38,65,0.22)_100%)]" />
            <div className="welcome-hero-depth-overlay absolute inset-0 bg-[linear-gradient(180deg,rgba(253,253,252,0.45)_0%,transparent_24%,transparent_72%,rgba(253,253,252,0.72)_100%)]" />
            <div className="absolute -top-24 -left-20 h-[30rem] w-[30rem] rounded-full bg-[#759987]/12 blur-3xl" />
            <div className="absolute top-1/4 -right-24 h-[24rem] w-[24rem] rounded-full bg-[#1E2641]/12 blur-3xl" />
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(30, 38, 65, 0.12) 1px, transparent 0)',
                    backgroundSize: '32px 32px',
                    maskImage: 'linear-gradient(to bottom, black 0%, transparent 88%)',
                }}
            />
            <svg className="absolute top-[18%] left-[7%] h-44 w-44 opacity-20" viewBox="0 0 120 120" fill="none">
                <line x1="20" y1="60" x2="55" y2="30" stroke={brand.ink} strokeOpacity="0.12" />
                <line x1="55" y1="30" x2="95" y2="55" stroke={brand.ink} strokeOpacity="0.12" />
                <line x1="55" y1="30" x2="70" y2="90" stroke={brand.sage} strokeOpacity="0.4" />
                <line x1="20" y1="60" x2="70" y2="90" stroke={brand.navy} strokeOpacity="0.2" />
                <circle cx="20" cy="60" r="5" fill={brand.sage} fillOpacity="0.45" />
                <circle cx="55" cy="30" r="6" fill={brand.navy} fillOpacity="0.28" />
                <circle cx="95" cy="55" r="4" fill={brand.sage} fillOpacity="0.4" />
                <circle cx="70" cy="90" r="5" fill={brand.navy} fillOpacity="0.24" />
            </svg>

            <div className="absolute right-8 bottom-8 hidden items-center gap-2 rounded-full border border-white/35 bg-[#1E2641]/35 px-3 py-2 text-[10px] font-semibold tracking-[0.16em] text-white uppercase shadow-lg backdrop-blur-md md:flex">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#79B196] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#79B196]" />
                </span>
                Four views · One portfolio
            </div>
        </div>
    );
}

function OperationsPanel() {
    return (
        <div className="relative">
            <div className="text-card-foreground relative overflow-hidden rounded-xl border border-white/60 bg-white/55 shadow-[0_16px_48px_rgba(30,38,65,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl dark:border-white/15 dark:bg-slate-950/55">
                <ZimbabweBranchMap />

                <div className="border-t border-white/40 px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A7A6D]">
                        Built around your property portfolio
                        <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                </div>
            </div>
        </div>
    );
}

function ZimbabweBranchMap() {
    const harare = branchLocations[0];

    return (
        <div className="p-4">
            <div className="flex items-end justify-between gap-3 px-1">
                <div>
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-[#737B8C] uppercase">Branch network</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1E2641]">Connected across Zimbabwe</p>
                </div>
                <span className="rounded-full bg-[#EDF3F0] px-2 py-1 font-mono text-[9px] font-bold tracking-[0.08em] text-[#5A7A6D] uppercase">
                    7 locations
                </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-[#D9E1DD] bg-[linear-gradient(145deg,rgba(237,243,240,0.78),rgba(255,255,255,0.52))] dark:bg-[linear-gradient(145deg,rgba(23,37,54,0.96),rgba(12,20,33,0.84))]">
                <svg
                    viewBox="40 0 280 260"
                    className="h-[22rem] w-full sm:h-[26rem] lg:h-[29rem]"
                    role="img"
                    aria-labelledby="zimbabwe-map-title zimbabwe-map-description"
                >
                    <title id="zimbabwe-map-title">Alpha Land locations across Zimbabwe</title>
                    <desc id="zimbabwe-map-description">
                        Dotted connections from Harare to Shamva, Beitbridge, Redcliffe, Bulawayo, Gwanda and Plumtree.
                    </desc>

                    <defs>
                        <pattern id="map-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="0.8" className="fill-[#759987]/20" />
                        </pattern>
                    </defs>

                    <rect width="360" height="260" fill="url(#map-grid)" />
                    <path
                        d={zimbabweOutline}
                        className="fill-white/70 stroke-[#759987] dark:fill-[#132335]/90 dark:stroke-[#8DB09F]"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />

                    {branchLocations.slice(1).map((location, index) => (
                        <path
                            key={location.name}
                            d={`M ${harare.x} ${harare.y} Q ${(harare.x + location.x) / 2 + (index % 2 === 0 ? -8 : 8)} ${(harare.y + location.y) / 2 - 4} ${location.x} ${location.y}`}
                            className="branch-connection fill-none stroke-[#1E2641]/38 dark:stroke-[#A8CCBA]/55"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeDasharray="2 7"
                            style={{ animationDelay: `${index * -0.35}s` }}
                        />
                    ))}

                    {branchLocations.map((location) => {
                        const isHub = location.name === 'Harare';

                        return (
                            <g key={location.name}>
                                {isHub ? <circle cx={location.x} cy={location.y} r="8" className="fill-[#0639A6]/12 stroke-[#0639A6]/35" /> : null}
                                <circle
                                    cx={location.x}
                                    cy={location.y}
                                    r={isHub ? 4.5 : 3.5}
                                    className={isHub ? 'fill-[#0639A6] stroke-white' : 'fill-[#00A95C] stroke-white'}
                                    strokeWidth="1.5"
                                />
                                <text
                                    x={location.labelX}
                                    y={location.labelY}
                                    textAnchor={location.anchor}
                                    className="fill-[#1E2641] stroke-white/90 text-[9px] font-semibold dark:fill-[#F3F7F5] dark:stroke-[#132335]"
                                    strokeWidth="2.5"
                                    paintOrder="stroke"
                                >
                                    {location.name}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div className="mt-2.5 flex items-center justify-between px-1 text-[10px] text-[#737B8C]">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#0639A6]" />
                    Operations hub
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#00A95C]" />
                    Connected location
                </span>
            </div>
        </div>
    );
}

function ModuleCard({ icon: Icon, eyebrow, title, description, index }: (typeof modules)[number] & { index: number }) {
    return (
        <article
            data-scroll-reveal="up"
            className="group flex h-full flex-col rounded-xl border border-[#E2E5E3] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#759987]/45 hover:shadow-lg hover:shadow-[#1E2641]/8"
            style={{ transitionDelay: `${index * 90}ms` }}
        >
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
