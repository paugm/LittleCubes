/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Central registry system for block type management
 * @module blocks/BlockRegistry
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

/**
 * BlockRegistry - Central registry for all block types
 * @class BlockRegistry
 */
class BlockRegistry {
    constructor() {
        this.blocks = new Map();
        this.blocksByName = new Map();
        this.nextId = 1; // 0 is reserved for air/empty
    }

    /**
     * Register a new block type
     * @param {Object} blockDef - Block definition with name, color, properties
     * @returns {number} The assigned block ID
     */
    register(blockDef) {
        const {
            name,
            color,
            solid = true,
            transparent = false,
            opacity = 1.0,
            unbreakable = false
        } = blockDef;

        if (!name || !color) {
            throw new Error('Block must have a name and color');
        }

        if (this.blocksByName.has(name)) {
            console.warn(`Block "${name}" is already registered. Skipping.`);
            return this.blocksByName.get(name).id;
        }

        const id = this.nextId++;
        const block = {
            id,
            name,
            color,
            solid,
            transparent,
            opacity,
            unbreakable
        };

        this.blocks.set(id, block);
        this.blocksByName.set(name, block);

        return id;
    }

    /**
     * Get block definition by ID
     * @param {number} id - Block ID
     * @returns {Object|null} Block definition or null if not found
     */
    getById(id) {
        return this.blocks.get(id) || null;
    }

    /**
     * Get block definition by name
     * @param {string} name - Block name
     * @returns {Object|null} Block definition or null if not found
     */
    getByName(name) {
        return this.blocksByName.get(name) || null;
    }

    /**
     * Get all registered blocks
     * @returns {Array} Array of all block definitions
     */
    getAll() {
        return Array.from(this.blocks.values());
    }

    /**
     * Get all solid (placeable) blocks
     * @returns {Array} Array of solid block definitions
     */
    getSolid() {
        return Array.from(this.blocks.values()).filter(
            (block) => block.solid && !block.unbreakable
        );
    }

    /**
     * Check if a block ID exists
     * @param {number} id - Block ID
     * @returns {boolean}
     */
    exists(id) {
        return this.blocks.has(id);
    }

    /**
     * Unregister a block (for mod support)
     * @param {number|string} idOrName - Block ID or name
     * @returns {boolean} True if block was removed
     */
    unregister(idOrName) {
        let block;

        if (typeof idOrName === 'number') {
            block = this.blocks.get(idOrName);
            if (block) {
                this.blocks.delete(idOrName);
                this.blocksByName.delete(block.name);
                return true;
            }
        } else {
            block = this.blocksByName.get(idOrName);
            if (block) {
                this.blocks.delete(block.id);
                this.blocksByName.delete(idOrName);
                return true;
            }
        }

        return false;
    }
}

// Create singleton instance
const blockRegistry = new BlockRegistry();

export { blockRegistry, BlockRegistry };
