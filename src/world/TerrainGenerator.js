/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Procedural terrain generation using noise algorithms
 * @module world/TerrainGenerator
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import { SimplexNoise } from '../utils/SimplexNoise.js';
import { BlockType } from '../blocks/BlockTypes.js';
import { Chunk } from './Chunk.js';

/**
 * TerrainGenerator - Procedural terrain generation using simplex noise
 * @class TerrainGenerator
 */
export class TerrainGenerator {
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.noise = new SimplexNoise(seed);

        // Terrain generation parameters
        this.baseHeight = 10; // Base terrain height
        this.heightVariation = 5; // How much terrain can vary
        this.scale = 0.01; // Noise scale (smaller = smoother, larger features)
        this.octaves = 2; // Number of noise layers
        this.persistence = 0.5; // Amplitude decrease per octave
        this.lacunarity = 2.0; // Frequency increase per octave
    }

    /**
     * Generate terrain height at given x, z coordinates using layered noise
     */
    getTerrainHeight(x, z) {
        let height = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        // Layer multiple octaves of noise for more natural terrain
        for (let i = 0; i < this.octaves; i++) {
            const sampleX = x * this.scale * frequency;
            const sampleZ = z * this.scale * frequency;

            const noiseValue = this.noise.noise2D(sampleX, sampleZ);
            height += noiseValue * amplitude;

            maxValue += amplitude;
            amplitude *= this.persistence;
            frequency *= this.lacunarity;
        }

        // Normalize to -1 to 1, then map to terrain height range
        height = height / maxValue;
        const terrainHeight = Math.floor(this.baseHeight + height * this.heightVariation);

        return Math.max(0, terrainHeight);
    }

    /**
     * Generate a chunk with procedural terrain
     * @param {Chunk} chunk - The chunk to fill with terrain
     */
    generateChunk(chunk) {
        const chunkWorldX = chunk.x * Chunk.SIZE;
        const chunkWorldY = chunk.y * Chunk.SIZE;
        const chunkWorldZ = chunk.z * Chunk.SIZE;

        // Only generate terrain for chunks that could contain terrain
        const maxPossibleHeight = this.baseHeight + this.heightVariation;
        const minPossibleHeight = this.baseHeight - this.heightVariation;

        // Skip chunks entirely above or below terrain (but not if they contain bedrock layer)
        if (chunkWorldY > maxPossibleHeight) {
            return; // Air chunk
        }

        // Fill chunk with solid blocks if entirely below terrain (but above bedrock)
        if (chunkWorldY + Chunk.SIZE < minPossibleHeight && chunkWorldY > 0) {
            for (let x = 0; x < Chunk.SIZE; x++) {
                for (let y = 0; y < Chunk.SIZE; y++) {
                    for (let z = 0; z < Chunk.SIZE; z++) {
                        chunk.setBlock(x, y, z, BlockType.STONE, false);
                    }
                }
            }
            return;
        }

        // Generate terrain for this chunk
        for (let x = 0; x < Chunk.SIZE; x++) {
            for (let z = 0; z < Chunk.SIZE; z++) {
                const worldX = chunkWorldX + x;
                const worldZ = chunkWorldZ + z;

                const terrainHeight = this.getTerrainHeight(worldX, worldZ);

                // Fill blocks vertically
                for (let y = 0; y < Chunk.SIZE; y++) {
                    const worldY = chunkWorldY + y;

                    // Bedrock floor at y=0
                    if (worldY === 0) {
                        chunk.setBlock(x, y, z, BlockType.BEDROCK, false);
                    } else if (worldY > terrainHeight) {
                        // Add water at sea level (baseHeight - 1)
                        if (worldY <= this.baseHeight - 3 && terrainHeight < this.baseHeight - 3) {
                            chunk.setBlock(x, y, z, BlockType.WATER, false);
                        } else {
                            // Air
                            chunk.setBlock(x, y, z, BlockType.AIR, false);
                        }
                    } else if (worldY === terrainHeight) {
                        // Surface block
                        if (terrainHeight < this.baseHeight - 2) {
                            // Very low areas: sand
                            chunk.setBlock(x, y, z, BlockType.SAND, false);
                        } else {
                            // Normal areas: grass
                            chunk.setBlock(x, y, z, BlockType.GRASS, false);
                        }
                    } else if (worldY >= terrainHeight - 2) {
                        // Subsurface: dirt
                        chunk.setBlock(x, y, z, BlockType.DIRT, false);
                    } else {
                        // Deep underground: stone
                        chunk.setBlock(x, y, z, BlockType.STONE, false);
                    }
                }
            }
        }

        // Add some variety: sparse wood blocks on surface (trees)
        this.addTrees(chunk, chunkWorldX, chunkWorldY, chunkWorldZ);
    }

    /**
     * Add simple tree-like structures to the terrain
     */
    addTrees(chunk, chunkWorldX, chunkWorldY, chunkWorldZ) {
        // Use noise to determine tree placement
        for (let x = 0; x < Chunk.SIZE; x += 4) {
            for (let z = 0; z < Chunk.SIZE; z += 4) {
                const worldX = chunkWorldX + x;
                const worldZ = chunkWorldZ + z;

                // Random tree placement using noise
                const treeNoise = this.noise.noise2D(worldX * 0.03, worldZ * 0.03);

                if (treeNoise > 0.8) {
                    // Tree density threshold
                    const terrainHeight = this.getTerrainHeight(worldX, worldZ);
                    const localY = terrainHeight - chunkWorldY;

                    // Only place trees on grass and within chunk bounds
                    if (localY >= 0 && localY < Chunk.SIZE - 6) {
                        const blockBelow = chunk.getBlock(x, localY, z);
                        if (blockBelow === BlockType.GRASS) {
                            // Tree trunk (4-5 blocks high)
                            const treeHeight = 4 + Math.floor(Math.abs(treeNoise * 10) % 2);
                            for (let ty = 1; ty <= treeHeight && localY + ty < Chunk.SIZE; ty++) {
                                chunk.setBlock(x, localY + ty, z, BlockType.WOOD, false);
                            }

                            // Add leaves on top (simple 3x3x2 canopy)
                            const leafY = localY + treeHeight + 1;
                            if (leafY < Chunk.SIZE) {
                                for (let lx = -1; lx <= 1; lx++) {
                                    for (let lz = -1; lz <= 1; lz++) {
                                        for (let ly = 0; ly < 2; ly++) {
                                            const checkX = x + lx;
                                            const checkZ = z + lz;
                                            const checkY = leafY + ly;
                                            // Skip center of top layer
                                            if (ly === 1 && lx === 0 && lz === 0) {
                                                continue;
                                            }
                                            if (
                                                checkX >= 0 &&
                                                checkX < Chunk.SIZE &&
                                                checkZ >= 0 &&
                                                checkZ < Chunk.SIZE &&
                                                checkY < Chunk.SIZE
                                            ) {
                                                // Reuse the grass block for simple leaves until a dedicated leaf block exists
                                                chunk.setBlock(
                                                    checkX,
                                                    checkY,
                                                    checkZ,
                                                    BlockType.GRASS,
                                                    false
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Set seed for deterministic generation
     */
    setSeed(seed) {
        this.seed = seed;
        this.noise = new SimplexNoise(seed);
    }
}
