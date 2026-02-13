/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Chunk data structure for voxel world storage
 * @module world/Chunk
 * @requires three
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import * as THREE from 'three';
import { blockRegistry } from '../blocks/BlockRegistry.js';
import { BitPacking } from '../utils/BitPacking.js';

/**
 * Chunk - Represents a 16x16x16 section of the world
 * @class Chunk
 */
export class Chunk {
    static SIZE = 16;

    constructor(x, y, z) {
        this.x = x; // Chunk coordinates (not block coordinates)
        this.y = y;
        this.z = z;

        // 3D array of block IDs [x][y][z]
        this.blocks = new Uint8Array(Chunk.SIZE * Chunk.SIZE * Chunk.SIZE);

        // Three.js mesh
        this.mesh = null;

        // Dirty flag to track if mesh needs regeneration
        this.dirty = true;

        // Track if player has changed this chunk
        this.modified = false;

        // Mesh generation throttling
        this.lastMeshUpdate = 0;
        this.meshUpdateDelay = 100; // Delay mesh updates by 100ms to batch changes

        // Neighbors (for mesh optimization)
        this.neighbors = {
            px: null, // positive x
            nx: null, // negative x
            py: null, // positive y
            ny: null, // negative y
            pz: null, // positive z
            nz: null // negative z
        };
    }

    /**
     * Convert 3D coordinates to 1D array index
     */
    getIndex(x, y, z) {
        return x + y * Chunk.SIZE + z * Chunk.SIZE * Chunk.SIZE;
    }

    /**
     * Get block ID at local chunk coordinates
     */
    getBlock(x, y, z) {
        if (x < 0 || x >= Chunk.SIZE || y < 0 || y >= Chunk.SIZE || z < 0 || z >= Chunk.SIZE) {
            return 0; // Air outside chunk bounds
        }
        return this.blocks[this.getIndex(x, y, z)];
    }

    /**
     * Set block ID at local chunk coordinates
     * @param {boolean} markModified - Whether to mark chunk as modified (default: true)
     */
    setBlock(x, y, z, blockId, markModified = true) {
        if (x < 0 || x >= Chunk.SIZE || y < 0 || y >= Chunk.SIZE || z < 0 || z >= Chunk.SIZE) {
            return;
        }
        this.blocks[this.getIndex(x, y, z)] = blockId;
        this.dirty = true;
        if (markModified) {
            this.modified = true;
        }
    }

    /**
     * Check if a block face should be rendered
     */
    isFaceVisible(x, y, z, nx, ny, nz) {
        const neighborBlock = this.getBlock(x + nx, y + ny, z + nz);

        if (neighborBlock === 0) {
            return true;
        } // Air is always transparent

        const neighborDef = blockRegistry.getById(neighborBlock);
        return neighborDef && neighborDef.transparent;
    }

    /**
     * Generate mesh from voxel data
     */
    generateMesh() {
        if (!this.dirty) {
            return;
        }

        const positions = [];
        const colors = [];
        const indices = [];
        let vertexCount = 0;

        // Simple face shading values for basic depth perception
        const faceShades = [1.0, 0.6, 0.8]; // [top, bottom, sides]

        // Pre-define face data to avoid recreating objects
        const faces = [
            {
                dir: [1, 0, 0],
                corners: [
                    [1, 0, 0],
                    [1, 1, 0],
                    [1, 1, 1],
                    [1, 0, 1]
                ],
                shadeIdx: 2
            }, // +X (sides)
            {
                dir: [-1, 0, 0],
                corners: [
                    [0, 0, 1],
                    [0, 1, 1],
                    [0, 1, 0],
                    [0, 0, 0]
                ],
                shadeIdx: 2
            }, // -X (sides)
            {
                dir: [0, 1, 0],
                corners: [
                    [0, 1, 0],
                    [0, 1, 1],
                    [1, 1, 1],
                    [1, 1, 0]
                ],
                shadeIdx: 0
            }, // +Y (top)
            {
                dir: [0, -1, 0],
                corners: [
                    [0, 0, 0],
                    [1, 0, 0],
                    [1, 0, 1],
                    [0, 0, 1]
                ],
                shadeIdx: 1
            }, // -Y (bottom)
            {
                dir: [0, 0, 1],
                corners: [
                    [0, 0, 1],
                    [1, 0, 1],
                    [1, 1, 1],
                    [0, 1, 1]
                ],
                shadeIdx: 2
            }, // +Z (sides)
            {
                dir: [0, 0, -1],
                corners: [
                    [1, 0, 0],
                    [0, 0, 0],
                    [0, 1, 0],
                    [1, 1, 0]
                ],
                shadeIdx: 2
            } // -Z (sides)
        ];

        // Generate mesh data for each block
        for (let x = 0; x < Chunk.SIZE; x++) {
            for (let y = 0; y < Chunk.SIZE; y++) {
                for (let z = 0; z < Chunk.SIZE; z++) {
                    const blockId = this.getBlock(x, y, z);
                    if (blockId === 0) {
                        continue;
                    } // Skip air

                    const blockDef = blockRegistry.getById(blockId);
                    if (!blockDef) {
                        continue;
                    }

                    // World position of this block
                    const wx = this.x * Chunk.SIZE + x;
                    const wy = this.y * Chunk.SIZE + y;
                    const wz = this.z * Chunk.SIZE + z;

                    // Get base color with deterministic variation based on position
                    // This ensures colors stay consistent when mesh regenerates
                    const colorHash = ((wx * 73) ^ (wy * 179) ^ (wz * 283)) & 0xff;
                    const variation = 0.9 + (colorHash / 255.0) * 0.2; // 90%-110% brightness

                    // Convert hex color to RGB and apply variation
                    const color = new THREE.Color(blockDef.color);
                    const baseR = color.r * variation;
                    const baseG = color.g * variation;
                    const baseB = color.b * variation;

                    // Check each face
                    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
                        const face = faces[faceIdx];
                        const [nx, ny, nz] = face.dir;

                        if (this.isFaceVisible(x, y, z, nx, ny, nz)) {
                            const shade = faceShades[face.shadeIdx];

                            // Calculate face color directly (no cloning)
                            const faceR = baseR * shade;
                            const faceG = baseG * shade;
                            const faceB = baseB * shade;

                            // Add 4 vertices for this face
                            for (let vi = 0; vi < 4; vi++) {
                                const corner = face.corners[vi];
                                positions.push(wx + corner[0], wy + corner[1], wz + corner[2]);
                                colors.push(faceR, faceG, faceB);
                            }

                            // Add 2 triangles (6 indices)
                            indices.push(
                                vertexCount,
                                vertexCount + 1,
                                vertexCount + 2,
                                vertexCount,
                                vertexCount + 2,
                                vertexCount + 3
                            );

                            vertexCount += 4;
                        }
                    }
                }
            }
        }

        // Clean up old mesh
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        // Create new mesh if we have vertices
        if (positions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            const material = new THREE.MeshLambertMaterial({
                vertexColors: true,
                flatShading: false
            });

            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.frustumCulled = true;
        } else {
            this.mesh = null;
        }

        this.dirty = false;

        return this.mesh;
    }

    /**
     * Mark this chunk as needing mesh regeneration
     */
    markDirty() {
        this.dirty = true;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            if (this.mesh.material) {
                this.mesh.material.dispose();
            }
            this.mesh = null;
        }
    }

    /**
     * Serialize chunk data for export with RLE + bit packing compression
     */
    serialize() {
        // Pack blocks into 4 bits each (supports block IDs 0-15)
        const packed = BitPacking.pack(this.blocks);

        // Then apply Run-Length Encoding to the packed data
        const rle = [];
        let currentByte = packed[0];
        let count = 1;

        for (let i = 1; i < packed.length; i++) {
            if (packed[i] === currentByte && count < 255) {
                count++;
            } else {
                rle.push(currentByte, count);
                currentByte = packed[i];
                count = 1;
            }
        }
        // Push final run
        rle.push(currentByte, count);

        return {
            x: this.x,
            y: this.y,
            z: this.z,
            rle: rle, // RLE compressed bit-packed data
            bp: true, // Bit-packed flag
            v: 4 // Version 4 format (4-bit packing, supports 16 block types)
        };
    }

    /**
     * Deserialize chunk data from export (supports v1, v2, and v3)
     */
    static deserialize(data) {
        const chunk = new Chunk(data.x, data.y, data.z);

        if (data.v === 4 && data.rle && data.bp) {
            // Version 4: 4-bit packed + RLE compressed format (supports 16 block types)
            const packed = [];
            for (let i = 0; i < data.rle.length; i += 2) {
                const byte = data.rle[i];
                const count = data.rle[i + 1];
                for (let j = 0; j < count; j++) {
                    packed.push(byte);
                }
            }
            const packedArray = new Uint8Array(packed);
            chunk.blocks = BitPacking.unpack(packedArray, Chunk.SIZE * Chunk.SIZE * Chunk.SIZE);
        } else if (data.v === 3 && data.rle && data.bp) {
            // Version 3: 3-bit packed + RLE compressed format (legacy, max 8 block types)
            const packed = [];
            for (let i = 0; i < data.rle.length; i += 2) {
                const byte = data.rle[i];
                const count = data.rle[i + 1];
                for (let j = 0; j < count; j++) {
                    packed.push(byte);
                }
            }
            const packedArray = new Uint8Array(packed);
            chunk.blocks = BitPacking.unpack3bit(
                packedArray,
                Chunk.SIZE * Chunk.SIZE * Chunk.SIZE
            );
        } else if (data.v === 2 && data.rle) {
            // Version 2: RLE compressed format (old format without bit packing)
            let blockIndex = 0;
            for (let i = 0; i < data.rle.length; i += 2) {
                const blockId = data.rle[i];
                const count = data.rle[i + 1];
                for (let j = 0; j < count; j++) {
                    chunk.blocks[blockIndex++] = blockId;
                }
            }
        } else if (data.blocks) {
            // Version 1: Old format (backwards compatible)
            for (const block of data.blocks) {
                chunk.setBlock(block.x, block.y, block.z, block.id);
            }
        }

        // Mark loaded chunks as modified to preserve them
        chunk.modified = true;
        chunk.dirty = true;

        return chunk;
    }
}
