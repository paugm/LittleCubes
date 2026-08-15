/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Application entry point and UI event handling
 * @module main
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import { Game } from './core/Game.js';
import { ImportExport } from './utils/ImportExport.js';

let game;

window.addEventListener('beforeunload', (event) => {
    if (game && game.getHasUnsavedChanges && game.getHasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '';
        return '';
    }
});

function isTouchPrimaryDevice() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function init() {
    const canvas = document.getElementById('game-canvas');
    const startButton = document.getElementById('start-button');
    const continueButton = document.getElementById('continue-button');
    const loadButton = document.getElementById('load-button');
    const fileInput = document.getElementById('file-input');
    const menuOverlay = document.getElementById('menu-overlay');
    const pauseMenu = document.getElementById('pause-menu');
    const menuButton = document.getElementById('menu-button');
    const saveWorldButton = document.getElementById('save-world-button');
    const resumeButton = document.getElementById('resume-button');
    const newWorldButton = document.getElementById('new-world-button');

    const isTouchDevice = isTouchPrimaryDevice();

    const startGame = (worldData = null) => {
        menuOverlay.classList.add('hidden');
        if (game) {
            game.dispose();
        }
        game = new Game(canvas, isTouchDevice, worldData);
        game.start();
    };

    const refreshContinueButton = async () => {
        const hasSave = await ImportExport.hasBrowserSave();
        continueButton.classList.toggle('hidden', !hasSave);
        startButton.classList.toggle('primary', !hasSave);
        startButton.classList.toggle('secondary', hasSave);
        if (hasSave) {
            continueButton.classList.add('primary');
        }
    };

    refreshContinueButton();

    continueButton.addEventListener('click', async () => {
        try {
            const worldData = await ImportExport.loadFromBrowser();
            if (!worldData) {
                await refreshContinueButton();
                return;
            }
            startGame(worldData);
        } catch (error) {
            console.error('Failed to continue world:', error);
            alert('Failed to load the auto-saved world.');
            await ImportExport.clearBrowserSave();
            await refreshContinueButton();
        }
    });

    startButton.addEventListener('click', async () => {
        const hasSave = await ImportExport.hasBrowserSave();
        if (hasSave) {
            const confirmed = confirm(
                'Start a new world? Your auto-saved world will be replaced once you start building.'
            );
            if (!confirmed) {
                return;
            }
            await ImportExport.clearBrowserSave();
        }
        startGame();
    });

    loadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        event.target.value = '';
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const worldData = ImportExport.parseWorldData(e.target.result);
                    startGame(worldData);
                    if (game) {
                        game.persistAutosave();
                    }
                } catch (error) {
                    console.error('Failed to load world:', error);
                    alert('Failed to load world file. Please check the file format.');
                }
            };
            reader.readAsText(file);
        }
    });

    menuButton.addEventListener('click', () => {
        if (game) {
            pauseMenu.classList.remove('hidden');
            game.pause();
        }
    });

    resumeButton.addEventListener('click', () => {
        pauseMenu.classList.add('hidden');
        if (game) {
            game.resume();
        }
    });

    saveWorldButton.addEventListener('click', () => {
        if (game) {
            game.exportWorld();
            pauseMenu.classList.add('hidden');
            game.resume();
        }
    });

    newWorldButton.addEventListener('click', async () => {
        if (confirm('Start a new world? Current progress will be lost unless you save first.')) {
            pauseMenu.classList.add('hidden');
            await ImportExport.clearBrowserSave();
            startGame();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape' && game && menuOverlay.classList.contains('hidden')) {
            if (pauseMenu.classList.contains('hidden')) {
                pauseMenu.classList.remove('hidden');
                game.pause();
            } else {
                pauseMenu.classList.add('hidden');
                game.resume();
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
