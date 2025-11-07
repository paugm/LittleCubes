/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Block type definitions and registration (re-exports from modular types)
 * @module blocks/BlockTypes
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 *
 * This module re-exports block types from the modular types system.
 * All block definitions are now in individual files under ./types/
 *
 * To add a new block:
 * 1. Create a new file in ./types/ (e.g., myblock.js)
 * 2. Export a default object with block properties (name, color, solid, etc.)
 * 3. Import and register it in ./types/index.js
 * 4. Add it to the BlockType export object
 */

export { BlockType, getPlaceableBlocks } from './types/index.js';
