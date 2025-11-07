/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Auto-loading block type system
 * @module blocks/types
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 *
 * This module automatically imports all block definitions from the types folder.
 * To add a new block, simply create a new .js file in this directory with a default export
 * containing the block definition. The block will be automatically registered on import.
 */

import { blockRegistry } from '../BlockRegistry.js';

// Import all block definitions
// The order of imports determines block IDs - maintain this order for save compatibility
import grassDef from './grass.js';
import dirtDef from './dirt.js';
import stoneDef from './stone.js';
import sandDef from './sand.js';
import woodDef from './wood.js';
import waterDef from './water.js';
import bedrockDef from './bedrock.js';

// Auto-register blocks in order
const GRASS = blockRegistry.register(grassDef);
const DIRT = blockRegistry.register(dirtDef);
const STONE = blockRegistry.register(stoneDef);
const SAND = blockRegistry.register(sandDef);
const WOOD = blockRegistry.register(woodDef);
const WATER = blockRegistry.register(waterDef);
const BEDROCK = blockRegistry.register(bedrockDef);

// Export block IDs for easy reference
export const BlockType = {
    AIR: 0,
    GRASS,
    DIRT,
    STONE,
    SAND,
    WOOD,
    WATER,
    BEDROCK
};

// Export helper function to get all placeable blocks for inventory
export function getPlaceableBlocks() {
    return blockRegistry.getSolid();
}
