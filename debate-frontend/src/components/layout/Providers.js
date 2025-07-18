"use client"
import { ThemeProvider } from 'next-themes'

export function Providers({ children }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange={false}
        >
            {children}
        </ThemeProvider>
    )
}
