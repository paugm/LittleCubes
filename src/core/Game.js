/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Main game controller that coordinates all game systems
 * @module core/Game
 * @requires three
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import { Renderer } from './Renderer.js';
import { InputManager } from './InputManager.js';
import { World } from '../world/World.js';
import { Player } from '../player/Player.js';
import { Inventory } from '../player/Inventory.js';
import { HUD } from '../ui/HUD.js';
import { TouchControls } from '../ui/TouchControls.js';
import { ImportExport } from '../utils/ImportExport.js';
import { PerformanceMonitor } from '../ui/PerformanceMonitor.js';
import { blockRegistry } from '../blocks/BlockRegistry.js';

/**
 * Game - Main game class that ties everything together
 *
 * This is the central coordinator that manages:
 * - Rendering pipeline
 * - Input handling
 * - World simulation
 * - Player controls
 * - UI systems
 * - Game loop
 * - Save/load functionality
 * - Mod extensibility through hooks
 *
 * @class Game
 */
export class Game {
    /**
     * Create a new Game instance
     * @param {HTMLCanvasElement} canvas - The canvas element to render to
     * @param {boolean} isTouchDevice - Whether this is a touch-enabled device
     * @param {Object|null} worldData - Optional saved world data to load
     */
    constructor(canvas, isTouchDevice = false, worldData = null) {
        this.canvas = canvas;
        this.isTouchDevice = isTouchDevice;

        // Track unsaved changes
        this.hasUnsavedChanges = false;

        // Core systems
        this.renderer = new Renderer(canvas);
        this.input = new InputManager(canvas);

        // World and player
        if (worldData) {
            this.world = World.deserialize(worldData.world);
            this.player = new Player(this.renderer.getCamera(), this.world, this.input);
            if (worldData.player) {
                this.player.deserialize(worldData.player);
            }
        } else {
            this.world = new World();
            this.player = new Player(this.renderer.getCamera(), this.world, this.input);
        }

        // UI
        this.inventory = new Inventory();
        this.hud = new HUD(this.inventory, this.player, isTouchDevice);

        // Performance monitor
        this.performanceMonitor = new PerformanceMonitor();

        // Touch controls
        if (isTouchDevice) {
            this.touchControls = new TouchControls(this.input, this);
            this.touchControls.show();
            // Connect touch controls to player
            this.player.setTouchControls(this.touchControls);
        } else {
            this.touchControls = null;
        }

        // Game state
        this.running = false;
        this.lastTime = 0;

        this.lastChunkUpdate = 0;
        this.chunkUpdateInterval = 1000 / 30; // 30 FPS for chunk updates

        // Event hooks (for mod API)
        this.hooks = {
            beforeBlockPlace: [],
            afterBlockPlace: [],
            beforeBlockBreak: [],
            afterBlockBreak: [],
            update: [],
            render: []
        };

        this.setupInputHandlers();

        // Initial chunk loading (without camera for first load)
        const playerPos = this.player.getPosition();
        this.world.updateChunks(playerPos.x, playerPos.y, playerPos.z, null);
    }

    /**
     * Setup input event handlers
     */
    setupInputHandlers() {
        // Mouse clicks for block interaction
        this.input.on('mousedown', (event) => {
            if (!this.input.isPointerLocked()) {
                return;
            }

            if (event.button === 0) {
                // Left click - break block
                this.breakBlock();
            } else if (event.button === 2) {
                // Right click - place block
                this.placeBlock();
            }
        });

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Number keys for inventory selection
        this.input.on('keydown', (event) => {
            const key = event.code;

            // Number keys 1-9
            if (key >= 'Digit1' && key <= 'Digit9') {
                const slot = parseInt(key.replace('Digit', '')) - 1;
                this.inventory.selectSlot(slot);
            }
        });

        // P key for performance monitor
        this.input.on('keydown', (event) => {
            if (event.code === 'KeyP') {
                this.performanceMonitor.toggle();
            }
        });

        // Mouse wheel for inventory slot cycling
        this.canvas.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.inventory.previousSlot();
                } else if (e.deltaY > 0) {
                    this.inventory.nextSlot();
                }
            },
            { passive: false }
        );
    }

    /**
     * Break block at player's target
     */
    breakBlock() {
        const targetBlock = this.player.getTargetBlock();

        if (!targetBlock) {
            return;
        }

        // Check if block is unbreakable (like bedrock)
        const blockId = this.world.getBlock(targetBlock.x, targetBlock.y, targetBlock.z);
        const blockDef = blockRegistry.getById(blockId);
        if (blockDef && blockDef.unbreakable) {
            return; // Cannot break unbreakable blocks
        }

        // Trigger before hook
        const hookData = { x: targetBlock.x, y: targetBlock.y, z: targetBlock.z, cancelled: false };
        this.triggerHook('beforeBlockBreak', hookData);

        if (hookData.cancelled) {
            return;
        }

        // Break the block
        this.world.setBlock(targetBlock.x, targetBlock.y, targetBlock.z, 0);
        this.hasUnsavedChanges = true;

        // Trigger after hook
        this.triggerHook('afterBlockBreak', {
            x: targetBlock.x,
            y: targetBlock.y,
            z: targetBlock.z
        });
    }

    /**
     * Place block at player's target
     */
    placeBlock() {
        const targetBlock = this.player.getTargetBlock();
        const targetFace = this.player.getTargetFace();

        if (!targetBlock || !targetFace) {
            return;
        }

        const selectedBlock = this.inventory.getSelectedBlock();
        if (!selectedBlock) {
            return;
        }

        // Calculate placement position (adjacent to target block)
        const placeX = targetBlock.x + targetFace.x;
        const placeY = targetBlock.y + targetFace.y;
        const placeZ = targetBlock.z + targetFace.z;

        // Check if there's an unbreakable block at the placement position
        const existingBlockId = this.world.getBlock(placeX, placeY, placeZ);
        const existingBlockDef = blockRegistry.getById(existingBlockId);
        if (existingBlockDef && existingBlockDef.unbreakable) {
            return; // Cannot replace unbreakable blocks
        }

        // Don't place block where player is standing
        const playerPos = this.player.getPosition();
        const playerBlockX = Math.floor(playerPos.x);
        const playerBlockY = Math.floor(playerPos.y);
        const playerBlockZ = Math.floor(playerPos.z);

        if (
            placeX === playerBlockX &&
            placeZ === playerBlockZ &&
            (placeY === playerBlockY || placeY === playerBlockY + 1)
        ) {
            return; // Would place inside player (check feet and head)
        }

        // Trigger before hook
        const hookData = {
            x: placeX,
            y: placeY,
            z: placeZ,
            blockId: selectedBlock.id,
            cancelled: false
        };
        this.triggerHook('beforeBlockPlace', hookData);

        if (hookData.cancelled) {
            return;
        }

        // Place the block
        this.world.setBlock(placeX, placeY, placeZ, selectedBlock.id);
        this.hasUnsavedChanges = true;

        // Trigger after hook
        this.triggerHook('afterBlockPlace', {
            x: placeX,
            y: placeY,
            z: placeZ,
            blockId: selectedBlock.id
        });
    }

    /**
     * Start the game loop
     */
    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
    }

    /**
     * Pause the game
     */
    pause() {
        this.running = false;
        // Exit pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    /**
     * Resume the game
     */
    resume() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
        // Request pointer lock
        this.input.requestPointerLock();
    }

    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.running) {
            return;
        }

        requestAnimationFrame(() => this.gameLoop());

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        // Cap delta time to prevent large jumps
        const cappedDeltaTime = Math.min(deltaTime, 0.1);

        this.update(cappedDeltaTime);
        this.render();
    }

    /**
     * Update game state
     */
    update(deltaTime) {
        // Handle touch controls
        if (this.touchControls) {
            const buttons = this.touchControls.getButtonStates();

            // Touch-based block interaction
            if (buttons.break) {
                this.breakBlock();
            }
            if (buttons.place) {
                this.placeBlock();
            }
        }

        this.player.update(deltaTime);

        // Throttled chunk updates (30 FPS instead of 60 FPS)
        const currentTime = performance.now();
        if (currentTime - this.lastChunkUpdate >= this.chunkUpdateInterval) {
            // Stream nearby chunks on a slower cadence to avoid large frame spikes
            const playerPos = this.player.getPosition();
            const camera = this.renderer.getCamera();
            this.world.updateChunks(playerPos.x, playerPos.y, playerPos.z, camera);
            this.lastChunkUpdate = currentTime;
        }

        this.hud.update(this.player, this.world);

        this.performanceMonitor.update(this.renderer, this.world);

        // Trigger update hooks
        this.triggerHook('update', { deltaTime, player: this.player, world: this.world });
    }

    /**
     * Render the game
     */
    render() {
        this.renderer.updateChunks(this.world);

        // Update 3D building cursor based on current action
        const targetBlock = this.player.getTargetBlock();
        const targetFace = this.player.getTargetFace();
        const showCursor = this.input.isPointerLocked();

        // Determine if we're in placement or removal mode
        // Right mouse button (2) is for placement, left button (0) or no button held shows removal highlight
        // The cursor visuals are updated here, while the actual block change happens in the input handlers
        const isPlacement = this.input.isMouseButtonPressed(2);

        this.renderer.updateBuildingCursor(targetBlock, targetFace, showCursor, isPlacement);

        // Render scene
        this.renderer.render();

        // Trigger render hooks
        this.triggerHook('render', { renderer: this.renderer });
    }

    /**
     * Export world to file
     */
    exportWorld() {
        ImportExport.downloadWorld(this.world, this.player);
        this.hasUnsavedChanges = false;
        this.hud.showMessage('World exported successfully!');
    }

    /**
     * Check if the game has unsaved changes
     */
    getHasUnsavedChanges() {
        return this.hasUnsavedChanges;
    }

    /**
     * Register a hook for mod extensibility
     */
    registerHook(event, callback) {
        if (this.hooks[event]) {
            this.hooks[event].push(callback);
        }
    }

    /**
     * Trigger a hook event
     */
    triggerHook(event, data) {
        if (this.hooks[event]) {
            for (const callback of this.hooks[event]) {
                callback(data);
            }
        }
    }

    /**
     * Cleanup
     */
    dispose() {
        this.stop();
        this.renderer.dispose();
        this.input.dispose();
        this.performanceMonitor.dispose();
    }
}
