module.exports = {
    content: [
        './src/pages/**/*.js',
        './src/components/**/*.js',
        './src/app/**/*.js',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                'inter': ['var(--font-inter)'],
                'playfair': ['var(--font-playfair)'],
            },
            colors: {
                'primary': '#2563eb',
                'primary-dark': '#1e40af',
                'surface': '#f8fafc',
                'surface-dark': '#18181b',
                'muted': '#64748b',
                'muted-dark': '#a1a1aa',
                // Add more as needed
            },
            boxShadow: {
                'soft': '0 2px 12px 0 rgba(16,24,40,.08)',
            },
        },
    },
    plugins: [],
}
