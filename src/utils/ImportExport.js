/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview World serialization and save/load functionality
 * @module utils/ImportExport
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

/**
 * ImportExport - Handle world save/load functionality
 * @class ImportExport
 */
export class ImportExport {
    /**
     * Export world and player data to JSON
     */
    static exportWorld(world, player) {
        const data = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            world: world.serialize(),
            player: player.serialize()
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Download world data as a JSON file
     */
    static downloadWorld(world, player, filename = 'little-cubes-world.json') {
        const jsonData = this.exportWorld(world, player);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Parse imported world data
     */
    static parseWorldData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!data.version || !data.world) {
                throw new Error('Invalid world data format');
            }

            return data;
        } catch (error) {
            console.error('Failed to parse world data:', error);
            throw error;
        }
    }

    /**
     * Validate world data
     */
    static validateWorldData(data) {
        return data && data.version && data.world && data.world.seed !== undefined;
    }
}
