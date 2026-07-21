// src/components/video/VideoModal.js
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import './VideoModal.css';

/**
 * Wspólny modal wideo (pionowy 9:16, wyśrodkowany na ciemnej nakładce).
 * Obsługuje focus trap, przywrócenie fokusa, Escape oraz stan ładowania.
 * Używany w Portfolio i w sekcji Usługi.
 */
const VideoModal = ({ isOpen, onClose, videoUrl, title, t }) => {
    const overlayRef = useRef(null);
    const closeBtnRef = useRef(null);
    const lastActiveRef = useRef(null);
    const [frameLoaded, setFrameLoaded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            lastActiveRef.current = document.activeElement;
            document.body.style.overflow = 'hidden';
            setFrameLoaded(false);
            const focusTimer = setTimeout(() => closeBtnRef.current?.focus(), 0);
            return () => {
                clearTimeout(focusTimer);
                document.body.style.overflow = '';
            };
        } else {
            document.body.style.overflow = '';
            if (lastActiveRef.current instanceof HTMLElement) {
                lastActiveRef.current.focus();
                lastActiveRef.current = null;
            }
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key !== 'Tab') return;

            const focusables = overlayRef.current?.querySelectorAll(
                'button, iframe, [href], [tabindex]:not([tabindex="-1"])'
            );
            if (!focusables?.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const embedUrl = videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/') + '?autoplay=1&title=0&byline=0&portrait=0';

    return createPortal(
        <div
            ref={overlayRef}
            className="video-modal-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <button
                ref={closeBtnRef}
                className="video-modal-close"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                aria-label={t('portfolio.videoModal.closeAria')}
                type="button"
            >
                <FaTimes />
            </button>
            <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
                {!frameLoaded && (
                    <div className="video-modal-loading" aria-hidden="true">
                        <div className="video-modal-loading__grid" />
                        <div className="video-modal-loading__scanline" />
                        <span className="video-modal-loading__label">
                            {t('portfolio.videoModal.loading')}
                        </span>
                    </div>
                )}
                <iframe
                    src={embedUrl}
                    title={title}
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setFrameLoaded(true)}
                />
            </div>
        </div>,
        document.body
    );
};

export default VideoModal;
