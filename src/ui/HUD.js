/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Heads-up display management for game UI elements
 * @module ui/HUD
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

/**
 * HUD - Heads-up display with crosshair, hotbar, and info panel
 *
 * This class manages:
 * - Hotbar display with block selection
 * - Info panel showing current block, mode, and controls
 * - Visual feedback for inventory changes
 * - Message display system
 *
 * @class HUD
 */
export class HUD {
    /**
     * Create a new HUD instance
     * @param {Inventory} inventory - The player's inventory
     * @param {Player} player - The player instance
     * @param {boolean} isMobile - Whether this is a mobile device
     */
    constructor(inventory, player, isMobile = false) {
        this.inventory = inventory;
        this.player = player;
        this.isMobile = isMobile;

        this.hotbarElement = document.getElementById('hotbar');
        this.infoPanelElement = document.getElementById('info-content');

        if (!this.infoPanelElement) {
            this.infoPanelElement = document.getElementById('info-panel');
        }

        // Initialize hotbar
        this.initHotbar();

        // Listen for inventory changes
        this.inventory.setSelectionCallback((slot) => this.updateHotbar(slot));

        // Initial info update
        this.updateInfo();
    }

    /**
     * Initialize hotbar UI
     */
    initHotbar() {
        this.hotbarElement.innerHTML = '';

        const blocks = this.inventory.getBlocks();

        blocks.forEach((block, index) => {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            if (index === this.inventory.getSelectedSlot()) {
                slot.classList.add('active');
            }

            // Block preview
            const preview = document.createElement('div');
            preview.className = 'block-preview';
            preview.style.backgroundColor = block.color;
            slot.appendChild(preview);

            // Key hint
            const keyHint = document.createElement('div');
            keyHint.className = 'key-hint';
            keyHint.textContent = index + 1;
            slot.appendChild(keyHint);

            // Click to select
            slot.addEventListener('click', () => {
                this.inventory.selectSlot(index);
            });

            this.hotbarElement.appendChild(slot);
        });
    }

    /**
     * Update hotbar selection
     */
    updateHotbar(selectedSlot) {
        const slots = this.hotbarElement.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            if (index === selectedSlot) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });

        this.updateInfo();
    }

    /**
     * Update info panel
     */
    updateInfo() {
        const selectedBlock = this.inventory.getSelectedBlock();
        const isFlying = this.player ? this.player.isFlying() : false;
        const isSprinting = this.player && !isFlying ? this.player.isSprinting : false;

        let mode = isFlying ? 'Fly Mode' : 'Walk Mode';
        let modeColor = isFlying ? '#FFD700' : '#FFFFFF';

        if (isSprinting) {
            mode = 'Sprint Mode';
            modeColor = '#FF8C00';
        }

        if (selectedBlock) {
            // Only show keyboard controls on desktop
            const controlsHtml = !this.isMobile
                ? `
                <div class="controls-hint">
                    <div class="control-item">
                        <span class="key">${isFlying ? 'Space/Shift' : 'Space'}</span> ${isFlying ? 'Up/Down' : 'Jump'}
                    </div>
                    ${!isFlying ? '<div class="control-item"><span class="key">⇧</span> Sprint</div>' : ''}
                    <div class="control-item">
                        <span class="key">F</span> Fly
                    </div>
                </div>
            `
                : '';

            this.infoPanelElement.innerHTML = `
                <div class="info-section">
                    <div class="info-item" style="color: ${modeColor};">
                        ${mode}
                    </div>
                    <div class="info-item" style="border-color: ${selectedBlock.color};">
                        <span style="color: ${selectedBlock.color}">■</span>
                        ${selectedBlock.name}
                    </div>
                </div>
                ${controlsHtml}
            `;
        }
    }

    /**
     * Show message in info panel
     */
    showMessage(message, duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.style.color = '#FFD700';
        messageDiv.style.marginTop = '10px';
        messageDiv.textContent = message;

        this.infoPanelElement.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, duration);
    }

    /**
     * Update HUD (called each frame)
     */
    update(_player, _world) {
        // Update info panel to reflect current mode
        this.updateInfo();
    }
}
