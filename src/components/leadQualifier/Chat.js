import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

export function scrollToTurn(container, turn, offset, behavior) {
    if (!container || !turn) return;
    container.scrollTo?.({ top: Math.max(0, turn.offsetTop - offset), behavior });
}

export const BotTurn = forwardRef(function BotTurn({ messages, focusable, ask, children }, ref) {
    const visible = messages.filter(Boolean);
    const lastIndex = visible.length - 1;
    return (
        <div className="lq-bot">
            <div className="lq-bot__content">
                {visible.map((message, index) => {
                    const isFocusTarget = focusable && index === lastIndex;
                    return (
                        <p
                            key={message}
                            ref={isFocusTarget ? ref : undefined}
                            tabIndex={isFocusTarget ? -1 : undefined}
                            className={`lq-bubble${ask && index === lastIndex ? ' lq-bubble--ask' : ''}`}
                        >
                            {message}
                        </p>
                    );
                })}
                {children}
            </div>
        </div>
    );
});

export function UserMessage({ children }) {
    const { t } = useTranslation();
    return (
        <div className="lq-user">
            <p className="lq-bubble lq-bubble--user">
                <span className="lq-visually-hidden">{t('qualifier.chat.you')}: </span>
                {children}
            </p>
        </div>
    );
}

export function TypingIndicator() {
    const { t } = useTranslation();
    return (
        <div className="lq-bot">
            <div className="lq-bot__content">
                <p className="lq-bubble lq-typing" role="status">
                    <span className="lq-visually-hidden">{t('qualifier.chat.typing')}</span>
                    <span className="lq-typing__dot" aria-hidden="true" />
                    <span className="lq-typing__dot" aria-hidden="true" />
                    <span className="lq-typing__dot" aria-hidden="true" />
                </p>
            </div>
        </div>
    );
}
