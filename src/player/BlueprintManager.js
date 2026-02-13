/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Blueprint/template system for copying, pasting, and saving structures
 * @module player/BlueprintManager
 * @requires three
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import * as THREE from 'three';
import { BlockType } from '../blocks/BlockTypes.js';

const STORAGE_KEY = 'littlecubes_blueprints';

/**
 * Built-in template blueprints
 */
const BUILT_IN_TEMPLATES = [
    {
        name: 'Small House',
        width: 5,
        height: 4,
        depth: 5,
        blocks: (() => {
            const b = [];
            const WOOD = BlockType.WOOD;
            const STONE = BlockType.STONE;
            // Stone floor (y=0)
            for (let x = 0; x < 5; x++) {
                for (let z = 0; z < 5; z++) {
                    b.push({ x, y: 0, z, id: STONE });
                }
            }
            // Wood walls (y=1..3)
            for (let y = 1; y <= 3; y++) {
                for (let x = 0; x < 5; x++) {
                    for (let z = 0; z < 5; z++) {
                        const isEdge = x === 0 || x === 4 || z === 0 || z === 4;
                        // Door opening at front center (z=0, x=2, y=1..2)
                        const isDoor = z === 0 && x === 2 && y <= 2;
                        if (isEdge && !isDoor) {
                            b.push({ x, y, z, id: WOOD });
                        }
                    }
                }
            }
            return b;
        })()
    },
    {
        name: 'Tower',
        width: 3,
        height: 8,
        depth: 3,
        blocks: (() => {
            const b = [];
            const STONE = BlockType.STONE;
            // Stone pillar (y=0..6)
            for (let y = 0; y <= 6; y++) {
                for (let x = 0; x < 3; x++) {
                    for (let z = 0; z < 3; z++) {
                        const isEdge = x === 0 || x === 2 || z === 0 || z === 2;
                        if (isEdge) {
                            b.push({ x, y, z, id: STONE });
                        }
                    }
                }
            }
            // Top platform (y=7)
            for (let x = 0; x < 3; x++) {
                for (let z = 0; z < 3; z++) {
                    b.push({ x, y: 7, z, id: STONE });
                }
            }
            return b;
        })()
    },
    {
        name: 'Bridge',
        width: 1,
        height: 1,
        depth: 7,
        blocks: (() => {
            const b = [];
            const STONE = BlockType.STONE;
            const WOOD = BlockType.WOOD;
            // Stone walkway (x=0, y=0, z=0..6)
            for (let z = 0; z < 7; z++) {
                b.push({ x: 0, y: 0, z, id: STONE });
            }
            // Wood railings on sides (x=-1 and x=1, y=1, z=0..6)
            for (let z = 0; z < 7; z++) {
                b.push({ x: -1, y: 1, z, id: WOOD });
                b.push({ x: 1, y: 1, z, id: WOOD });
            }
            return b;
        })()
    }
];

/**
 * BlueprintManager - Manages blueprint selection, copying, pasting, and storage
 *
 * Workflow:
 * 1. Press B to enter blueprint mode
 * 2. Left-click to set corner 1, click again to set corner 2
 * 3. Press C to copy the selected region
 * 4. Press V to paste at the current target position
 * 5. Press Ctrl+B to save the current blueprint with a name
 * 6. Press Tab to open the blueprint browser menu
 *
 * @class BlueprintManager
 */
export class BlueprintManager {
    /**
     * Create a new BlueprintManager
     * @param {World} world - The world instance
     * @param {Object} renderer - The renderer (for wireframe visualization)
     */
    constructor(world, renderer) {
        this.world = world;
        this.renderer = renderer;

        // Blueprint mode state
        this.active = false;
        this.corner1 = null;
        this.corner2 = null;

        // Current clipboard blueprint
        this.clipboard = null;

        // Wireframe selection box
        this.selectionBox = null;
        this.selectionBoxMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        // Corner marker (small cube at corner 1)
        this.cornerMarker = null;
        this.cornerMarkerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.4
        });

        // Blueprint browser UI state
        this.menuOpen = false;
        this.menuElement = null;

        // Message callback (set by Game)
        this.onMessage = null;
    }

    /**
     * Toggle blueprint mode on/off
     */
    toggleMode() {
        this.active = !this.active;
        this.corner1 = null;
        this.corner2 = null;
        this.clearSelectionVisuals();

        if (this.active) {
            this.showMessage('Blueprint mode ON — click to set corners');
        } else {
            this.showMessage('Blueprint mode OFF');
        }
    }

    /**
     * Handle a click in blueprint mode (set corners)
     * @param {Object} targetBlock - The block being targeted {x, y, z}
     * @returns {boolean} True if the click was consumed by blueprint mode
     */
    handleClick(targetBlock) {
        if (!this.active || !targetBlock) {
            return false;
        }

        if (!this.corner1) {
            this.corner1 = { x: targetBlock.x, y: targetBlock.y, z: targetBlock.z };
            this.showCornerMarker(this.corner1);
            this.showMessage(`Corner 1 set (${this.corner1.x}, ${this.corner1.y}, ${this.corner1.z}) — click to set corner 2`);
            return true;
        }

        if (!this.corner2) {
            this.corner2 = { x: targetBlock.x, y: targetBlock.y, z: targetBlock.z };
            this.showSelectionBox();
            const size = this.getSelectionSize();
            this.showMessage(`Selection: ${size.w}×${size.h}×${size.d} — C to copy, B to cancel`);
            return true;
        }

        // Both corners set; clicking again resets
        this.corner1 = { x: targetBlock.x, y: targetBlock.y, z: targetBlock.z };
        this.corner2 = null;
        this.clearSelectionVisuals();
        this.showCornerMarker(this.corner1);
        this.showMessage(`Corner 1 reset (${this.corner1.x}, ${this.corner1.y}, ${this.corner1.z}) — click to set corner 2`);
        return true;
    }

    /**
     * Copy the selected region to the clipboard
     * @returns {boolean} True if copy succeeded
     */
    copy() {
        if (!this.corner1 || !this.corner2) {
            this.showMessage('Select two corners first (click in blueprint mode)');
            return false;
        }

        const minX = Math.min(this.corner1.x, this.corner2.x);
        const minY = Math.min(this.corner1.y, this.corner2.y);
        const minZ = Math.min(this.corner1.z, this.corner2.z);
        const maxX = Math.max(this.corner1.x, this.corner2.x);
        const maxY = Math.max(this.corner1.y, this.corner2.y);
        const maxZ = Math.max(this.corner1.z, this.corner2.z);

        const blocks = [];
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const id = this.world.getBlock(x, y, z);
                    if (id !== 0) {
                        blocks.push({ x: x - minX, y: y - minY, z: z - minZ, id });
                    }
                }
            }
        }

        this.clipboard = {
            name: 'Clipboard',
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            depth: maxZ - minZ + 1,
            blocks
        };

        this.showMessage(`Copied ${blocks.length} blocks (${this.clipboard.width}×${this.clipboard.height}×${this.clipboard.depth})`);
        return true;
    }

    /**
     * Paste the clipboard blueprint at the given world position
     * @param {Object} targetBlock - Where to paste {x, y, z}
     * @param {Object} targetFace - Face normal of the target
     * @returns {boolean} True if paste succeeded
     */
    paste(targetBlock, targetFace) {
        if (!this.clipboard) {
            this.showMessage('Nothing to paste — copy a selection first (C)');
            return false;
        }

        if (!targetBlock || !targetFace) {
            this.showMessage('Aim at a block to paste');
            return false;
        }

        // Paste origin is adjacent to the targeted face
        const originX = targetBlock.x + targetFace.x;
        const originY = targetBlock.y + targetFace.y;
        const originZ = targetBlock.z + targetFace.z;

        let placed = 0;
        for (const block of this.clipboard.blocks) {
            this.world.setBlock(originX + block.x, originY + block.y, originZ + block.z, block.id);
            placed++;
        }

        this.showMessage(`Pasted "${this.clipboard.name}" (${placed} blocks)`);
        return true;
    }

    /**
     * Save the current clipboard to localStorage
     */
    saveBlueprint() {
        if (!this.clipboard) {
            this.showMessage('Nothing to save — copy a selection first (C)');
            return;
        }

        const name = prompt('Blueprint name:');
        if (!name || name.trim().length === 0) {
            return;
        }

        const blueprints = this.loadSavedBlueprints();
        const bp = { ...this.clipboard, name: name.trim() };
        blueprints.push(bp);
        this.storeSavedBlueprints(blueprints);

        this.showMessage(`Blueprint "${bp.name}" saved!`);
    }

    /**
     * Load saved blueprints from localStorage
     * @returns {Array} Array of blueprint objects
     */
    loadSavedBlueprints() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Store blueprints to localStorage
     * @param {Array} blueprints - Array of blueprint objects
     */
    storeSavedBlueprints(blueprints) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(blueprints));
    }

    /**
     * Get all available blueprints (built-in + saved)
     * @returns {Array} Array of { name, blueprint, builtIn }
     */
    getAllBlueprints() {
        const results = [];
        for (const bp of BUILT_IN_TEMPLATES) {
            results.push({ name: bp.name, blueprint: bp, builtIn: true });
        }
        for (const bp of this.loadSavedBlueprints()) {
            results.push({ name: bp.name, blueprint: bp, builtIn: false });
        }
        return results;
    }

    /**
     * Toggle the blueprint browser menu
     */
    toggleMenu() {
        if (this.menuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    /**
     * Open the blueprint browser menu
     */
    openMenu() {
        this.closeMenu(); // Clean up any existing menu

        const all = this.getAllBlueprints();

        const overlay = document.createElement('div');
        overlay.id = 'blueprint-menu';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;';

        const panel = document.createElement('div');
        panel.style.cssText = 'background:#1a1a2e;border:2px solid #00ff00;border-radius:8px;padding:20px;max-width:400px;width:90%;max-height:70vh;overflow-y:auto;color:#fff;font-family:monospace;';

        const title = document.createElement('h2');
        title.textContent = '📋 Blueprints';
        title.style.cssText = 'margin:0 0 15px 0;color:#00ff00;font-size:18px;text-align:center;';
        panel.appendChild(title);

        if (all.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = 'No blueprints yet. Copy a selection (C) and save it (Ctrl+B).';
            empty.style.cssText = 'color:#888;text-align:center;';
            panel.appendChild(empty);
        } else {
            for (const entry of all) {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 10px;margin:4px 0;background:#16213e;border-radius:4px;cursor:pointer;';

                const label = document.createElement('span');
                const tag = entry.builtIn ? ' ⭐' : '';
                const bp = entry.blueprint;
                label.textContent = `${entry.name}${tag}  (${bp.width}×${bp.height}×${bp.depth})`;
                label.style.cssText = 'font-size:14px;';
                row.appendChild(label);

                const actions = document.createElement('span');

                const loadBtn = document.createElement('button');
                loadBtn.textContent = 'Load';
                loadBtn.style.cssText = 'background:#00ff00;color:#000;border:none;padding:4px 10px;border-radius:3px;cursor:pointer;font-family:monospace;font-size:12px;margin-left:6px;';
                loadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.clipboard = { ...bp };
                    this.showMessage(`Loaded "${entry.name}" — press V to paste`);
                    this.closeMenu();
                });
                actions.appendChild(loadBtn);

                if (!entry.builtIn) {
                    const delBtn = document.createElement('button');
                    delBtn.textContent = '✕';
                    delBtn.style.cssText = 'background:#ff4444;color:#fff;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-family:monospace;font-size:12px;margin-left:4px;';
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteBlueprint(entry.name);
                        this.closeMenu();
                        this.openMenu(); // Refresh
                    });
                    actions.appendChild(delBtn);
                }

                row.appendChild(actions);
                panel.appendChild(row);
            }
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close (Tab)';
        closeBtn.style.cssText = 'display:block;margin:15px auto 0;background:#333;color:#fff;border:1px solid #555;padding:6px 20px;border-radius:4px;cursor:pointer;font-family:monospace;font-size:13px;';
        closeBtn.addEventListener('click', () => this.closeMenu());
        panel.appendChild(closeBtn);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // Close on overlay click (but not panel click)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeMenu();
            }
        });

        this.menuElement = overlay;
        this.menuOpen = true;
    }

    /**
     * Close the blueprint browser menu
     */
    closeMenu() {
        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
        }
        this.menuOpen = false;
    }

    /**
     * Delete a saved blueprint by name
     * @param {string} name - Blueprint name to delete
     */
    deleteBlueprint(name) {
        const blueprints = this.loadSavedBlueprints().filter((bp) => bp.name !== name);
        this.storeSavedBlueprints(blueprints);
        this.showMessage(`Deleted blueprint "${name}"`);
    }

    /**
     * Get selection size from the two corners
     * @returns {Object} { w, h, d }
     */
    getSelectionSize() {
        if (!this.corner1 || !this.corner2) {
            return { w: 0, h: 0, d: 0 };
        }
        return {
            w: Math.abs(this.corner2.x - this.corner1.x) + 1,
            h: Math.abs(this.corner2.y - this.corner1.y) + 1,
            d: Math.abs(this.corner2.z - this.corner1.z) + 1
        };
    }

    /**
     * Show a wireframe box around the selection
     */
    showSelectionBox() {
        this.clearSelectionVisuals();

        if (!this.corner1 || !this.corner2) {
            return;
        }

        const minX = Math.min(this.corner1.x, this.corner2.x);
        const minY = Math.min(this.corner1.y, this.corner2.y);
        const minZ = Math.min(this.corner1.z, this.corner2.z);
        const maxX = Math.max(this.corner1.x, this.corner2.x) + 1;
        const maxY = Math.max(this.corner1.y, this.corner2.y) + 1;
        const maxZ = Math.max(this.corner1.z, this.corner2.z) + 1;

        const w = maxX - minX;
        const h = maxY - minY;
        const d = maxZ - minZ;

        const geometry = new THREE.BoxGeometry(w, h, d);
        const edges = new THREE.EdgesGeometry(geometry);
        this.selectionBox = new THREE.LineSegments(edges, this.selectionBoxMaterial);
        this.selectionBox.position.set(minX + w / 2, minY + h / 2, minZ + d / 2);

        this.renderer.getScene().add(this.selectionBox);
    }

    /**
     * Show a small marker at a corner position
     * @param {Object} pos - {x, y, z}
     */
    showCornerMarker(pos) {
        this.clearSelectionVisuals();

        const geometry = new THREE.BoxGeometry(1.04, 1.04, 1.04);
        this.cornerMarker = new THREE.Mesh(geometry, this.cornerMarkerMaterial);
        this.cornerMarker.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
        this.renderer.getScene().add(this.cornerMarker);
    }

    /**
     * Clear all selection visual helpers from the scene
     */
    clearSelectionVisuals() {
        const scene = this.renderer.getScene();

        if (this.selectionBox) {
            scene.remove(this.selectionBox);
            if (this.selectionBox.geometry) {
                this.selectionBox.geometry.dispose();
            }
            this.selectionBox = null;
        }

        if (this.cornerMarker) {
            scene.remove(this.cornerMarker);
            if (this.cornerMarker.geometry) {
                this.cornerMarker.geometry.dispose();
            }
            this.cornerMarker = null;
        }
    }

    /**
     * Check if the blueprint menu is currently open
     * @returns {boolean}
     */
    isMenuOpen() {
        return this.menuOpen;
    }

    /**
     * Check if blueprint mode is active
     * @returns {boolean}
     */
    isActive() {
        return this.active;
    }

    /**
     * Show a HUD message
     * @param {string} msg - Message text
     */
    showMessage(msg) {
        if (this.onMessage) {
            this.onMessage(msg);
        }
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.clearSelectionVisuals();
        this.closeMenu();
        this.selectionBoxMaterial.dispose();
        this.cornerMarkerMaterial.dispose();
    }
}
