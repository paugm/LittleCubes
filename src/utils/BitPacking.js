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
     * Pack an array of block IDs (0-7) into a bit-packed array
     * @param {Uint8Array} blocks - Array of block IDs (8 bits each)
     * @returns {Uint8Array} - Packed array (3 bits per block)
     */
    static pack(blocks) {
        // Calculate output size: 3 bits per block
        // NOTE: 3 bits restrict block IDs to the range 0-7. Adding new block types
        // with higher IDs requires increasing the bit width to avoid data loss.
        const bitCount = blocks.length * 3;
        const byteCount = Math.ceil(bitCount / 8);
        const packed = new Uint8Array(byteCount);

        let bitIndex = 0;
        for (let i = 0; i < blocks.length; i++) {
            const blockId = blocks[i] & 0x07; // Ensure only 3 bits (0-7)

            // Calculate byte and bit position
            const byteIndex = Math.floor(bitIndex / 8);
            const bitOffset = bitIndex % 8;

            // Pack the 3 bits
            if (bitOffset <= 5) {
                // Fits in current byte
                packed[byteIndex] |= blockId << (5 - bitOffset);
            } else {
                // Spans two bytes
                packed[byteIndex] |= blockId >> (bitOffset - 5);
                if (byteIndex + 1 < byteCount) {
                    packed[byteIndex + 1] |= (blockId << (13 - bitOffset)) & 0xff;
                }
            }

            bitIndex += 3;
        }

        return packed;
    }

    /**
     * Unpack a bit-packed array back to block IDs
     * @param {Uint8Array} packed - Packed array (3 bits per block)
     * @param {number} blockCount - Number of blocks to unpack
     * @returns {Uint8Array} - Array of block IDs (8 bits each)
     */
    static unpack(packed, blockCount) {
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
