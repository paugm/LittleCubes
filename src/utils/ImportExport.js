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

import { get, set, del } from 'idb-keyval';

const AUTOSAVE_KEY = 'little-cubes-autosave';

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
            version: '1.0.3',
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

    /**
     * Save world JSON to IndexedDB, with localStorage as a sync fallback
     */
    static async saveToBrowser(world, player) {
        const json = this.exportWorld(world, player);

        try {
            localStorage.setItem(AUTOSAVE_KEY, json);
        } catch (error) {
            console.warn('localStorage autosave failed:', error);
        }

        try {
            await set(AUTOSAVE_KEY, json);
        } catch (error) {
            console.warn('IndexedDB autosave failed:', error);
        }
    }

    /**
     * Load the last browser autosave, or null if none
     */
    static async loadFromBrowser() {
        try {
            const fromIdb = await get(AUTOSAVE_KEY);
            if (fromIdb) {
                return this.parseWorldData(fromIdb);
            }
        } catch (error) {
            console.warn('IndexedDB autosave read failed:', error);
        }

        try {
            const fromLocal = localStorage.getItem(AUTOSAVE_KEY);
            if (fromLocal) {
                return this.parseWorldData(fromLocal);
            }
        } catch (error) {
            console.warn('localStorage autosave read failed:', error);
        }

        return null;
    }

    /**
     * Whether a browser autosave exists
     */
    static async hasBrowserSave() {
        const data = await this.loadFromBrowser();
        return Boolean(data);
    }

    /**
     * Remove the browser autosave
     */
    static async clearBrowserSave() {
        try {
            localStorage.removeItem(AUTOSAVE_KEY);
        } catch {
            // Quota or file:// restrictions
        }

        try {
            await del(AUTOSAVE_KEY);
        } catch {
            // IndexedDB unavailable
        }
    }
}
