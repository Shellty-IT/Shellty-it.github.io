import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import CustomCursor from './CustomCursor';

let frames;
let frameId;

beforeEach(() => {
    frames = new Map();
    frameId = 0;
    window.matchMedia = jest.fn(query => ({
        matches: !query.includes('reduced-motion'),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }));
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
        frames.set(++frameId, callback);
        return frameId;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});

afterEach(() => jest.restoreAllMocks());

function move(target, x, y, pointerType = 'mouse') {
    const event = new Event('pointermove', { bubbles: true });
    Object.assign(event, { clientX: x, clientY: y, pointerType });
    fireEvent(target, event);
}

function nextFrame(time) {
    const pending = [...frames.values()];
    frames.clear();
    act(() => pending.forEach(callback => callback(time)));
}

test('the tip follows input immediately while the ring and trail catch up', () => {
    const { container } = render(<CustomCursor />);
    move(document.body, 20, 30);
    move(document.body, 200, 150);
    expect(container.querySelector('.cursor-dot').style.transform).toBe('translate3d(200px,150px,0)');
    expect(container.querySelector('.cursor-ring').style.transform).toBe('translate3d(20px,30px,0)');
    expect(frames.size).toBe(1);

    nextFrame(16);
    expect(container.querySelector('.cursor-ring').style.transform).not.toBe('translate3d(20px,30px,0)');
    for (let i = 2; i < 240 && frames.size; i++) nextFrame(i * (1000 / 60));
    expect(frames.size).toBe(0);
});

test('hover changes on target entry without creating a timer for every movement', () => {
    const { container, getByRole } = render(<><button>Services</button><CustomCursor /></>);
    const timer = jest.spyOn(window, 'setTimeout');
    move(getByRole('button'), 10, 20);
    expect(container.querySelector('.cursor-ring').classList.contains('hovering')).toBe(true);
    for (let i = 0; i < 20; i++) move(getByRole('button'), 10 + i, 20);
    expect(timer).not.toHaveBeenCalled();
    fireEvent.pointerOver(document.body);
    expect(container.querySelector('.cursor-ring').classList.contains('hovering')).toBe(false);
});

test('leaving and returning clears hover and restarts at the current pointer position', () => {
    const { container, getByRole } = render(<><button>Services</button><CustomCursor /></>);
    move(getByRole('button'), 20, 30);
    fireEvent.pointerLeave(document.documentElement);
    expect(frames.size).toBe(0);
    expect(container.querySelector('.cursor-dot').style.opacity).toBe('0');
    expect(container.querySelector('.cursor-ring').classList.contains('hovering')).toBe(false);
    move(document.body, 400, 300);
    expect(container.querySelector('.cursor-dot').style.opacity).toBe('1');
    expect(container.querySelector('.cursor-ring').style.transform).toBe('translate3d(400px,300px,0)');
});

test('touch input does not show the desktop cursor', () => {
    const { container } = render(<CustomCursor />);
    move(document.body, 50, 60, 'touch');
    expect(container.querySelector('.cursor-dot').style.opacity).not.toBe('1');
    expect(frames.size).toBe(0);
});

test('unmount cancels pending frames and removes pointer listeners', () => {
    const { unmount } = render(<CustomCursor />);
    move(document.body, 20, 30);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    move(document.body, 100, 200);
    expect(frames.size).toBe(0);
    expect(document.documentElement.classList.contains('has-custom-cursor')).toBe(false);
});
