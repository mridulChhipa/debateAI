// hooks/useAuthRedirect.js
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

export function useAuthRedirect(redirectType) {
    const [isLoading, setIsLoading] = useState(true);
    const { authenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Prevent redirect on server-side rendering
        if (typeof window === 'undefined') return;

        const checkAuth = () => {
            if (redirectType === 'guestOnly' && authenticated) {
                // Redirect to dashboard if user is already logged in (for login/register pages)
                router.push('/dashboard');
                return;
            }

            if (redirectType === 'authRequired' && !authenticated) {
                // Redirect to login if user is not authenticated (for protected pages)
                router.push('/login');
                return;
            }

            setIsLoading(false);
        };

        // Small delay to ensure localStorage is read
        const timeoutId = setTimeout(checkAuth, 100);

        return () => clearTimeout(timeoutId);
    }, [authenticated, redirectType, router]);

    return { isLoading, authenticated };
}
