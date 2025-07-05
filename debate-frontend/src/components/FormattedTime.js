'use client'

export default function FormattedTime12h({ timestamp }) {
    const date = new Date(timestamp)
    const timeString = date.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })

    return <span>{timeString}</span>
}
