import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook zarządzający animacją faz ikony nagłówka.
 *
 * Sekwencja faz:
 *   hidden → (IntersectionObserver) → nodes → (1000 ms) → forming → (1200 ms) → visible
 *
 * Po przejściu do "visible" ikona automatycznie pulsuje co ~7–9 s.
 *
 * Zastępuje ~80 linii identycznego kodu copy-paste obecnego w:
 *   About, Experience, Skills, Portfolio, Contact.
 *
 * @param {string} pulseClass  - klasa CSS dodawana podczas pulsu (np. "exp-icon--pulse")
 * @returns {{ iconRef: React.RefObject, iconPhase: string }}
 */
export function useIconPhase(pulseClass) {
    const [iconPhase, setIconPhase] = useState('hidden');
    const iconRef = useRef(null);
    const pulseTimer = useRef(null);

    // Krok 1: obserwuj widoczność → uruchom sekwencję
    useEffect(() => {
        const el = iconRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && iconPhase === 'hidden') {
                    setIconPhase('nodes');
                }
            },
            { threshold: 0.25 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [iconPhase]);

    // Krok 2: nodes → forming
    useEffect(() => {
        if (iconPhase !== 'nodes') return;
        const id = setTimeout(() => setIconPhase('forming'), 1000);
        return () => clearTimeout(id);
    }, [iconPhase]);

    // Krok 3: forming → visible
    useEffect(() => {
        if (iconPhase !== 'forming') return;
        const id = setTimeout(() => setIconPhase('visible'), 1200);
        return () => clearTimeout(id);
    }, [iconPhase]);

    // Krok 4: pierwszy puls po pojawieniu się
    useEffect(() => {
        if (iconPhase !== 'visible') return;

        const id = setTimeout(() => {
            iconRef.current?.classList.add(pulseClass);
            setTimeout(() => iconRef.current?.classList.remove(pulseClass), 1600);
        }, 600);

        return () => clearTimeout(id);
    }, [iconPhase, pulseClass]);

    // Krok 5: cykliczny puls co ~7–9 s
    useEffect(() => {
        if (iconPhase !== 'visible') return;

        const schedule = () => {
            const delay = 6000 + Math.random() * 2000;
            pulseTimer.current = setTimeout(() => {
                iconRef.current?.classList.add(pulseClass);
                setTimeout(() => iconRef.current?.classList.remove(pulseClass), 1600);
                schedule();
            }, delay);
        };

        const initial = setTimeout(schedule, 3000);

        return () => {
            clearTimeout(initial);
            clearTimeout(pulseTimer.current);
        };
    }, [iconPhase, pulseClass]);

    return { iconRef, iconPhase };
}
