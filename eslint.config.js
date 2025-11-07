/**
 * 
 *  ▗▖   ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖   ▗▄▄▄▖ ▗▄▄▖▗▖ ▗▖▗▄▄▖ ▗▄▄▄▖ ▗▄▄▖
 *  ▐▌     █    █    █  ▐▌   ▐▌   ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌   
 *  ▐▌     █    █    █  ▐▌   ▐▛▀▀▘▐▌   ▐▌ ▐▌▐▛▀▚▖▐▛▀▀▘ ▝▀▚▖
 *  ▐▙▄▄▖▗▄█▄▖  █    █  ▐▙▄▄▖▐▙▄▄▖▝▚▄▄▖▝▚▄▞▘▐▙▄▞▘▐▙▄▄▖▗▄▄▞▘
 *  
 *  LittleCUBES - https://github.com/paugm/LittleCubes
 * 
 * @fileoverview ESLint configuration
 * @author Pau Garcia-Mila <https://github.com/paugm>
 * @license MIT
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
    // Base JavaScript recommended rules
    js.configs.recommended,
    
    // Global configuration
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021
            }
        }
    },
    
    // Custom rules for all JavaScript files
    {
        files: ['**/*.js'],
        rules: {
            'indent': ['error', 4],
            'linebreak-style': ['error', 'unix'],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
            'no-console': ['warn', { 'allow': ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
            'eqeqeq': ['error', 'always'],
            'curly': ['error', 'all'],
            'brace-style': ['error', '1tbs'],
            'comma-dangle': ['error', 'never'],
            'comma-spacing': ['error', { 'before': false, 'after': true }],
            'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
            'space-before-blocks': ['error', 'always'],
            'space-infix-ops': 'error',
            'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
            'no-trailing-spaces': 'error'
        }
    },
    
    // Files to ignore
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            '**/*.min.js',
            'vite.config.js',
            'eslint.config.js'
        ]
    }
];


