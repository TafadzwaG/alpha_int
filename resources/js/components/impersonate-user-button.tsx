import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
export default function ImpersonateUserButton({ user }: { user: { id: number; name: string; email: string } }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    return (
        <>
            <Button
                size="sm"
                onClick={() => {
                    setError('');
                    setOpen(true);
                }}
            >
                <LogIn data-icon="inline-start" />
                Impersonate
            </Button>
            <AlertDialog
                open={open}
                onOpenChange={(value) => {
                    if (!busy) setOpen(value);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogTitle className="text-lg font-semibold">Impersonate {user.name}?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-sm">
                        Continue as {user.name} ({user.email}). This starts an audited session with this user's access. Return to your administrator
                        account from the user menu when finished.
                    </AlertDialogDescription>
                    {error && (
                        <p role="alert" className="text-destructive text-sm">
                            {error}
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel asChild>
                            <Button variant="outline" disabled={busy}>
                                Cancel
                            </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                disabled={busy}
                                onClick={(event) => {
                                    event.preventDefault();
                                    router.post(
                                        `/administration/users/${user.id}/impersonate`,
                                        {},
                                        {
                                            onStart: () => setBusy(true),
                                            onSuccess: () => setOpen(false),
                                            onError: (errors) => setError(Object.values(errors).join(' ')),
                                            onFinish: () => setBusy(false),
                                        },
                                    );
                                }}
                            >
                                <LogIn data-icon="inline-start" />
                                {busy ? 'Starting session...' : 'Continue as user'}
                            </Button>
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
