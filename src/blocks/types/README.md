<!--
 
  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌   
  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
  
  LittleCUBES - https://github.com/paugm/LittleCubes
  
  Author: Pau Garcia-Mila <https://github.com/paugm>
  License: MIT

-->

# Block Types - Modular System

This directory contains individual block definitions for the game. Each block is defined in its own file, making it easy to add, modify, or remove blocks.

## Adding a New Block

To add a new block to the game, follow these steps:

### 1. Create a Block Definition File

Create a new `.js` file in this directory (e.g., `emerald.js`):

```javascript
/**
 * @fileoverview Emerald block definition
 * @module blocks/types/emerald
 */

export default {
    name: 'Emerald',
    color: '#50C878',
    solid: true,
    transparent: false,
    opacity: 1.0
};
```

### 2. Register the Block

Edit `index.js` in this directory:

```javascript
// Add import
import emeraldDef from './emerald.js';

// Register the block
const EMERALD = blockRegistry.register(emeraldDef);

// Add to BlockType export
export const BlockType = {
    AIR: 0,
    GRASS,
    DIRT,
    STONE,
    SAND,
    WOOD,
    WATER,
    BEDROCK,
    EMERALD  // Add your new block here
};
```

### 3. Done!

That's it! Your new block will now be available in the game. The build process will automatically bundle all blocks into the final distribution.

## Block Properties

Each block definition supports the following properties:

- **name** (required): Display name of the block
- **color** (required): Hex color code (e.g., '#7CB342')
- **solid** (optional, default: true): Whether the block is solid
- **transparent** (optional, default: false): Whether the block is transparent
- **opacity** (optional, default: 1.0): Opacity level (0.0 to 1.0)
- **unbreakable** (optional, default: false): Whether the block can be broken

## Examples

See existing block files in this directory:
- `grass.js` - Basic solid block
- `water.js` - Transparent, non-solid block
- `bedrock.js` - Unbreakable solid block



