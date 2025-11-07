/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Unified input handling system for all input types
 * @module core/InputManager
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

/**
 * InputManager - Unified input handling for keyboard, mouse, and touch
 *
 * This class provides:
 * - Keyboard input tracking
 * - Mouse movement and button tracking
 * - Pointer lock management with proper cursor handling
 * - Touch input support for mobile devices
 * - Fullscreen change detection
 * - Event-based system for extensibility
 *
 * @class InputManager
 */
export class InputManager {
    /**
     * Create a new InputManager instance
     * @param {HTMLCanvasElement} canvas - The canvas element to attach input listeners to
     */
    constructor(canvas) {
        this.canvas = canvas;

        // Key states
        this.keys = new Map();

        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            buttons: new Set(),
            locked: false
        };

        // Touch state
        this.touches = new Map();
        this.joystick = { x: 0, y: 0, active: false };

        // Event callbacks
        this.callbacks = {
            keydown: [],
            keyup: [],
            mousedown: [],
            mouseup: [],
            mousemove: [],
            pointerlock: [],
            touchstart: [],
            touchmove: [],
            touchend: []
        };

        this.setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('click', () => this.requestPointerLock());

        // Pointer lock events
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => this.onPointerLockError());

        // Fullscreen change event to handle cursor visibility
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());

        // Touch events (for mobile)
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    }

    /**
     * Keyboard events
     */
    onKeyDown(event) {
        this.keys.set(event.code, true);
        this.trigger('keydown', event);
    }

    onKeyUp(event) {
        this.keys.set(event.code, false);
        this.trigger('keyup', event);
    }

    /**
     * Mouse events
     */
    onMouseDown(event) {
        this.mouse.buttons.add(event.button);
        this.trigger('mousedown', event);
    }

    onMouseUp(event) {
        this.mouse.buttons.delete(event.button);
        this.trigger('mouseup', event);
    }

    onMouseMove(event) {
        if (this.mouse.locked) {
            this.mouse.deltaX = event.movementX || 0;
            this.mouse.deltaY = event.movementY || 0;
        }

        this.mouse.x = event.clientX;
        this.mouse.y = event.clientY;

        this.trigger('mousemove', event);
    }

    /**
     * Pointer lock
     */
    requestPointerLock() {
        this.canvas.requestPointerLock();
    }

    exitPointerLock() {
        document.exitPointerLock();
    }

    onPointerLockChange() {
        this.mouse.locked = document.pointerLockElement === this.canvas;

        if (this.mouse.locked) {
            this.canvas.classList.add('locked');
        } else {
            this.canvas.classList.remove('locked');
        }

        this.trigger('pointerlock', this.mouse.locked);
    }

    onPointerLockError() {
        console.error('Pointer lock failed');
    }

    /**
     * Handle fullscreen changes
     */
    onFullscreenChange() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

        if (!isFullscreen && !this.mouse.locked) {
            this.canvas.classList.remove('locked');
        }
    }

    /**
     * Touch events
     */
    onTouchStart(event) {
        event.preventDefault();

        for (const touch of event.changedTouches) {
            this.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY
            });
        }

        this.trigger('touchstart', event);
    }

    onTouchMove(event) {
        event.preventDefault();

        for (const touch of event.changedTouches) {
            if (this.touches.has(touch.identifier)) {
                const touchData = this.touches.get(touch.identifier);
                touchData.x = touch.clientX;
                touchData.y = touch.clientY;
            }
        }

        this.trigger('touchmove', event);
    }

    onTouchEnd(event) {
        event.preventDefault();

        for (const touch of event.changedTouches) {
            this.touches.delete(touch.identifier);
        }

        this.trigger('touchend', event);
    }

    /**
     * Check if a key is pressed
     */
    isKeyPressed(code) {
        return this.keys.get(code) || false;
    }

    /**
     * Check if a mouse button is pressed
     */
    isMouseButtonPressed(button) {
        return this.mouse.buttons.has(button);
    }

    /**
     * Get mouse delta (movement)
     */
    getMouseDelta() {
        return { x: this.mouse.deltaX, y: this.mouse.deltaY };
    }

    /**
     * Reset mouse delta (call after processing)
     */
    resetMouseDelta() {
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
    }

    /**
     * Check if pointer is locked
     */
    isPointerLocked() {
        return this.mouse.locked;
    }

    /**
     * Set joystick state (for touch controls)
     */
    setJoystick(x, y, active) {
        this.joystick.x = x;
        this.joystick.y = y;
        this.joystick.active = active;
    }

    /**
     * Get joystick state
     */
    getJoystick() {
        return this.joystick;
    }

    /**
     * Register event callback
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    /**
     * Trigger event callbacks
     */
    trigger(event, data) {
        if (this.callbacks[event]) {
            for (const callback of this.callbacks[event]) {
                callback(data);
            }
        }
    }

    /**
     * Cleanup all event listeners and resources
     */
    dispose() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('pointerlockerror', this.onPointerLockError);
        document.removeEventListener('fullscreenchange', this.onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    }
}
