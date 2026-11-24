import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { FaCommentDots, FaTimes } from 'react-icons/fa';
import avatarSmall from '../../assets/avatar/tomek_small.webp';
import { pageKey } from '../../leads/chatScenario';
import { trackEvent } from '../../leads/funnelEvents';
import { loadLeadSession, updateLeadSession } from '../../leads/leadSession';
import './LeadChat.css';

const ChatWindow = lazy(() => import('./ChatWindow'));

export const TEASER_DELAY_MS = 15000;
const TEASER_MIN_DELAY_MS = 5000;
const TEASER_DURATION_MS = 12000;
const CHAT_SEEN_KEY = 'shellty.chatSeen';
const NO_TEASER_PAGES = ['/contact'];

function chatSeenBefore() {
    try {
        return Boolean(localStorage.getItem(CHAT_SEEN_KEY));
    } catch {
        return true;
    }
}

function markChatSeen() {
    try {
        localStorage.setItem(CHAT_SEEN_KEY, '1');
    } catch {}
}

function teaserAllowed(pathname) {
    const session = loadLeadSession();
    return !NO_TEASER_PAGES.includes(pathname) && !session.engaged && !session.chatTeaserShown;
}

export default function LeadChat({ open, onOpen, onClose }) {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const [teaser, setTeaser] = useState(false);
    const [pulse, setPulse] = useState(() => !chatSeenBefore());
    const [hasOpened, setHasOpened] = useState(open);
    const launcherRef = useRef(null);

    useEffect(() => {
        if (open) setHasOpened(true);
    }, [open]);

    useEffect(() => {
        if (open || !teaserAllowed(pathname)) return undefined;
        const startedAt = Date.now();
        let timer;
        const stop = () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', onScroll);
        };
        const show = () => {
            stop();
            if (!teaserAllowed(pathname)) return;
            updateLeadSession({ chatTeaserShown: true });
            setTeaser(true);
            trackEvent('chat_teaser_shown');
        };
        function onScroll() {
            const halfPage = document.documentElement.scrollHeight / 2;
            const reachedHalf = window.scrollY + window.innerHeight >= halfPage;
            if (reachedHalf && Date.now() - startedAt >= TEASER_MIN_DELAY_MS) show();
        }
        timer = setTimeout(show, TEASER_DELAY_MS);
        window.addEventListener('scroll', onScroll, { passive: true });
        return stop;
    }, [open, pathname]);

    useEffect(() => {
        if (!teaser) return undefined;
        if (open || NO_TEASER_PAGES.includes(pathname)) {
            setTeaser(false);
            return undefined;
        }
        const timer = setTimeout(() => setTeaser(false), TEASER_DURATION_MS);
        return () => clearTimeout(timer);
    }, [teaser, open, pathname]);

    const openChat = () => {
        setTeaser(false);
        setPulse(false);
        markChatSeen();
        onOpen();
    };

    const closeChat = useCallback(() => {
        onClose();
        launcherRef.current?.focus();
    }, [onClose]);

    return (
        <>
            <div className="lc-launcher-wrap">
                {teaser && (
                    <div className="lc-teaser" role="status">
                        <button type="button" className="lc-teaser__text" onClick={openChat}>
                            {t(`chat.teasers.${pageKey(pathname)}`)}
                        </button>
                        <button
                            type="button"
                            className="lc-teaser__close"
                            onClick={() => setTeaser(false)}
                            aria-label={t('chat.closeTeaser')}
                        >
                            <FaTimes aria-hidden="true" />
                        </button>
                    </div>
                )}
                <button
                    ref={launcherRef}
                    type="button"
                    className={`lc-launcher${pulse ? ' is-pulse' : ''}`}
                    onClick={open ? closeChat : openChat}
                    aria-label={open ? t('chat.closeAria') : t('chat.launcherAria')}
                    aria-expanded={open}
                >
                    {open ? (
                        <FaTimes aria-hidden="true" />
                    ) : (
                        <>
                            <img className="lc-launcher__avatar" src={avatarSmall} alt="" />
                            <FaCommentDots className="lc-launcher__badge" aria-hidden="true" />
                        </>
                    )}
                </button>
            </div>
            {(open || hasOpened) && (
                <Suspense fallback={null}>
                    <ChatWindow open={open} onClose={closeChat} />
                </Suspense>
            )}
        </>
    );
}
