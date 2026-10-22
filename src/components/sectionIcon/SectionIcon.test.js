import React from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SectionIcon from './SectionIcon';

const props = {
    className: 'exp-icon',
    nodes: [{ id: 0, x: '20%', y: '10%' }],
    icon: 'base.webp',
    glow: 'glow.webp',
};
let observers;
const advance = (ms) => act(() => jest.advanceTimersByTime(ms));
const enterViewport = () => act(() => observers[0].callback([{ isIntersecting: true }]));

beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    observers = [];
    global.IntersectionObserver = jest.fn(function (callback) {
        this.callback = callback;
        this.observe = jest.fn();
        this.disconnect = jest.fn();
        observers.push(this);
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete global.IntersectionObserver;
});

test('preserves the reveal sequence, first pulse and recurring pulse timing', () => {
    const { container } = render(<SectionIcon {...props} />);
    const icon = container.firstChild;
    expect(icon).toHaveClass('exp-icon--hidden');
    enterViewport();
    expect(icon).toHaveClass('exp-icon--nodes');
    advance(999);
    expect(icon).toHaveClass('exp-icon--nodes');
    advance(1);
    expect(icon).toHaveClass('exp-icon--forming');
    advance(1199);
    expect(icon).toHaveClass('exp-icon--forming');
    advance(1);
    expect(icon).toHaveClass('exp-icon--visible');
    advance(599);
    expect(icon).not.toHaveClass('exp-icon--pulse');
    advance(1);
    expect(icon).toHaveClass('exp-icon--pulse');
    advance(1600);
    expect(icon).not.toHaveClass('exp-icon--pulse');
    advance(7799);
    expect(icon).not.toHaveClass('exp-icon--pulse');
    advance(1);
    expect(icon).toHaveClass('exp-icon--pulse');
    advance(1600);
    expect(icon).not.toHaveClass('exp-icon--pulse');
    advance(5400);
    expect(icon).toHaveClass('exp-icon--pulse');
});

test('keeps animation updates inside the icon and preserves its images and node positions', () => {
    const renderContent = jest.fn(() => <p>Section content</p>);
    function Section() {
        return <><SectionIcon {...props} size="200" />{renderContent()}</>;
    }
    const { container, rerender } = render(<Section />);
    enterViewport();
    advance(1000);
    advance(1200);
    expect(renderContent).toHaveBeenCalledTimes(1);
    const images = container.querySelectorAll('img');
    expect([...images].map(img => img.getAttribute('src'))).toEqual(['base.webp', 'glow.webp']);
    for (const img of images) {
        expect(img).toHaveAttribute('width', '200');
        expect(img).toHaveAttribute('height', '200');
        expect(img).toHaveAttribute('aria-hidden', 'true');
        expect(img).toHaveAttribute('draggable', 'false');
    }
    expect(container.querySelector('.exp-icon__node')).toHaveStyle({ left: '20%', top: '10%' });
    const count = observers.length;
    rerender(<Section />);
    expect(observers).toHaveLength(count);
    expect(container.firstChild).toHaveClass('exp-icon--visible');
});

test.each([0, 1000, 2200, 2800, 12200])('unmount at %i ms clears animation work', elapsed => {
    const { unmount } = render(<SectionIcon {...props} />);
    enterViewport();
    if (elapsed >= 1000) advance(1000);
    if (elapsed >= 2200) advance(1200);
    if (elapsed > 2200) advance(elapsed - 2200);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
    expect(observers.every(observer => observer.disconnect.mock.calls.length > 0)).toBe(true);
});
