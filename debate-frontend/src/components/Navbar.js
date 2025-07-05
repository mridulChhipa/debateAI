import React, { useState } from "react";
import { Menu, X, LogOut, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function Navbar() {
    const { authenticated, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const linksLoggedOut = [
        { href: "/login", label: "Login" },
        { href: "/register", label: "Register" },
    ];

    const linksLoggedIn = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/profile", label: "Profile" },
        { href: "/learning", label: "Learning" },
    ];

    const linksToShow = authenticated ? linksLoggedIn : linksLoggedOut;

    const handleLogout = () => {
        logout();
        setOpen(false);
        router.push("/login");
    };

    return (
        <>
            {/* Overlay for mobile menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Main Navbar */}
            <nav className="fixed w-full top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/30 dark:border-gray-700/30 shadow-lg shadow-gray-200/20 dark:shadow-gray-900/20">
                <div className="container mx-auto flex items-center justify-between px-6 py-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative">
                            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-blue-600 dark:bg-blue-400 rounded-full blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-purple-400 dark:to-blue-300 bg-clip-text text-transparent">
                            DebateAI
                        </span>
                    </Link>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setOpen(!open)}
                        className="md:hidden relative p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 group"
                    >
                        <motion.div
                            animate={{ rotate: open ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {open ? (
                                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            ) : (
                                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            )}
                        </motion.div>
                    </button>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-2">
                        {linksToShow.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`relative px-6 py-3 rounded-2xl font-semibold transition-all duration-200 group overflow-hidden ${pathname === href
                                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
                                    }`}
                            >
                                <span className="relative z-10">{label}</span>
                                {pathname !== href && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                )}
                            </Link>
                        ))}

                        {authenticated && (
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 group"
                            >
                                <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                                Logout
                            </button>
                        )}

                        <div className="ml-2">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Sliding Menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700 shadow-2xl z-50 md:hidden"
                    >
                        <div className="flex flex-col h-full">
                            {/* Mobile Menu Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                        DebateAI
                                    </span>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>

                            {/* Mobile Menu Links */}
                            <div className="flex-1 px-6 py-8">
                                <div className="space-y-4">
                                    {linksToShow.map(({ href, label }, index) => (
                                        <motion.div
                                            key={href}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 + 0.2 }}
                                        >
                                            <Link
                                                href={href}
                                                onClick={() => setOpen(false)}
                                                className={`block px-6 py-4 rounded-2xl font-semibold transition-all duration-200 ${pathname === href
                                                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
                                                    }`}
                                            >
                                                {label}
                                            </Link>
                                        </motion.div>
                                    ))}

                                    {authenticated && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: linksToShow.length * 0.1 + 0.2 }}
                                        >
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 w-full px-6 py-4 rounded-2xl font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                            >
                                                <LogOut className="w-5 h-5" />
                                                Logout
                                            </button>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Menu Footer */}
                            <div className="px-6 py-6 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Theme</span>
                                    <ThemeToggle />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
