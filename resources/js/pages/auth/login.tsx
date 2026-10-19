import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginForm {
    [key: string]: string | boolean;
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Log in to your account" description="Enter your email and password below to log in">
            <Head title="Log in" />

            {status && (
                <div className="mb-5 rounded-lg border border-[#BFD7C9] bg-[#EDF7F1] px-4 py-3 text-sm font-medium text-[#4F7563]">{status}</div>
            )}

            <form className="flex flex-col gap-5" onSubmit={submit}>
                <div className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-[#303A50]">
                            Email address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@example.com"
                            className="h-9 border-[#D7DEDA] bg-[#FBFCFB] px-3.5 text-sm shadow-none focus-visible:border-[#759987] focus-visible:ring-[#759987]/20"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password" className="text-sm font-semibold text-[#303A50]">
                                Password
                            </Label>
                            {canResetPassword && (
                                <TextLink
                                    href={route('password.request')}
                                    className="ml-auto text-xs font-semibold text-[#5A7A6D] no-underline hover:text-[#1E2641]"
                                    tabIndex={4}
                                >
                                    Forgot password?
                                </TextLink>
                            )}
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Password"
                                className="h-9 border-[#D7DEDA] bg-[#FBFCFB] px-3.5 pr-10 text-sm shadow-none focus-visible:border-[#759987] focus-visible:ring-[#759987]/20"
                            />
                            <button
                                type="button"
                                tabIndex={3}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                aria-pressed={showPassword}
                                aria-controls="password"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setShowPassword((visible) => !visible)}
                                className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-md text-[#7B8492] transition-colors hover:text-[#1E2641] focus-visible:ring-2 focus-visible:ring-[#759987]/30 focus-visible:outline-none"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            tabIndex={5}
                            checked={data.remember}
                            onCheckedChange={(checked) => setData('remember', checked === true)}
                            className="border-[#BFCAC5] data-[state=checked]:border-[#759987] data-[state=checked]:bg-[#759987] data-[state=checked]:text-white"
                        />
                        <Label htmlFor="remember" className="text-sm font-medium text-[#4F596B]">
                            Remember me
                        </Label>
                    </div>

                    <Button
                        type="submit"
                        className="mt-2 h-11 w-full bg-[#1E2641] font-semibold text-white shadow-sm hover:bg-[#2A3454]"
                        tabIndex={6}
                        disabled={processing}
                    >
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Log in
                    </Button>
                </div>

                <div className="text-center text-sm text-[#737B8C]">Need access? Contact your system administrator for an invitation.</div>
            </form>
        </AuthLayout>
    );
}
