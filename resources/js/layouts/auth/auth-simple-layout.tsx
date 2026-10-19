import { Link } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="relative min-h-svh overflow-hidden bg-[#F3F7F5] font-['Instrument_Sans'] text-[#1E2641]">
            <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(30, 38, 65, 0.10) 1px, transparent 0)',
                    backgroundSize: '30px 30px',
                    maskImage: 'radial-gradient(circle at center, black, transparent 76%)',
                }}
            />
            <div className="pointer-events-none absolute -top-44 -left-32 h-[32rem] w-[32rem] rounded-full bg-[#759987]/16 blur-3xl" />
            <div className="pointer-events-none absolute -right-40 -bottom-52 h-[36rem] w-[36rem] rounded-full bg-[#1E2641]/8 blur-3xl" />

            <main className="relative flex min-h-svh items-center justify-center px-5 py-10 sm:px-8">
                <div className="w-full max-w-[460px]">
                    <header className="mb-6 px-4 text-center">
                        <Link href={route('home')} className="mx-auto inline-flex" aria-label="Back to Alpha Land home">
                            <img src="/images/alpha-land-logo.png" alt="Alpha International Land Developers" className="h-16 w-auto object-contain" />
                        </Link>
                        <p className="mt-4 font-mono text-[10px] font-semibold tracking-[0.18em] text-[#759987] uppercase">
                            Secure operations portal
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#1E2641]">{title}</h1>
                        <p className="mt-2 text-sm leading-6 text-[#667085]">{description}</p>
                    </header>

                    <section className="bg-card text-card-foreground overflow-hidden rounded-lg border shadow-xs">
                        <div className="px-6 py-7 sm:px-9 sm:py-8">{children}</div>
                    </section>

                    <div className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[#7B8492]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#759987]" />
                        <span>Protected by role-based access and auditable controls</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
