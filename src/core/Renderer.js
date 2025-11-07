/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Three.js renderer wrapper for managing 3D scene and rendering
 * @module core/Renderer
 * @requires three
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import * as THREE from 'three';

/**
 * Renderer - Manages Three.js scene, camera, and rendering
 *
 * This class handles:
 * - 3D scene setup and lighting
 * - Camera management
 * - Chunk mesh rendering
 * - Building/removal cursor visualization
 * - Window resize handling
 *
 * @class Renderer
 */
export class Renderer {
    /**
     * Create a new Renderer instance
     * @param {HTMLCanvasElement} canvas - The canvas element to render to
     */
    constructor(canvas) {
        this.canvas = canvas;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

        // Fog for depth perception
        this.scene.fog = new THREE.Fog(0x87ceeb, 30, 150); // Start at 30, end at 150 blocks

        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            500 // Far plane
        );

        this.setupLighting();

        this.setupBuildingCursor();

        // Bind and register resize handler so it can be properly removed in dispose()
        this.onResize = this.onResize.bind(this);
        window.addEventListener('resize', this.onResize);

        // Chunk mesh map
        this.chunkMeshes = new Map();
    }

    /**
     * Setup scene lighting
     */
    setupLighting() {
        // Simple ambient light for base visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        // Single directional light for basic shading
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 2, 1);
        directionalLight.castShadow = false;
        this.scene.add(directionalLight);
    }

    /**
     * Setup 3D building cursor
     */
    setupBuildingCursor() {
        // Create wireframe box geometry for placement cursor (slightly larger for visibility)
        const placeGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const placeEdges = new THREE.EdgesGeometry(placeGeometry);

        // White wireframe material for placement
        const placeMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        this.placementCursor = new THREE.LineSegments(placeEdges, placeMaterial);
        this.placementCursor.visible = false;
        this.scene.add(this.placementCursor);

        // Semi-transparent white box for placement
        const placeBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });

        this.placementBox = new THREE.Mesh(placeGeometry, placeBoxMaterial);
        this.placementBox.visible = false;
        this.scene.add(this.placementBox);

        // Create removal highlight cursor (white highlight for blocks to be removed)
        const removeGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const removeEdges = new THREE.EdgesGeometry(removeGeometry);

        // White wireframe for removal (same as placement)
        const removeMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        this.removalCursor = new THREE.LineSegments(removeEdges, removeMaterial);
        this.removalCursor.visible = false;
        this.scene.add(this.removalCursor);

        // Semi-transparent white box for removal
        const removeBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });

        this.removalBox = new THREE.Mesh(removeGeometry, removeBoxMaterial);
        this.removalBox.visible = false;
        this.scene.add(this.removalBox);
    }

    /**
     * Update building cursor position
     * @param {Object} targetBlock - The block being targeted
     * @param {Object} targetFace - The face of the block being targeted
     * @param {boolean} showCursor - Whether to show the cursor
     * @param {boolean} isPlacement - True for placement, false for removal
     */
    updateBuildingCursor(targetBlock, targetFace, showCursor = true, isPlacement = true) {
        // Hide all cursors by default
        this.placementCursor.visible = false;
        this.placementBox.visible = false;
        this.removalCursor.visible = false;
        this.removalBox.visible = false;

        if (!targetBlock || !showCursor) {
            return;
        }

        if (isPlacement && targetFace) {
            // Show placement cursor at the adjacent block position
            const x = targetBlock.x + targetFace.x + 0.5;
            const y = targetBlock.y + targetFace.y + 0.5;
            const z = targetBlock.z + targetFace.z + 0.5;

            // Update placement cursor position (no scaling)
            this.placementCursor.position.set(x, y, z);
            this.placementBox.position.set(x, y, z);

            // Show placement cursors
            this.placementCursor.visible = true;
            this.placementBox.visible = true;
        } else {
            // Show removal cursor at the target block position
            const x = targetBlock.x + 0.5;
            const y = targetBlock.y + 0.5;
            const z = targetBlock.z + 0.5;

            // Update removal cursor position (no scaling)
            this.removalCursor.position.set(x, y, z);
            this.removalBox.position.set(x, y, z);

            // Show removal cursors
            this.removalCursor.visible = true;
            this.removalBox.visible = true;
        }
    }

    /**
     * Handle window resize
     */
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Update chunk meshes from world
     * Handles adding new chunks, updating dirty chunks, and removing unloaded chunks
     * @param {World} world - The world instance containing chunks to render
     */
    updateChunks(world) {
        const chunks = world.getAllChunks();
        const activeKeys = new Set();

        for (const chunk of chunks) {
            const key = world.getChunkKey(chunk.x, chunk.y, chunk.z);
            activeKeys.add(key);

            if (chunk.dirty) {
                // Remove old mesh if it exists
                if (this.chunkMeshes.has(key)) {
                    const oldMesh = this.chunkMeshes.get(key);
                    this.scene.remove(oldMesh);
                    this.chunkMeshes.delete(key);
                }

                // Generate and add new mesh
                const mesh = chunk.generateMesh();
                if (mesh) {
                    this.scene.add(mesh);
                    this.chunkMeshes.set(key, mesh);
                }
            }
        }

        for (const [key, mesh] of this.chunkMeshes.entries()) {
            if (!activeKeys.has(key)) {
                // The world no longer references this chunk, so remove its mesh
                this.scene.remove(mesh);
                this.chunkMeshes.delete(key);
            }
        }
    }

    /**
     * Render the scene
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Get the camera
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get the scene
     */
    getScene() {
        return this.scene;
    }

    /**
     * Cleanup resources and event listeners
     */
    dispose() {
        // Remove event listener
        window.removeEventListener('resize', this.onResize);

        // Dispose renderer
        this.renderer.dispose();

        // Dispose all chunk meshes
        for (const mesh of this.chunkMeshes.values()) {
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                mesh.material.dispose();
            }
        }
        this.chunkMeshes.clear();

        // Dispose placement cursor
        if (this.placementCursor) {
            if (this.placementCursor.geometry) {
                this.placementCursor.geometry.dispose();
            }
            if (this.placementCursor.material) {
                this.placementCursor.material.dispose();
            }
            this.scene.remove(this.placementCursor);
        }

        if (this.placementBox) {
            if (this.placementBox.geometry) {
                this.placementBox.geometry.dispose();
            }
            if (this.placementBox.material) {
                this.placementBox.material.dispose();
            }
            this.scene.remove(this.placementBox);
        }

        // Dispose removal cursor
        if (this.removalCursor) {
            if (this.removalCursor.geometry) {
                this.removalCursor.geometry.dispose();
            }
            if (this.removalCursor.material) {
                this.removalCursor.material.dispose();
            }
            this.scene.remove(this.removalCursor);
        }

        if (this.removalBox) {
            if (this.removalBox.geometry) {
                this.removalBox.geometry.dispose();
            }
            if (this.removalBox.material) {
                this.removalBox.material.dispose();
            }
            this.scene.remove(this.removalBox);
        }
    }
}
