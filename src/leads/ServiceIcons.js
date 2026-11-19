import React from 'react';

function ServiceIcon({ children, ...props }) {
    return (
        <svg
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {children}
        </svg>
    );
}

export function NewWebsiteIcon(props) {
    return (
        <ServiceIcon {...props}>
            <path d="M20 11v7l-2 2H4V5l2-2h9M4 9h10" />
            <path d="M8 14h5v3H8z" stroke="#6bafcb" />
            <path d="m17 4 3-3 3 3-3 3z" fill="#a7efff" stroke="none" />
        </ServiceIcon>
    );
}

export function OperationsDashboardIcon(props) {
    return (
        <ServiceIcon {...props}>
            <path d="M21 9V5l-2-2H6L3 6v15h15l3-3v-2M8 4v16" />
            <path d="M12 15v2m4-6v6" stroke="#6bafcb" />
            <path d="M20 11v2" stroke="#a7efff" strokeWidth="2.6" />
        </ServiceIcon>
    );
}

export function ProjectUpdateIcon(props) {
    return (
        <ServiceIcon {...props}>
            <path d="m3 10 2-4 4-3h7l4 4m-4 0h4V3M21 14l-2 4-4 3H8l-4-4m4 0H4v4" />
            <path d="m8.5 12 2.5 2.5 4.5-5" stroke="#a7efff" />
        </ServiceIcon>
    );
}

export function SystemPulseIcon(props) {
    return (
        <ServiceIcon {...props}>
            <path d="M7 4H4L2 6v3m15-5h3l2 2v3M2 15v3l2 2h3m15-5v3l-2 2h-3" />
            <path d="M2 12h5l3-4 3 8 3-4h6" stroke="#a7efff" />
        </ServiceIcon>
    );
}

export function AdviceIcon(props) {
    return (
        <ServiceIcon {...props}>
            <path d="M11 4H6L3 7v13l5-4h10l3-3v-3" />
            <path d="M7 10h3" stroke="#6bafcb" />
            <path d="m17 2 2 3 3 2-3 1-2 3-2-3-3-1 3-2z" fill="#a7efff" stroke="none" />
        </ServiceIcon>
    );
}
