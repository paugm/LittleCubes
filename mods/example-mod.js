/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Example Mod for LittleCUBES - demonstrates how to extend the game
 * @module mods/example-mod
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 *
 * This demonstrates how to extend the game with custom blocks and behaviors.
 * To use this mod, import it in main.js and call initExampleMod(game) after creating the game.
 */

import { blockRegistry } from '../src/blocks/BlockRegistry.js';

/**
 * Initialize the example mod
 * @param {Game} game - The game instance
 */
export function initExampleMod(game) {
    console.log('🎮 Loading Example Mod...');

    // Gold and Glass are now built-in block types (IDs 14 and 9).
    // Look them up from the registry instead of re-registering.
    const goldBlock = blockRegistry.getByName('Gold');
    const glassBlock = blockRegistry.getByName('Glass');

    console.log(`✅ Using built-in blocks: Gold (ID ${goldBlock.id}), Glass (ID ${glassBlock.id})`);

    // 1. Register a truly custom block (example of extending beyond built-ins)
    const RUBY = blockRegistry.register({
        name: 'Ruby',
        color: '#E91E63',
        solid: true,
        transparent: false,
        opacity: 1.0
    });

    console.log(`✅ Registered custom block: Ruby (ID ${RUBY})`);

    // 2. Add event hook - log when blocks are placed
    game.registerHook('afterBlockPlace', (data) => {
        const block = blockRegistry.getById(data.blockId);
        console.log(`📦 Placed ${block.name} at (${data.x}, ${data.y}, ${data.z})`);
    });

    // 3. Add event hook - prevent breaking gold blocks (make them indestructible)
    game.registerHook('beforeBlockBreak', (data) => {
        const blockId = game.world.getBlock(data.x, data.y, data.z);
        const block = blockRegistry.getById(blockId);

        if (block && block.name === 'Gold') {
            console.log('❌ Gold blocks are indestructible!');
            data.cancelled = true; // Cancel the break action
        }
    });

    // 4. Add update hook - could add custom game logic here
    game.registerHook('update', (_data) => {
        // Example: You could add custom animations, particle effects, etc.
        // This runs every frame, so be careful with performance!
    });

    // 5. World generation hook - modify chunks as they're generated
    game.world.registerHook('chunkGenerated', (chunk) => {
        // Example: Add random gold blocks underground
        const chunkWorldY = chunk.y * 16; // Chunk.SIZE

        // Only in chunks below ground (y < 30)
        if (chunkWorldY < 30) {
            for (let x = 0; x < 16; x++) {
                for (let y = 0; y < 16; y++) {
                    for (let z = 0; z < 16; z++) {
                        // 0.5% chance of gold
                        if (Math.random() < 0.005) {
                            const currentBlock = chunk.getBlock(x, y, z);
                            // Only replace stone
                            if (currentBlock === 3) { // Stone block ID
                                chunk.setBlock(x, y, z, goldBlock.id);
                            }
                        }
                    }
                }
            }
        }
    });

    console.log('✅ Example Mod loaded successfully!');
    console.log('💡 Try placing Gold blocks - they can\'t be broken!');
    console.log('💡 Look for gold underground while exploring!');

    return {
        GOLD: goldBlock.id,
        GLASS: glassBlock.id,
        RUBY
    };
}

/**
 * To use this mod, add to src/main.js:
 *
 * import { initExampleMod } from '../mods/example-mod.js';
 *
 * // After creating the game:
 * const game = new Game(canvas, isTouchDevice);
 * initExampleMod(game);
 * game.start();
 */
