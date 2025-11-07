/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Touch controls implementation for mobile gameplay
 * @module ui/TouchControls
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

/**
 * TouchControls - Dual-circle controls for mobile devices
 * @class TouchControls
 */
export class TouchControls {
    constructor(inputManager, game) {
        this.input = inputManager;
        this.game = game;

        // Create DOM elements dynamically
        this.createControlElements();

        // Movement joystick state (left circle)
        this.movementActive = false;
        this.movementTouchId = null;
        this.movementCenterX = 0;
        this.movementCenterY = 0;

        // Look joystick state (right circle)
        this.lookActive = false;
        this.lookTouchId = null;
        this.lookLastX = 0;
        this.lookLastY = 0;
        this.lookSensitivity = 0.01;

        // Block interaction state
        this.interactionTouchId = null;
        this.interactionStartTime = 0;
        this.interactionTimer = null;
        this.longPressThreshold = 500; // ms for long press
        this.hasInteracted = false;

        // Jump state
        this.jumpActive = false;

        this.setupEventListeners();
    }

    /**
     * Create control elements dynamically
     */
    createControlElements() {
        // Main container
        this.container = document.getElementById('touch-controls');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'touch-controls';
            this.container.className = 'hidden';
            document.getElementById('game-container').appendChild(this.container);
        }

        // Prevent any default touch behaviors on the container
        this.container.style.touchAction = 'none';
        this.container.style.webkitTouchCallout = 'none';
        this.container.style.setProperty('-webkit-user-select', 'none');
        this.container.style.userSelect = 'none';

        // Clear existing content
        this.container.innerHTML = '';

        // Left control circle (movement)
        this.movementCircle = document.createElement('div');
        this.movementCircle.id = 'movement-circle';
        this.movementCircle.className = 'touch-circle left';
        this.movementCircle.innerHTML = `
            <div class="circle-inner">
                <div class="joystick-knob" id="movement-knob"></div>
            </div>
        `;
        this.container.appendChild(this.movementCircle);
        this.movementKnob = document.getElementById('movement-knob');

        // Right control circle (look)
        this.lookCircle = document.createElement('div');
        this.lookCircle.id = 'look-circle';
        this.lookCircle.className = 'touch-circle right';
        this.lookCircle.innerHTML = `
            <div class="circle-inner">
                <div class="joystick-knob" id="look-knob"></div>
            </div>
        `;
        this.container.appendChild(this.lookCircle);
        this.lookKnob = document.getElementById('look-knob');

        // Jump button (center bottom)
        this.jumpButton = document.createElement('div');
        this.jumpButton.id = 'jump-button';
        this.jumpButton.className = 'touch-jump-button';
        this.jumpButton.innerHTML = '<span>⇧</span>';
        this.container.appendChild(this.jumpButton);
    }

    /**
     * Show touch controls
     */
    show() {
        this.container.classList.remove('hidden');
    }

    /**
     * Hide touch controls
     */
    hide() {
        this.container.classList.add('hidden');
    }

    /**
     * Setup event listeners for touch controls
     */
    setupEventListeners() {
        // Movement circle (left)
        this.movementCircle.addEventListener(
            'touchstart',
            (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Skip if we already have an active movement touch
                if (this.movementTouchId !== null) {
                    return;
                }

                // Only handle the first changed touch
                const touch = e.changedTouches[0];
                if (touch) {
                    this.movementTouchId = touch.identifier;
                    this.movementActive = true;

                    const rect = this.movementCircle.getBoundingClientRect();
                    this.movementCenterX = rect.left + rect.width / 2;
                    this.movementCenterY = rect.top + rect.height / 2;

                    this.updateMovement(touch.clientX, touch.clientY);
                }
            },
            { passive: false }
        );

        // Look circle (right)
        this.lookCircle.addEventListener(
            'touchstart',
            (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Skip if we already have an active look touch
                if (this.lookTouchId !== null) {
                    return;
                }

                // Only handle the first changed touch
                const touch = e.changedTouches[0];
                if (touch) {
                    this.lookTouchId = touch.identifier;
                    this.lookActive = true;
                    this.lookLastX = touch.clientX;
                    this.lookLastY = touch.clientY;

                    // Reset knob position
                    this.lookKnob.style.transform = 'translate(-50%, -50%)';
                }
            },
            { passive: false }
        );

        // Jump button
        this.jumpButton.addEventListener(
            'touchstart',
            (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.jumpActive = true;
            },
            { passive: false }
        );

        this.jumpButton.addEventListener(
            'touchend',
            (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.jumpActive = false;
            },
            { passive: false }
        );

        this.jumpButton.addEventListener(
            'touchcancel',
            (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.jumpActive = false;
            },
            { passive: false }
        );

        // Document-level touch move
        document.addEventListener(
            'touchmove',
            (e) => {
                let handled = false;
                for (const touch of e.touches) {
                    if (touch.identifier === this.movementTouchId) {
                        e.preventDefault();
                        this.updateMovement(touch.clientX, touch.clientY);
                        handled = true;
                    } else if (touch.identifier === this.lookTouchId) {
                        e.preventDefault();
                        this.updateLook(touch.clientX, touch.clientY);
                        handled = true;
                    }
                }
                // Prevent default scrolling if we handled a touch
                if (handled) {
                    e.preventDefault();
                }
            },
            { passive: false }
        );

        // Document-level touch end
        document.addEventListener(
            'touchend',
            (e) => {
                for (const touch of e.changedTouches) {
                    if (touch.identifier === this.movementTouchId) {
                        this.movementActive = false;
                        this.movementTouchId = null;
                        this.movementKnob.style.transform = 'translate(-50%, -50%)';
                        this.input.setJoystick(0, 0, false);
                    } else if (touch.identifier === this.lookTouchId) {
                        this.lookActive = false;
                        this.lookTouchId = null;
                        this.lookKnob.style.transform = 'translate(-50%, -50%)';
                    } else if (touch.identifier === this.interactionTouchId) {
                        this.handleInteractionEnd();
                    }
                }
            },
            { passive: false }
        );

        // Canvas touch for block interactions
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener(
            'touchstart',
            (e) => {
                // Only check new touches, not all active touches
                for (const touch of e.changedTouches) {
                    // Skip if this touch is on a control element
                    if (!this.isControlTouch(touch)) {
                        // Also skip if we already have active control touches
                        if (
                            this.movementTouchId === null &&
                            this.lookTouchId === null &&
                            this.interactionTouchId === null
                        ) {
                            this.handleInteractionStart(touch);
                            e.preventDefault();
                            break;
                        }
                    }
                }
            },
            { passive: false }
        );
    }

    /**
     * Check if touch is on a control element
     */
    isControlTouch(touch) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        // Check if the touch is on any control element or UI element
        return (
            this.container.contains(element) ||
            element?.closest('#info-panel, #hotbar, #menu-button, #pause-menu') ||
            element?.id === 'touch-controls'
        );
    }

    /**
     * Handle interaction start (tap/hold for break/place)
     */
    handleInteractionStart(touch) {
        this.interactionTouchId = touch.identifier;
        this.interactionStartTime = Date.now();
        this.hasInteracted = false;

        // Set a timer for long press (place block)
        this.interactionTimer = setTimeout(() => {
            if (!this.hasInteracted && this.game) {
                // Long press - place block
                this.game.placeBlock();
                this.hasInteracted = true;

                // Visual feedback
                this.showInteractionFeedback('place');
            }
        }, this.longPressThreshold);
    }

    /**
     * Handle interaction end
     */
    handleInteractionEnd() {
        if (this.interactionTimer) {
            clearTimeout(this.interactionTimer);
            this.interactionTimer = null;
        }

        const pressDuration = Date.now() - this.interactionStartTime;

        // Short tap - break block
        if (pressDuration < this.longPressThreshold && !this.hasInteracted && this.game) {
            this.game.breakBlock();
            this.showInteractionFeedback('break');
        }

        this.interactionTouchId = null;
        this.hasInteracted = false;
    }

    /**
     * Show visual feedback for interactions
     */
    showInteractionFeedback(type) {
        // Add a temporary visual indicator
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            crosshair.classList.add(`feedback-${type}`);
            setTimeout(() => {
                crosshair.classList.remove(`feedback-${type}`);
            }, 200);
        }
    }

    /**
     * Update movement joystick
     */
    updateMovement(clientX, clientY) {
        const deltaX = clientX - this.movementCenterX;
        const deltaY = clientY - this.movementCenterY;

        const maxDistance = 50; // Max pixels from center
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        let x = deltaX;
        let y = deltaY;

        if (distance > maxDistance) {
            x = (deltaX / distance) * maxDistance;
            y = (deltaY / distance) * maxDistance;
        }

        // Update visual position
        this.movementKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

        // Normalize to -1 to 1 range
        const normalizedX = x / maxDistance;
        const normalizedY = -y / maxDistance; // Invert Y for forward/backward

        // Update input manager
        this.input.setJoystick(normalizedX, normalizedY, true);
    }

    /**
     * Update look/camera rotation
     */
    updateLook(clientX, clientY) {
        const deltaX = clientX - this.lookLastX;
        const deltaY = clientY - this.lookLastY;

        // Visual feedback - move knob slightly
        const maxVisualDistance = 30;
        const visualX = Math.max(-maxVisualDistance, Math.min(maxVisualDistance, deltaX * 0.5));
        const visualY = Math.max(-maxVisualDistance, Math.min(maxVisualDistance, deltaY * 0.5));
        this.lookKnob.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;

        // Update camera rotation through mouse delta
        this.input.mouse.deltaX = -deltaX * this.lookSensitivity * 100;
        this.input.mouse.deltaY = -deltaY * this.lookSensitivity * 100;
        this.input.mouse.locked = true; // Temporarily set locked to enable rotation

        this.lookLastX = clientX;
        this.lookLastY = clientY;
    }

    /**
     * Get button states
     */
    getButtonStates() {
        return {
            jump: this.jumpActive,
            break: false, // Handled by touch interaction
            place: false // Handled by touch interaction
        };
    }

    /**
     * Set game reference
     */
    setGame(game) {
        this.game = game;
    }
}
