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
     * Neighbor chunk in a face direction (nx,ny,nz is a unit axis)
     */
    getFaceNeighbor(nx, ny, nz) {
        if (nx === 1) {
            return this.neighbors.px;
        }
        if (nx === -1) {
            return this.neighbors.nx;
        }
        if (ny === 1) {
            return this.neighbors.py;
        }
        if (ny === -1) {
            return this.neighbors.ny;
        }
        if (nz === 1) {
            return this.neighbors.pz;
        }
        if (nz === -1) {
            return this.neighbors.nz;
        }
        return null;
    }

    /**
     * Check if a block face should be rendered
     */
    isFaceVisible(x, y, z, nx, ny, nz) {
        const lx = x + nx;
        const ly = y + ny;
        const lz = z + nz;

        let neighborBlock;
        if (
            lx >= 0 &&
            lx < Chunk.SIZE &&
            ly >= 0 &&
            ly < Chunk.SIZE &&
            lz >= 0 &&
            lz < Chunk.SIZE
        ) {
            neighborBlock = this.getBlock(lx, ly, lz);
        } else {
            const neighborChunk = this.getFaceNeighbor(nx, ny, nz);
            if (!neighborChunk) {
                return true;
            }
            const wx = (lx + Chunk.SIZE) % Chunk.SIZE;
            const wy = (ly + Chunk.SIZE) % Chunk.SIZE;
            const wz = (lz + Chunk.SIZE) % Chunk.SIZE;
            neighborBlock = neighborChunk.getBlock(wx, wy, wz);
        }

        if (neighborBlock === 0) {
            return true;
        }

        const neighborDef = blockRegistry.getById(neighborBlock);
        return neighborDef && neighborDef.transparent;
    }

    /**
     * Generate mesh from voxel data (opaque and translucent as a group)
     */
    generateMesh() {
        if (!this.dirty) {
            return this.mesh;
        }

        const opaque = { positions: [], colors: [], indices: [], vertexCount: 0 };
        const translucent = { positions: [], colors: [], indices: [], vertexCount: 0 };

        const faceShades = [1.0, 0.6, 0.8];

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
            },
            {
                dir: [-1, 0, 0],
                corners: [
                    [0, 0, 1],
                    [0, 1, 1],
                    [0, 1, 0],
                    [0, 0, 0]
                ],
                shadeIdx: 2
            },
            {
                dir: [0, 1, 0],
                corners: [
                    [0, 1, 0],
                    [0, 1, 1],
                    [1, 1, 1],
                    [1, 1, 0]
                ],
                shadeIdx: 0
            },
            {
                dir: [0, -1, 0],
                corners: [
                    [0, 0, 0],
                    [1, 0, 0],
                    [1, 0, 1],
                    [0, 0, 1]
                ],
                shadeIdx: 1
            },
            {
                dir: [0, 0, 1],
                corners: [
                    [0, 0, 1],
                    [1, 0, 1],
                    [1, 1, 1],
                    [0, 1, 1]
                ],
                shadeIdx: 2
            },
            {
                dir: [0, 0, -1],
                corners: [
                    [1, 0, 0],
                    [0, 0, 0],
                    [0, 1, 0],
                    [1, 1, 0]
                ],
                shadeIdx: 2
            }
        ];

        for (let x = 0; x < Chunk.SIZE; x++) {
            for (let y = 0; y < Chunk.SIZE; y++) {
                for (let z = 0; z < Chunk.SIZE; z++) {
                    const blockId = this.getBlock(x, y, z);
                    if (blockId === 0) {
                        continue;
                    }

                    const blockDef = blockRegistry.getById(blockId);
                    if (!blockDef) {
                        continue;
                    }

                    const wx = this.x * Chunk.SIZE + x;
                    const wy = this.y * Chunk.SIZE + y;
                    const wz = this.z * Chunk.SIZE + z;

                    const colorHash = ((wx * 73) ^ (wy * 179) ^ (wz * 283)) & 0xff;
                    const variation = 0.9 + (colorHash / 255.0) * 0.2;

                    const color = new THREE.Color(blockDef.color);
                    const baseR = color.r * variation;
                    const baseG = color.g * variation;
                    const baseB = color.b * variation;

                    const target = blockDef.transparent ? translucent : opaque;

                    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
                        const face = faces[faceIdx];
                        const [nx, ny, nz] = face.dir;

                        if (this.isFaceVisible(x, y, z, nx, ny, nz)) {
                            const shade = faceShades[face.shadeIdx];
                            const faceR = baseR * shade;
                            const faceG = baseG * shade;
                            const faceB = baseB * shade;

                            for (let vi = 0; vi < 4; vi++) {
                                const corner = face.corners[vi];
                                target.positions.push(
                                    wx + corner[0],
                                    wy + corner[1],
                                    wz + corner[2]
                                );
                                target.colors.push(faceR, faceG, faceB);
                            }

                            target.indices.push(
                                target.vertexCount,
                                target.vertexCount + 1,
                                target.vertexCount + 2,
                                target.vertexCount,
                                target.vertexCount + 2,
                                target.vertexCount + 3
                            );

                            target.vertexCount += 4;
                        }
                    }
                }
            }
        }

        this._disposeMesh();

        const group = new THREE.Group();
        const opaqueMesh = this._createMeshFromBuffers(opaque, false);
        const translucentMesh = this._createMeshFromBuffers(translucent, true);

        if (opaqueMesh) {
            group.add(opaqueMesh);
        }
        if (translucentMesh) {
            group.add(translucentMesh);
        }

        if (group.children.length === 0) {
            this.mesh = null;
            this.dirty = false;
            return null;
        }

        this.mesh = group;
        this.dirty = false;
        return this.mesh;
    }

    /**
     * Build a Three.js mesh from packed vertex buffers
     */
    _createMeshFromBuffers(buffers, transparent) {
        if (buffers.positions.length === 0) {
            return null;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(buffers.colors, 3));
        geometry.setIndex(buffers.indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            flatShading: false,
            transparent,
            opacity: transparent ? 0.6 : 1,
            depthWrite: !transparent
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = true;
        if (transparent) {
            mesh.renderOrder = 1;
        }
        return mesh;
    }

    /**
     * Mark this chunk as needing mesh regeneration
     */
    markDirty() {
        this.dirty = true;
    }

    /**
     * Dispose of GPU resources for the current mesh
     */
    _disposeMesh() {
        if (!this.mesh) {
            return;
        }

        this.mesh.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                child.material.dispose();
            }
        });
        this.mesh = null;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this._disposeMesh();
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
            chunk.blocks = BitPacking.unpack3bit(packedArray, Chunk.SIZE * Chunk.SIZE * Chunk.SIZE);
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
