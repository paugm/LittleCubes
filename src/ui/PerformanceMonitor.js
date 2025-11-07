/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Performance monitoring and FPS display
 * @module ui/PerformanceMonitor
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

/**
 * PerformanceMonitor - Display FPS and performance statistics
 * @class PerformanceMonitor
 */
export class PerformanceMonitor {
    constructor() {
        this.visible = false;
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();

        // Create DOM element
        this.element = document.createElement('div');
        this.element.id = 'performance-monitor';
        this.element.style.cssText = `
            position: absolute;
            top: 80px;
            right: 40px;
            background: rgba(0, 0, 0, 0.7);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 5px;
            display: none;
            min-width: 200px;
            line-height: 1.4;
            z-index: 1000;
        `;
        document.body.appendChild(this.element);

        // Stats
        this.stats = {
            fps: 0,
            chunks: 0,
            triangles: 0,
            memory: 0,
            drawCalls: 0
        };
    }

    /**
     * Toggle visibility with P key
     */
    toggle() {
        this.visible = !this.visible;
        this.element.style.display = this.visible ? 'block' : 'none';
    }

    /**
     * Update performance stats
     */
    update(renderer, world) {
        this.frameCount++;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;

        // Update FPS every second
        if (deltaTime >= 1000) {
            this.stats.fps = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        // Get renderer info
        const info = renderer.renderer.info;
        this.stats.triangles = info.render.triangles;
        this.stats.drawCalls = info.render.calls;

        // Count chunks
        this.stats.chunks = world.chunks.size;

        // Memory usage (if available)
        if (performance.memory) {
            this.stats.memory = Math.round(performance.memory.usedJSHeapSize / 1048576);
        }

        // Update display
        if (this.visible) {
            this.render();
        }
    }

    /**
     * Render stats to DOM
     */
    render() {
        this.element.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Performance Stats</div>
            <div>FPS: <span style="color: ${this.getFPSColor(this.stats.fps)}">${this.stats.fps}</span></div>
            <div>Chunks: ${this.stats.chunks}</div>
            <div>Triangles: ${this.formatNumber(this.stats.triangles)}</div>
            <div>Draw Calls: ${this.stats.drawCalls}</div>
            ${this.stats.memory ? `<div>Memory: ${this.stats.memory} MB</div>` : ''}
            <div style="margin-top: 5px; font-size: 10px; opacity: 0.7;">Press P to toggle</div>
        `;
    }

    /**
     * Get color based on FPS
     */
    getFPSColor(fps) {
        if (fps >= 60) {
            return '#0f0';
        }
        if (fps >= 30) {
            return '#ff0';
        }
        return '#f00';
    }

    /**
     * Format large numbers
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
