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

let game;

// Handle page unload warning for unsaved changes
window.addEventListener('beforeunload', (event) => {
    if (game && game.getHasUnsavedChanges && game.getHasUnsavedChanges()) {
        event.preventDefault();
        return '';
    }
});

function init() {
    const canvas = document.getElementById('game-canvas');
    const startButton = document.getElementById('start-button');
    const loadButton = document.getElementById('load-button');
    const fileInput = document.getElementById('file-input');
    const menuOverlay = document.getElementById('menu-overlay');
    const pauseMenu = document.getElementById('pause-menu');
    const menuButton = document.getElementById('menu-button');
    const saveWorldButton = document.getElementById('save-world-button');
    const resumeButton = document.getElementById('resume-button');
    const newWorldButton = document.getElementById('new-world-button');

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    startButton.addEventListener('click', () => {
        menuOverlay.classList.add('hidden');
        game = new Game(canvas, isTouchDevice);
        game.start();
    });

    loadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const worldData = JSON.parse(e.target.result);
                    menuOverlay.classList.add('hidden');
                    game = new Game(canvas, isTouchDevice, worldData);
                    game.start();
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
            // hasUnsavedChanges flag is reset inside exportWorld()
            pauseMenu.classList.add('hidden');
            game.resume();
        }
    });

    newWorldButton.addEventListener('click', () => {
        if (confirm('Start a new world? Current progress will be lost unless you save first.')) {
            pauseMenu.classList.add('hidden');
            game.dispose();
            game = new Game(canvas, isTouchDevice);
            game.start();
        }
    });

    document.addEventListener('keydown', (event) => {
        // Only allow pause toggling once the main menu overlay is hidden (game started)
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
