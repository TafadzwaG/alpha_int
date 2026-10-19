import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Building2, LoaderCircle, LogOut, MapPin, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

type Branch = {
    id: number;
    code: string;
    name: string;
    address: string | null;
    isHome: boolean;
    isCurrent: boolean;
};

type Props = {
    branches: Branch[];
    errors?: {
        branch_id?: string;
    };
};

export default function SelectBranch({ branches, errors }: Props) {
    const [selectingId, setSelectingId] = useState<number | null>(null);

    const selectBranch = (branchId: number) => {
        setSelectingId(branchId);
        router.post(
            '/select-branch',
            { branch_id: branchId },
            {
                preserveScroll: true,
                onFinish: () => setSelectingId(null),
            },
        );
    };

    return (
        <>
            <Head title="Select branch" />
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
                    <section className="bg-card text-card-foreground w-full max-w-2xl overflow-hidden rounded-lg border shadow-xs">
                        <header className="border-b border-[#E7ECE9] px-6 py-7 text-center sm:px-10 sm:py-8">
                            <Link href={route('home')} className="mx-auto inline-flex" aria-label="Back to Alpha Land home">
                                <img
                                    src="/images/alpha-land-logo.png"
                                    alt="Alpha International Land Developers"
                                    className="h-16 w-auto object-contain"
                                />
                            </Link>
                            <p className="mt-4 font-mono text-[10px] font-semibold tracking-[0.18em] text-[#759987] uppercase">
                                Secure branch access
                            </p>
                            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Choose your branch</h1>
                            <p className="mt-2 text-sm leading-6 text-[#667085]">Select the branch you are working in for this session.</p>
                        </header>

                        <div className="px-6 py-6 sm:px-10 sm:py-8">
                            {errors?.branch_id && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {errors.branch_id}
                                </div>
                            )}

                            {branches.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-sm text-[#667085]">Only branches assigned to your account are shown.</p>
                                        <Badge variant="outline" className="shrink-0 border-[#C9D9D1] text-[#5A7A6D]">
                                            {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
                                        </Badge>
                                    </div>

                                    <div className="grid max-h-[min(48vh,28rem)] gap-3 overflow-y-auto pr-1">
                                        {branches.map((branch) => {
                                            const isSelecting = selectingId === branch.id;

                                            return (
                                                <button
                                                    key={branch.id}
                                                    type="button"
                                                    onClick={() => selectBranch(branch.id)}
                                                    disabled={selectingId !== null}
                                                    className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-[#DDE5E1] bg-[#FBFCFB] p-4 text-left transition-all hover:border-[#759987] hover:bg-[#F3F7F5] focus-visible:ring-2 focus-visible:ring-[#759987]/30 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
                                                >
                                                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E7F1EC] text-[#5A7A6D] transition-colors group-hover:bg-[#759987] group-hover:text-white">
                                                        <Building2 className="h-5 w-5" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex flex-wrap items-center gap-2">
                                                            <span className="truncate text-base font-semibold text-[#1E2641]">{branch.name}</span>
                                                            {branch.isHome && (
                                                                <Badge className="bg-[#EDF3F0] text-[10px] text-[#5A7A6D] shadow-none hover:bg-[#EDF3F0]">
                                                                    Home branch
                                                                </Badge>
                                                            )}
                                                            {branch.isCurrent && (
                                                                <Badge className="bg-[#1E2641] text-[10px] text-white shadow-none hover:bg-[#1E2641]">
                                                                    Current
                                                                </Badge>
                                                            )}
                                                        </span>
                                                        <span className="mt-1 flex items-center gap-1.5 text-xs text-[#737B8C]">
                                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate">{branch.address || `${branch.code} branch`}</span>
                                                        </span>
                                                    </span>
                                                    {isSelecting ? (
                                                        <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-[#759987]" />
                                                    ) : (
                                                        <ArrowRight className="h-5 w-5 shrink-0 text-[#98A2B3] transition-transform group-hover:translate-x-1 group-hover:text-[#5A7A6D]" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                                    <div className="flex items-start gap-3">
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                                            <ShieldAlert className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <h2 className="font-semibold text-amber-950">No branch access assigned</h2>
                                            <p className="mt-1 text-sm leading-6 text-amber-800">
                                                Ask a system administrator to assign at least one active branch to your account before continuing.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 border-t border-[#EDF0EE] pt-5">
                                <Button
                                    variant="ghost"
                                    className="w-full cursor-pointer text-[#667085] hover:bg-[#EDF3F0] hover:text-[#1E2641]"
                                    asChild
                                >
                                    <Link href="/logout" method="post" as="button">
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
