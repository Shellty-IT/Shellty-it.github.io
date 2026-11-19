import React, { useCallback, useState } from 'react';
import { trackEvent } from '../../leads/funnelEvents';
import { updateLeadSession } from '../../leads/leadSession';
import LeadQualifier from '../leadQualifier';
import LeadChat from '../leadChat/LeadChat';

export default function LeadFunnel() {
    const [active, setActive] = useState(null);

    const openModule = useCallback((module) => {
        updateLeadSession({ engaged: true });
        trackEvent(`${module}_open`);
        setActive(module);
    }, []);

    const openQualifier = useCallback(() => openModule('qualifier'), [openModule]);
    const openChat = useCallback(() => openModule('chat'), [openModule]);
    const close = useCallback(() => setActive(null), []);

    return (
        <>
            <LeadQualifier
                open={active === 'qualifier'}
                onOpen={openQualifier}
                onClose={close}
                onAskQuestion={openChat}
            />
            <LeadChat
                open={active === 'chat'}
                onOpen={openChat}
                onClose={close}
                onOpenQualifier={openQualifier}
            />
        </>
    );
}
