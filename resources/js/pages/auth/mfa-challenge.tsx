import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

type Props = { required: boolean; emailHint?: string };

export default function MfaChallenge({ required, emailHint }: Props) {
    const form = useForm<{ [key: string]: string; code: string }>({ code: '' });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/mfa-challenge');
    };

    return (
        <AuthLayout
            title="Verify your sign-in"
            description={required ? `Enter the six-digit code sent to ${emailHint}.` : 'Multi-factor verification is not required.'}
        >
            <Head title="Sign-in verification" />
            {required ? (
                <form onSubmit={submit} className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="code">Verification code</Label>
                        <Input
                            id="code"
                            value={form.data.code}
                            onChange={(event) => form.setData('code', event.target.value)}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            autoFocus
                        />
                        <InputError message={form.errors.code} />
                    </div>
                    <Button type="submit" disabled={form.processing}>
                        Verify and continue
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.post('/mfa-challenge/resend')}>
                        Send a new code
                    </Button>
                </form>
            ) : (
                <Button onClick={() => router.visit('/select-branch')}>Continue</Button>
            )}
        </AuthLayout>
    );
}
