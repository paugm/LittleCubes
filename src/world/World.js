/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview World management with infinite terrain and chunk system
 * @module world/World
 * @requires three
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { TerrainGenerator } from './TerrainGenerator.js';

/**
 * World - Manages all chunks, handles infinite terrain generation
 * @class World
 */
export class World {
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.chunks = new Map(); // Map of "x,y,z" -> Chunk
        this.terrainGenerator = new TerrainGenerator(seed);

        this.renderDistance = 4; // Chunks to render around player
        this.verticalRenderDistance = 3; // Vertical chunks to render

        // Height limits to prevent crashes from loading too many chunks
        this.minHeight = -2; // Minimum Y chunk coordinate (blocks: -32)
        this.maxHeight = 8; // Maximum Y chunk coordinate (blocks: 128)

        // Event hooks for mods
        this.hooks = {
            chunkGenerated: [],
            chunkLoaded: [],
            chunkUnloaded: [],
            blockChanged: []
        };
    }

    /**
     * Get chunk key for Map storage
     */
    getChunkKey(x, y, z) {
        return `${x},${y},${z}`;
    }

    /**
     * Parse chunk key back to coordinates
     */
    parseChunkKey(key) {
        const [x, y, z] = key.split(',').map(Number);
        return { x, y, z };
    }

    /**
     * Convert world coordinates to chunk coordinates
     */
    worldToChunk(x, y, z) {
        return {
            x: Math.floor(x / Chunk.SIZE),
            y: Math.floor(y / Chunk.SIZE),
            z: Math.floor(z / Chunk.SIZE)
        };
    }

    /**
     * Convert world coordinates to local chunk coordinates
     */
    worldToLocal(x, y, z) {
        const modulo = (n, m) => ((n % m) + m) % m;
        return {
            x: modulo(x, Chunk.SIZE),
            y: modulo(y, Chunk.SIZE),
            z: modulo(z, Chunk.SIZE)
        };
    }

    /**
     * Get or create a chunk at given chunk coordinates
     */
    getChunk(cx, cy, cz) {
        const key = this.getChunkKey(cx, cy, cz);

        if (this.chunks.has(key)) {
            return this.chunks.get(key);
        }

        return null;
    }

    /**
     * Create and generate a new chunk
     */
    createChunk(cx, cy, cz) {
        const key = this.getChunkKey(cx, cy, cz);

        if (this.chunks.has(key)) {
            return this.chunks.get(key);
        }

        const chunk = new Chunk(cx, cy, cz);
        this.terrainGenerator.generateChunk(chunk);
        this.chunks.set(key, chunk);

        // Trigger hook
        this.triggerHook('chunkGenerated', chunk);

        return chunk;
    }

    /**
     * Get block at world coordinates
     */
    getBlock(x, y, z) {
        const chunkPos = this.worldToChunk(x, y, z);
        const chunk = this.getChunk(chunkPos.x, chunkPos.y, chunkPos.z);

        if (!chunk) {
            return 0;
        } // Air

        const localPos = this.worldToLocal(x, y, z);
        return chunk.getBlock(localPos.x, localPos.y, localPos.z);
    }

    /**
     * Set block at world coordinates
     */
    setBlock(x, y, z, blockId) {
        const chunkPos = this.worldToChunk(x, y, z);
        let chunk = this.getChunk(chunkPos.x, chunkPos.y, chunkPos.z);

        if (!chunk) {
            chunk = this.createChunk(chunkPos.x, chunkPos.y, chunkPos.z);
        }

        const localPos = this.worldToLocal(x, y, z);
        chunk.setBlock(localPos.x, localPos.y, localPos.z, blockId);
        chunk.modified = true; // Mark chunk as modified by player

        // Mark neighboring chunks as dirty if block is on edge
        // This ensures faces shared between chunks are rebuilt with the latest data
        if (localPos.x === 0) {
            const neighborChunk = this.getChunk(chunkPos.x - 1, chunkPos.y, chunkPos.z);
            if (neighborChunk) {
                neighborChunk.markDirty();
            }
        } else if (localPos.x === Chunk.SIZE - 1) {
            const neighborChunk = this.getChunk(chunkPos.x + 1, chunkPos.y, chunkPos.z);
            if (neighborChunk) {
                neighborChunk.markDirty();
            }
        }

        if (localPos.y === 0) {
            const neighborChunk = this.getChunk(chunkPos.x, chunkPos.y - 1, chunkPos.z);
            if (neighborChunk) {
                neighborChunk.markDirty();
            }
        } else if (localPos.y === Chunk.SIZE - 1) {
            const neighborChunk = this.getChunk(chunkPos.x, chunkPos.y + 1, chunkPos.z);
            if (neighborChunk) {
                neighborChunk.markDirty();
            }
        }

        if (localPos.z === 0) {
            const neighborChunk = this.getChunk(chunkPos.x, chunkPos.y, chunkPos.z - 1);
            if (neighborChunk) {
                neighborChunk.markDirty();
            }
        } else if (localPos.z === Chunk.SIZE - 1) {
            const neighborChunk = this.getChunk(chunkPos.x, chunkPos.y, chunkPos.z + 1);
            if (neighborChunk) {
                neighborChunk.markDirty();
            }
        }

        // Trigger hook
        this.triggerHook('blockChanged', { x, y, z, blockId });
    }

    /**
     * Update chunks based on player position and view direction
     * Loads new chunks and unloads distant ones
     */
    updateChunks(playerX, playerY, playerZ, camera) {
        const playerChunk = this.worldToChunk(playerX, playerY, playerZ);

        // Clamp player vertical chunk to prevent loading too many chunks
        const clampedPlayerChunkY = Math.max(
            this.minHeight,
            Math.min(this.maxHeight, playerChunk.y)
        );

        // Generate chunks around player
        const chunksToKeep = new Set();
        // We reuse the same set while iterating so we can later determine which chunks to unload

        // Get camera frustum for culling (if camera is available)
        let frustum = null;
        if (camera && camera.projectionMatrix && camera.matrixWorldInverse) {
            frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            );
            frustum.setFromProjectionMatrix(matrix);
        }

        for (
            let cx = playerChunk.x - this.renderDistance;
            cx <= playerChunk.x + this.renderDistance;
            cx++
        ) {
            for (
                let cy = clampedPlayerChunkY - this.verticalRenderDistance;
                cy <= clampedPlayerChunkY + this.verticalRenderDistance;
                cy++
            ) {
                // Enforce absolute height limits
                if (cy < this.minHeight || cy > this.maxHeight) {
                    continue;
                }

                for (
                    let cz = playerChunk.z - this.renderDistance;
                    cz <= playerChunk.z + this.renderDistance;
                    cz++
                ) {
                    // Frustum culling - check if chunk is in view (if camera available)
                    if (frustum) {
                        const chunkWorldPos = new THREE.Vector3(
                            cx * Chunk.SIZE + Chunk.SIZE / 2,
                            cy * Chunk.SIZE + Chunk.SIZE / 2,
                            cz * Chunk.SIZE + Chunk.SIZE / 2
                        );

                        // Create bounding sphere for chunk
                        const chunkRadius = Chunk.SIZE * 0.866; // sqrt(3)/2 * size
                        const chunkSphere = new THREE.Sphere(chunkWorldPos, chunkRadius);

                        // Skip chunks not in frustum
                        if (!frustum.intersectsSphere(chunkSphere)) {
                            continue;
                        }
                    }

                    const key = this.getChunkKey(cx, cy, cz);
                    chunksToKeep.add(key);

                    if (!this.chunks.has(key)) {
                        this.createChunk(cx, cy, cz);
                    }
                }
            }
        }

        // Unload distant chunks (but keep modified chunks in a separate store for saving)
        const chunksToUnload = [];
        for (const [key, chunk] of this.chunks.entries()) {
            if (!chunksToKeep.has(key)) {
                // Keep modified chunks in memory
                if (!chunk.modified) {
                    chunksToUnload.push(key);
                }
            }
        }

        for (const key of chunksToUnload) {
            // Remove geometry for far chunks to keep GPU memory usage stable
            const chunk = this.chunks.get(key);
            chunk.dispose();
            this.chunks.delete(key);
            this.triggerHook('chunkUnloaded', chunk);
        }
    }

    /**
     * Get height limits (in blocks)
     */
    getHeightLimits() {
        return {
            min: this.minHeight * Chunk.SIZE,
            max: (this.maxHeight + 1) * Chunk.SIZE
        };
    }

    /**
     * Get all active chunks
     */
    getAllChunks() {
        return Array.from(this.chunks.values());
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
     * Serialize world data for export (ONLY modified chunks!)
     */
    serialize() {
        const chunks = [];
        for (const chunk of this.chunks.values()) {
            // ONLY save chunks that have been modified by the player
            if (chunk.modified) {
                const serialized = chunk.serialize();
                if (serialized) {
                    chunks.push(serialized);
                }
            }
        }

        return {
            seed: this.seed,
            chunks,
            version: 4 // Save format version (4-bit packing, supports 16 block types)
        };
    }

    /**
     * Deserialize world data from export
     */
    static deserialize(data) {
        const world = new World(data.seed);

        // Loading world with modified chunks

        for (const chunkData of data.chunks) {
            const chunk = Chunk.deserialize(chunkData);
            const key = world.getChunkKey(chunk.x, chunk.y, chunk.z);
            // Loaded chunks are already marked as modified in Chunk.deserialize
            // Don't double-mark them here
            world.chunks.set(key, chunk);
        }

        // World loaded successfully

        return world;
    }
}
