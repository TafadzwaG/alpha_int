import { Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Check, Landmark, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

const highlights = [
    { icon: Building2, label: 'Connected property portfolio' },
    { icon: Landmark, label: 'Reliable financial controls' },
    { icon: ShieldCheck, label: 'Permission-led operations' },
];

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="min-h-svh bg-[#F6F8F7] font-['Instrument_Sans'] text-[#1E2641]">
            <div className="grid min-h-svh md:grid-cols-[0.92fr_1.08fr] xl:grid-cols-[1.02fr_0.98fr]">
                <aside className="relative hidden overflow-hidden border-r border-[#DDE5E1] bg-[#EDF3F0] md:flex md:flex-col md:p-8 lg:p-12">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-35"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(30, 38, 65, 0.12) 1px, transparent 0)',
                            backgroundSize: '30px 30px',
                            maskImage: 'linear-gradient(to bottom, black 0%, transparent 88%)',
                        }}
                    />
                    <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#759987]/20 blur-3xl" />
                    <div className="pointer-events-none absolute -right-32 -bottom-24 h-96 w-96 rounded-full bg-[#1E2641]/8 blur-3xl" />

                    <Link href={route('home')} className="relative z-10 inline-flex w-fit items-center" aria-label="Back to Alpha Land home">
                        <img
                            src="/images/alpha-land-logo.png"
                            alt="Alpha International Land Developers"
                            className="h-24 w-auto max-w-[6.5rem] object-contain"
                        />
                    </Link>

                    <div className="relative z-10 my-auto max-w-xl py-12">
                        <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-[#759987] uppercase">Alpha Land ERP</p>
                        <h2 className="mt-5 max-w-lg text-4xl leading-[1.04] font-semibold tracking-[-0.045em] text-[#1E2641] lg:text-5xl">
                            Your property operations, securely connected.
                        </h2>
                        <p className="mt-5 max-w-lg text-sm leading-7 text-[#5F6979] lg:text-base">
                            One trusted workspace for land records, client accounts, collections, approvals and branch-level visibility.
                        </p>

                        <div className="mt-8 grid gap-3">
                            {highlights.map(({ icon: Icon, label }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-sm"
                                >
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#1E2641] text-white">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="text-sm font-semibold text-[#303A50]">{label}</span>
                                    <Check className="ml-auto h-4 w-4 text-[#759987]" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 flex items-center gap-2 border-t border-[#D4DFD9] pt-5 text-xs text-[#667085]">
                        <ShieldCheck className="h-4 w-4 text-[#759987]" />
                        Protected by role-based access and auditable controls
                    </div>
                </aside>

                <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
                    <div className="pointer-events-none absolute top-[-8rem] right-[-7rem] h-80 w-80 rounded-full bg-[#759987]/10 blur-3xl" />
                    <div className="pointer-events-none absolute bottom-[-10rem] left-[-9rem] h-96 w-96 rounded-full bg-[#1E2641]/5 blur-3xl" />

                    <div className="relative w-full max-w-[460px]">
                        <div className="mb-6 flex items-center justify-between md:justify-end">
                            <Link href={route('home')} className="inline-flex items-center md:hidden" aria-label="Back to Alpha Land home">
                                <img
                                    src="/images/alpha-land-logo.png"
                                    alt="Alpha International Land Developers"
                                    className="h-20 w-auto max-w-[5.5rem] object-contain"
                                />
                            </Link>
                            <Link
                                href={route('home')}
                                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-[#667085] transition-colors hover:bg-[#EDF3F0] hover:text-[#1E2641]"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to home
                            </Link>
                        </div>

                        <section className="overflow-hidden rounded-2xl border border-[#DDE5E1] bg-white shadow-[0_24px_70px_rgba(30,38,65,0.10)]">
                            <div className="px-6 pt-8 pb-7 sm:px-9 sm:pt-9">
                                <div className="flex items-start gap-4">
                                    <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EDF3F0] sm:flex">
                                        <img src="/images/alpha-land-logo.png" alt="" className="h-10 w-10 object-contain" />
                                    </span>
                                    <div>
                                        <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#759987] uppercase">
                                            Secure operations portal
                                        </p>
                                        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1E2641]">{title}</h1>
                                        <p className="mt-2 text-sm leading-6 text-[#667085]">{description}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-[#EDF0EE] px-6 py-7 sm:px-9 sm:py-8">{children}</div>
                        </section>

                        <p className="mt-5 text-center text-[11px] leading-5 text-[#8A929F]">
                            Alpha International Land Developers · Property Managers · Property Sales · Land Developers
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
