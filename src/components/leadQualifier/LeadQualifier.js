import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './LeadQualifier.css';

const QualifierModal = lazy(() => import('./QualifierModal'));

const LAUNCHER_DELAY_MS = 3000;
const INTRO_DURATION_MS = 6000;
const NOTICE_DURATION_MS = 6000;
const INTRO_SEEN_KEY = 'shellty.qualifierIntroSeen';

function consumeFirstVisit() {
    try {
        if (localStorage.getItem(INTRO_SEEN_KEY)) return false;
        localStorage.setItem(INTRO_SEEN_KEY, '1');
        return true;
    } catch {
        return false;
    }
}

export default function LeadQualifier({ open, onOpen, onClose, onAskQuestion }) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [intro, setIntro] = useState(false);
    const [notice, setNotice] = useState('');
    const launcherRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(true);
            setIntro(consumeFirstVisit());
        }, LAUNCHER_DELAY_MS);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!intro) return undefined;
        const timer = setTimeout(() => setIntro(false), INTRO_DURATION_MS);
        return () => clearTimeout(timer);
    }, [intro]);

    useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(''), NOTICE_DURATION_MS);
        return () => clearTimeout(timer);
    }, [notice]);

    const openModal = () => {
        setIntro(false);
        setNotice('');
        onOpen();
    };

    const closeModal = useCallback(({ savedMidway }) => {
        onClose();
        setNotice(savedMidway ? t('qualifier.launcher.saved') : '');
        launcherRef.current?.focus();
    }, [onClose, t]);

    return (
        <>
            <div className="lq-launcher-wrap">
                <p className="lq-launcher__notice" role="status">{notice}</p>
                {visible && (
                    <button
                        ref={launcherRef}
                        type="button"
                        className={`lq-launcher${intro ? ' is-intro' : ''}`}
                        onClick={openModal}
                        aria-haspopup="dialog"
                    >
                        <svg
                            className="lq-launcher__icon"
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            width="1em"
                            height="1em"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <g stroke="#7cbcdf" strokeWidth="1.55">
                                <circle cx="5.5" cy="5.5" r="1.65" />
                                <circle cx="5.5" cy="18.5" r="1.65" />
                                <path d="M11 5.5h9M11 18.5h9" strokeWidth="1.65" />
                            </g>
                            <path d="m3.15 11.7 1.9 1.85 3.4-3.45M11 12h9.8" stroke="currentColor" strokeWidth="2.2" />
                        </svg>
                        <span className="lq-launcher__label">{t('qualifier.launcher.label')}</span>
                    </button>
                )}
            </div>
            {open && (
                <Suspense fallback={null}>
                    <QualifierModal onClose={closeModal} onAskQuestion={onAskQuestion} />
                </Suspense>
            )}
        </>
    );
}
