/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Bit packing utilities for efficient block storage
 * @module utils/BitPacking
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

/**
 * BitPacking - Compress block data using fewer bits per block
 * @class BitPacking
 */
export class BitPacking {
    /**
     * Pack an array of block IDs (0-15) into a bit-packed array
     * @param {Uint8Array} blocks - Array of block IDs (8 bits each)
     * @returns {Uint8Array} - Packed array (4 bits per block, 2 blocks per byte)
     */
    static pack(blocks) {
        // 4 bits per block → 2 blocks per byte
        const byteCount = Math.ceil(blocks.length / 2);
        const packed = new Uint8Array(byteCount);

        for (let i = 0; i < blocks.length; i++) {
            const blockId = blocks[i] & 0x0f; // Ensure only 4 bits (0-15)
            const byteIndex = i >> 1; // Math.floor(i / 2)

            if (i % 2 === 0) {
                // High nibble
                packed[byteIndex] |= blockId << 4;
            } else {
                // Low nibble
                packed[byteIndex] |= blockId;
            }
        }

        return packed;
    }

    /**
     * Unpack a bit-packed array back to block IDs
     * @param {Uint8Array} packed - Packed array (4 bits per block, 2 blocks per byte)
     * @param {number} blockCount - Number of blocks to unpack
     * @returns {Uint8Array} - Array of block IDs (8 bits each)
     */
    static unpack(packed, blockCount) {
        const blocks = new Uint8Array(blockCount);

        for (let i = 0; i < blockCount; i++) {
            const byteIndex = i >> 1; // Math.floor(i / 2)

            if (i % 2 === 0) {
                // High nibble
                blocks[i] = (packed[byteIndex] >> 4) & 0x0f;
            } else {
                // Low nibble
                blocks[i] = packed[byteIndex] & 0x0f;
            }
        }

        return blocks;
    }

    /**
     * Unpack a 3-bit packed array back to block IDs (legacy v3 format)
     * @param {Uint8Array} packed - Packed array (3 bits per block)
     * @param {number} blockCount - Number of blocks to unpack
     * @returns {Uint8Array} - Array of block IDs (8 bits each)
     */
    static unpack3bit(packed, blockCount) {
        const blocks = new Uint8Array(blockCount);
        let bitIndex = 0;

        for (let i = 0; i < blockCount; i++) {
            const byteIndex = Math.floor(bitIndex / 8);
            const bitOffset = bitIndex % 8;

            let blockId;
            if (bitOffset <= 5) {
                // Fits in current byte
                blockId = (packed[byteIndex] >> (5 - bitOffset)) & 0x07;
            } else {
                // Spans two bytes
                blockId = (packed[byteIndex] << (bitOffset - 5)) & 0x07;
                if (byteIndex + 1 < packed.length) {
                    blockId |= packed[byteIndex + 1] >> (13 - bitOffset);
                }
            }

            blocks[i] = blockId;
            bitIndex += 3;
        }

        return blocks;
    }

    /**
     * Calculate compression ratio
     * @param {number} originalSize - Original size in bytes
     * @param {number} packedSize - Packed size in bytes
     * @returns {number} - Compression ratio (0-1, lower is better)
     */
    static getCompressionRatio(originalSize, packedSize) {
        return packedSize / originalSize;
    }
}
