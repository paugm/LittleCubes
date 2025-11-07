<!--

  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌
  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘

  LittleCUBES - https://github.com/paugm/LittleCubes

  Author: Pau Garcia-Mila <https://github.com/paugm>
  License: MIT

-->

# LittleCUBES

**Build Any World, One Cube at a Time**

A free and open source sandbox building game that I originally built for my kids. A web-based voxel building game with infinite procedurally generated terrain. Build anything you can imagine with an intuitive first-person interface!

## Features

- 🌍 **Infinite Procedural Terrain** - Mostly flat land with gentle rolling hills, perfect for building. Includes trees, water at sea level, and a bedrock floor
- 🧱 **Core Materials** - Grass, Dirt, Stone, Sand, Wood, Water, and Bedrock (unbreakable)
- 🎮 **First-Person Controls** - Walk mode with gravity/jumping/sprinting or fly mode for creative building
- 📱 **Mobile Support** - Touch controls with virtual joystick for mobile devices
- 💾 **Save/Load System** - Export and import your creations. Only saves modified chunks for tiny file sizes
- 🚀 **Optimized Performance** - Efficient rendering with frustum culling and face culling
- 🔧 **Mod Support** - Extensible architecture with event hooks for custom blocks and behaviors

## Quick Start

To start playing, just **open `LittleCUBES.html`** file in the project root directory. That's it! The game runs entirely in your browser - no server needed, works completely offline. The repo already ships with the latest build;

When you first load the game, you'll see a start menu with two options:

- **🕹️ New Game** - Start a fresh world with procedurally generated terrain
- **💾 Load World** - Continue your adventure by loading a previously saved world file

Once in-game, press **ESC** or click the **💾 Options** button to access the pause menu where you can save your world, resume playing, or start a new world.

## Controls

### Desktop

- **WASD/Arrow Keys** - Move
- **Space** - Jump (walk mode) / Fly up (fly mode)
- **Shift** - Sprint (walk mode) / Fly down (fly mode)
- **F** - Toggle walk/fly mode
- **Mouse** - Look around (click to lock pointer)
- **Left Click** - Break block
- **Right Click** - Place block
- **1-9** - Select material from hotbar
- **Mouse Wheel** - Cycle materials
- **P** - Toggle performance monitor
- **ESC** - Pause menu

### Mobile

- **Virtual Joystick** - Move
- **Swipe** - Look around
- **On-screen buttons** - Jump/Break/Place
- **Tap hotbar** - Select material

## Development and Contributing

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Build standalone version (single HTML file)
npm run build
```

### Project Structure

```
LittleCubes/
├── src/
│   ├── main.js             # Entry point
│   ├── core/               # Game engine
│   │   ├── Game.js         # Game loop
│   │   ├── Renderer.js     # Three.js rendering
│   │   └── InputManager.js # Input handling
│   ├── world/              # World generation
│   │   ├── World.js        # Chunk management
│   │   ├── Chunk.js        # 16x16x16 voxel chunks
│   │   └── TerrainGenerator.js # Procedural terrain
│   ├── blocks/             # Block system
│   │   ├── BlockRegistry.js # Block type registry
│   │   └── BlockTypes.js    # Material definitions
│   ├── player/             # Player mechanics
│   │   ├── Player.js       # Movement and physics
│   │   └── Inventory.js    # Material selection
│   ├── ui/                 # User interface
│   │   ├── HUD.js          # Heads-up display
│   │   ├── TouchControls.js # Mobile controls
│   │   └── PerformanceMonitor.js # FPS/stats display
│   └── utils/              # Utilities
│       ├── ImportExport.js # Save/load system
│       ├── BitPacking.js   # Save compression
│       └── SimplexNoise.js # Terrain generation
└── mods/
    └── example-mod.js      # Example mod
```

### Adding Custom Blocks

```javascript
import { blockRegistry } from './src/blocks/BlockRegistry.js';

const LAVA = blockRegistry.register({
    name: 'Lava',
    color: '#FF4500',
    solid: true,
    transparent: false,
    opacity: 1.0,
    unbreakable: false // Set to true for indestructible blocks
});
```

### Event Hooks

```javascript
// Block placement/breaking
game.registerHook('beforeBlockPlace', (data) => {
    // data.x, data.y, data.z, data.blockId
    // Set data.cancelled = true to prevent
});

game.registerHook('afterBlockPlace', (data) => {
    console.log('Placed block', data.blockId);
});

// Frame updates
game.registerHook('update', (data) => {
    // data.deltaTime, data.player, data.world
});

// World generation
game.world.registerHook('chunkGenerated', (chunk) => {
    // Modify newly generated chunks
    // Example: Add custom ores, structures, etc.
});

// Block changes
game.world.registerHook('blockChanged', (data) => {
    // data.x, data.y, data.z, data.blockId
    // Called whenever a block is placed or broken
});
```

### Customizing Terrain

Edit `src/world/TerrainGenerator.js` to adjust terrain generation:

```javascript
// Current settings (flat with gentle hills)
this.baseHeight = 10; // Base terrain height
this.heightVariation = 5; // ±5 blocks variation
this.scale = 0.01; // Noise scale (smaller = smoother, larger features)
this.octaves = 2; // Number of noise layers
this.persistence = 0.5; // Amplitude decrease per octave
this.lacunarity = 2.0; // Frequency increase per octave

// For completely flat terrain:
this.heightVariation = 0;

// For mountains:
this.heightVariation = 24;
this.octaves = 4;
```

The terrain generator also includes:

- **Trees** - Sparse tree placement using noise (wood trunks with grass leaves)
- **Water** - Water fills areas below sea level (baseHeight - 3)
- **Bedrock** - Unbreakable bedrock floor at y=0

## Contributing

We welcome contributions! Please follow these guidelines to ensure code quality and consistency.

### Before Committing

Run these checks before proposing any changes:

```bash
# Install dependencies first (only needed once)
npm install

# Run all checks
npm run check

# Or run checks and auto-fix issues
npm run fix
```

### Available Scripts

- `npm run lint` - Check code for errors and style issues
- `npm run lint:fix` - Automatically fix linting issues
- `npm run format` - Format all code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run check` - Run all checks (lint + format check)
- `npm run fix` - Fix all auto-fixable issues (lint:fix + format)

### Pre-commit Checklist

1. **Code Quality**: Ensure no ESLint errors

    ```bash
    npm run lint
    ```

2. **Code Formatting**: Format with Prettier

    ```bash
    npm run format
    ```

3. **Test Changes**: Run the game locally

    ```bash
    npm run dev
    ```

4. **Build Check**: Ensure production build works
    ```bash
    npm run build
    ```

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `npm run fix` to ensure code quality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request with a clear description

## Thank you to these amazing projects:

- **Three.js** - 3D WebGL rendering
- **Vite** - Build tool and dev server
- **Simplex Noise** - Procedural terrain generation

## License

MIT License - feel free to use, modify, and distribute!

---

**Have fun building! 🎮🧱**
