/**
 *
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 *
 * @fileoverview Player controller with movement and interaction systems
 * @module player/Player
 * @requires three
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import * as THREE from 'three';

/**
 * Player - First-person controller with movement, look, and raycasting
 * @class Player
 */
export class Player {
    constructor(camera, world, inputManager) {
        this.camera = camera;
        this.world = world;
        this.input = inputManager;
        this.touchControls = null; // Will be set later if available

        // Player rotation (euler angles)
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // Movement
        this.velocity = new THREE.Vector3();
        this.speed = 4.0; // Blocks per second (walking)
        this.sprintSpeed = 6.5; // Sprint speed
        this.flySpeed = 8.0; // Flying speed
        this.mouseSensitivity = 0.002;
        this.isSprinting = false;

        // Physics
        this.gravity = -15.0; // Blocks per second squared
        this.jumpStrength = 7.0; // Initial jump velocity
        this.onGround = false;

        // Player dimensions (for collision)
        this.width = 0.5; // Player width in blocks
        this.height = 1.8; // Player height
        this.eyeHeight = 1.6; // Camera offset from feet

        // Collision tolerance
        this.collisionTolerance = 0.05; // Small buffer to prevent getting stuck

        // Calculate safe spawn position above terrain
        const spawnX = 0;
        const spawnZ = 0;
        let spawnY = 40; // Default fallback

        // Try to get actual terrain height
        try {
            const terrainHeight = world.terrainGenerator.getTerrainHeight(spawnX, spawnZ);
            spawnY = terrainHeight + 5; // Spawn 5 blocks above terrain
        } catch {
            console.warn('Could not calculate terrain height for spawn, using default');
        }

        // Player position
        this.position = new THREE.Vector3(spawnX, spawnY, spawnZ);

        // Flying mode (disabled by default - start with physics)
        this.flying = false;

        // Raycasting for block interaction
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 10; // Max reach distance

        // Current target block
        this.targetBlock = null;
        this.targetFace = null;

        // Apply camera rotation
        this.updateCamera();
    }

    /**
     * Update player position and camera
     */
    update(deltaTime) {
        // Handle mouse look
        if (this.input.isPointerLocked()) {
            const delta = this.input.getMouseDelta();
            this.rotation.y -= delta.x * this.mouseSensitivity;
            this.rotation.x -= delta.y * this.mouseSensitivity;

            // Clamp vertical rotation
            this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

            this.input.resetMouseDelta();
        }

        // Toggle fly mode with F key
        if (this.input.isKeyPressed('KeyF')) {
            if (!this.fKeyPressed) {
                this.flying = !this.flying;
                this.fKeyPressed = true;
                // Fly mode toggled
            }
        } else {
            this.fKeyPressed = false;
        }

        // Handle movement input (calculate desired velocity)
        this.handleMovement(deltaTime);

        // Apply physics if not flying
        if (!this.flying) {
            this.applyPhysics(deltaTime);
        }

        // Store old position for collision recovery
        const oldPosition = this.position.clone();

        // Apply movement
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Apply collision detection and resolve
        this.handleCollision(oldPosition);

        // Update camera
        this.updateCamera();

        // Update raycasting for block targeting
        this.updateRaycast();
    }

    /**
     * Handle player movement
     */
    handleMovement(_deltaTime) {
        const direction = new THREE.Vector3();
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        // Get forward and right vectors based on camera rotation (horizontal only for walking)
        if (this.flying) {
            // In fly mode, forward includes vertical component
            const lookVector = new THREE.Vector3(0, 0, -1);
            lookVector.applyEuler(this.rotation);
            forward.copy(lookVector);
            forward.normalize();
        } else {
            // In walk mode, forward is horizontal only
            forward.set(-Math.sin(this.rotation.y), 0, -Math.cos(this.rotation.y));
        }

        right.set(Math.cos(this.rotation.y), 0, -Math.sin(this.rotation.y));

        // WASD and Arrow key movement
        if (this.input.isKeyPressed('KeyW') || this.input.isKeyPressed('ArrowUp')) {
            direction.add(forward);
        }
        if (this.input.isKeyPressed('KeyS') || this.input.isKeyPressed('ArrowDown')) {
            direction.sub(forward);
        }
        if (this.input.isKeyPressed('KeyA') || this.input.isKeyPressed('ArrowLeft')) {
            direction.sub(right);
        }
        if (this.input.isKeyPressed('KeyD') || this.input.isKeyPressed('ArrowRight')) {
            direction.add(right);
        }

        // Vertical movement (flying only) / Sprint (walking mode)
        if (this.flying) {
            if (this.input.isKeyPressed('Space')) {
                direction.y += 1;
            }
            if (this.input.isKeyPressed('ShiftLeft') || this.input.isKeyPressed('ShiftRight')) {
                direction.y -= 1;
            }
            this.isSprinting = false;
        } else {
            // Jump (walking mode) - check both keyboard and touch controls
            const jumpPressed =
                this.input.isKeyPressed('Space') ||
                (this.touchControls && this.touchControls.getButtonStates().jump);

            if (jumpPressed && this.onGround) {
                this.velocity.y = this.jumpStrength;
            }
            // Sprint with Shift (walking mode)
            this.isSprinting =
                this.input.isKeyPressed('ShiftLeft') || this.input.isKeyPressed('ShiftRight');
        }

        // Touch controls (joystick)
        const joystick = this.input.getJoystick();
        if (joystick.active) {
            direction.add(forward.clone().multiplyScalar(joystick.y));
            direction.add(right.clone().multiplyScalar(joystick.x));
        }

        // Normalize horizontal movement and apply speed
        const horizontalDir = new THREE.Vector2(direction.x, direction.z);
        if (horizontalDir.length() > 0) {
            horizontalDir.normalize();
            // Determine speed based on mode and sprint
            let currentSpeed;
            if (this.flying) {
                currentSpeed = this.flySpeed;
            } else {
                currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;
            }

            if (this.flying) {
                // In fly mode, normalize full 3D direction
                if (direction.length() > 0) {
                    direction.normalize();
                    this.velocity.copy(direction.multiplyScalar(currentSpeed));
                }
            } else {
                // In walk mode, only affect horizontal velocity
                this.velocity.x = horizontalDir.x * currentSpeed;
                this.velocity.z = horizontalDir.y * currentSpeed;
            }
        } else if (this.flying) {
            // Flying: stop if no input
            this.velocity.x = 0;
            this.velocity.z = 0;
            if (direction.y === 0) {
                this.velocity.y = 0;
            }
        } else {
            // Walking: stop horizontal movement but keep vertical velocity
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
    }

    /**
     * Apply gravity and physics
     */
    applyPhysics(deltaTime) {
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;

        // Terminal velocity
        this.velocity.y = Math.max(this.velocity.y, -50);
    }

    /**
     * Handle collision with blocks
     */
    handleCollision(oldPosition) {
        const playerFeet = this.position.y - this.eyeHeight;
        const playerHead = playerFeet + this.height;
        const halfWidth = this.width / 2;
        const tolerance = this.collisionTolerance;

        // Ground collision - check if standing on a block
        this.onGround = false;
        const feetY = Math.floor(playerFeet - tolerance);

        // Check blocks directly below feet
        for (let xOff = -0.3; xOff <= 0.3; xOff += 0.3) {
            for (let zOff = -0.3; zOff <= 0.3; zOff += 0.3) {
                const checkX = Math.floor(this.position.x + xOff);
                const checkZ = Math.floor(this.position.z + zOff);
                const block = this.world.getBlock(checkX, feetY, checkZ);

                if (block !== 0) {
                    const blockTop = feetY + 1;
                    // If feet are at or below block top and moving down
                    if (playerFeet <= blockTop + tolerance && this.velocity.y <= 0) {
                        this.position.y = blockTop + this.eyeHeight + tolerance;
                        this.velocity.y = 0;
                        this.onGround = true;
                        break;
                    }
                }
            }
            if (this.onGround) {
                break;
            }
        }

        // Head collision
        const headY = Math.floor(playerHead + tolerance);
        for (let xOff = -0.3; xOff <= 0.3; xOff += 0.3) {
            for (let zOff = -0.3; zOff <= 0.3; zOff += 0.3) {
                const checkX = Math.floor(this.position.x + xOff);
                const checkZ = Math.floor(this.position.z + zOff);
                const block = this.world.getBlock(checkX, headY, checkZ);

                if (block !== 0 && this.velocity.y > 0) {
                    const blockBottom = headY;
                    this.position.y = blockBottom - this.height + this.eyeHeight - tolerance;
                    this.velocity.y = 0;
                    break;
                }
            }
        }

        // Horizontal collision - simplified and more forgiving
        // Sample two heights so the player behaves like a capsule when sliding along walls
        const bodyY = [Math.floor(playerFeet + 0.2), Math.floor(playerFeet + 0.9)];

        // X-axis collision
        for (const checkY of bodyY) {
            // Check +X (right)
            if (this.velocity.x > 0 || this.position.x > oldPosition.x) {
                const checkX = Math.floor(this.position.x + halfWidth + tolerance);
                for (let zOff = -halfWidth; zOff <= halfWidth; zOff += halfWidth) {
                    const checkZ = Math.floor(this.position.z + zOff);
                    if (this.world.getBlock(checkX, checkY, checkZ) !== 0) {
                        this.position.x = checkX - halfWidth - tolerance;
                        this.velocity.x = Math.min(0, this.velocity.x);
                        break;
                    }
                }
            }

            // Check -X (left)
            if (this.velocity.x < 0 || this.position.x < oldPosition.x) {
                const checkX = Math.floor(this.position.x - halfWidth - tolerance);
                for (let zOff = -halfWidth; zOff <= halfWidth; zOff += halfWidth) {
                    const checkZ = Math.floor(this.position.z + zOff);
                    if (this.world.getBlock(checkX, checkY, checkZ) !== 0) {
                        this.position.x = checkX + 1 + halfWidth + tolerance;
                        this.velocity.x = Math.max(0, this.velocity.x);
                        break;
                    }
                }
            }
        }

        // Z-axis collision
        for (const checkY of bodyY) {
            // Check +Z (forward)
            if (this.velocity.z > 0 || this.position.z > oldPosition.z) {
                const checkZ = Math.floor(this.position.z + halfWidth + tolerance);
                for (let xOff = -halfWidth; xOff <= halfWidth; xOff += halfWidth) {
                    const checkX = Math.floor(this.position.x + xOff);
                    if (this.world.getBlock(checkX, checkY, checkZ) !== 0) {
                        this.position.z = checkZ - halfWidth - tolerance;
                        this.velocity.z = Math.min(0, this.velocity.z);
                        break;
                    }
                }
            }

            // Check -Z (backward)
            if (this.velocity.z < 0 || this.position.z < oldPosition.z) {
                const checkZ = Math.floor(this.position.z - halfWidth - tolerance);
                for (let xOff = -halfWidth; xOff <= halfWidth; xOff += halfWidth) {
                    const checkX = Math.floor(this.position.x + xOff);
                    if (this.world.getBlock(checkX, checkY, checkZ) !== 0) {
                        this.position.z = checkZ + 1 + halfWidth + tolerance;
                        this.velocity.z = Math.max(0, this.velocity.z);
                        break;
                    }
                }
            }
        }
    }

    /**
     * Update camera position and rotation
     */
    updateCamera() {
        this.camera.position.copy(this.position);
        this.camera.rotation.copy(this.rotation);
    }

    /**
     * Update raycasting to find target block using DDA voxel traversal
     */
    updateRaycast() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const origin = this.raycaster.ray.origin;
        const direction = this.raycaster.ray.direction;
        const maxDistance = this.raycaster.far;

        this.targetBlock = null;
        this.targetFace = null;

        // DDA voxel traversal
        let x = Math.floor(origin.x);
        let y = Math.floor(origin.y);
        let z = Math.floor(origin.z);

        const stepX = direction.x >= 0 ? 1 : -1;
        const stepY = direction.y >= 0 ? 1 : -1;
        const stepZ = direction.z >= 0 ? 1 : -1;

        const tDeltaX = direction.x !== 0 ? Math.abs(1 / direction.x) : Infinity;
        const tDeltaY = direction.y !== 0 ? Math.abs(1 / direction.y) : Infinity;
        const tDeltaZ = direction.z !== 0 ? Math.abs(1 / direction.z) : Infinity;

        let tMaxX =
            direction.x !== 0
                ? (stepX > 0 ? x + 1 - origin.x : origin.x - x) * tDeltaX
                : Infinity;
        let tMaxY =
            direction.y !== 0
                ? (stepY > 0 ? y + 1 - origin.y : origin.y - y) * tDeltaY
                : Infinity;
        let tMaxZ =
            direction.z !== 0
                ? (stepZ > 0 ? z + 1 - origin.z : origin.z - z) * tDeltaZ
                : Infinity;

        let t = 0;
        while (t < maxDistance) {
            const blockId = this.world.getBlock(x, y, z);
            if (blockId !== 0) {
                this.targetBlock = { x, y, z };
                this.targetFace = { x: 0, y: 0, z: 0 };
                // Face is opposite of last step direction
                if (
                    tMaxX - tDeltaX <= tMaxY - tDeltaY &&
                    tMaxX - tDeltaX <= tMaxZ - tDeltaZ
                ) {
                    this.targetFace.x = -stepX;
                } else if (tMaxY - tDeltaY <= tMaxZ - tDeltaZ) {
                    this.targetFace.y = -stepY;
                } else {
                    this.targetFace.z = -stepZ;
                }
                break;
            }

            // Step to next voxel boundary
            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) {
                    x += stepX;
                    t = tMaxX;
                    tMaxX += tDeltaX;
                } else {
                    z += stepZ;
                    t = tMaxZ;
                    tMaxZ += tDeltaZ;
                }
            } else {
                if (tMaxY < tMaxZ) {
                    y += stepY;
                    t = tMaxY;
                    tMaxY += tDeltaY;
                } else {
                    z += stepZ;
                    t = tMaxZ;
                    tMaxZ += tDeltaZ;
                }
            }
        }
    }

    /**
     * Get the block the player is looking at
     */
    getTargetBlock() {
        return this.targetBlock;
    }

    /**
     * Get the face of the target block
     */
    getTargetFace() {
        return this.targetFace;
    }

    /**
     * Get player position
     */
    getPosition() {
        return this.position.clone();
    }

    /**
     * Set player position
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.updateCamera();
    }

    /**
     * Check if player is in fly mode
     */
    isFlying() {
        return this.flying;
    }

    /**
     * Toggle fly mode
     */
    toggleFlyMode() {
        this.flying = !this.flying;
        if (!this.flying) {
            // Reset velocity when switching to walk mode
            this.velocity.y = 0;
        }
    }

    /**
     * Serialize player data
     */
    serialize() {
        return {
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            rotation: {
                x: this.rotation.x,
                y: this.rotation.y
            },
            flying: this.flying
        };
    }

    /**
     * Deserialize player data
     */
    deserialize(data) {
        if (data.position) {
            this.position.set(data.position.x, data.position.y, data.position.z);
        }
        if (data.rotation) {
            this.rotation.x = data.rotation.x;
            this.rotation.y = data.rotation.y;
        }
        if (data.flying !== undefined) {
            this.flying = data.flying;
        }
        this.updateCamera();
    }

    /**
     * Set touch controls reference
     */
    setTouchControls(touchControls) {
        this.touchControls = touchControls;
    }
}
