/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Player inventory management for block selection
 * @module player/Inventory
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import { getPlaceableBlocks } from '../blocks/BlockTypes.js';

/**
 * Inventory - Manages player's available materials and selected block
 * @class Inventory
 */
export class Inventory {
    constructor() {
        // Get all placeable blocks
        this.blocks = getPlaceableBlocks();

        // Currently selected slot (0-8)
        this.selectedSlot = 0;

        // Callbacks
        this.onSelectionChange = null;
    }

    /**
     * Get the currently selected block
     */
    getSelectedBlock() {
        if (this.selectedSlot >= 0 && this.selectedSlot < this.blocks.length) {
            return this.blocks[this.selectedSlot];
        }
        return null;
    }

    /**
     * Get all blocks in inventory
     */
    getBlocks() {
        return this.blocks;
    }

    /**
     * Select a slot by index
     */
    selectSlot(index) {
        if (index >= 0 && index < this.blocks.length) {
            this.selectedSlot = index;

            if (this.onSelectionChange) {
                this.onSelectionChange(this.selectedSlot);
            }
        }
    }

    /**
     * Select next slot (scroll down)
     */
    nextSlot() {
        this.selectedSlot = (this.selectedSlot + 1) % this.blocks.length;

        if (this.onSelectionChange) {
            this.onSelectionChange(this.selectedSlot);
        }
    }

    /**
     * Select previous slot (scroll up)
     */
    previousSlot() {
        this.selectedSlot = (this.selectedSlot - 1 + this.blocks.length) % this.blocks.length;

        if (this.onSelectionChange) {
            this.onSelectionChange(this.selectedSlot);
        }
    }

    /**
     * Get selected slot index
     */
    getSelectedSlot() {
        return this.selectedSlot;
    }

    /**
     * Set selection change callback
     */
    setSelectionCallback(callback) {
        this.onSelectionChange = callback;
    }
}
