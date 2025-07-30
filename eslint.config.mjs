import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import css from "@eslint/css";

import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores([
        '**/node_modules/**',
        '**/dist/**',
        '**/typings/**',
    ]),
    { 
        files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
        ...pluginJs.configs.recommended,
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    ...tseslint.configs.recommended,
    // lint css files
    {
        files: ["**/*.css"],
        plugins: {
            css,
        },
        language: "css/css",
        extends: ['css/recommended'],
        rules: {
            "css/no-important": "warn",
        },
    },

    // Disabled rules
    {
        // TODO: Go through and fix all errors
        rules: {
            'prefer-const': ['error', {
                destructuring: 'all'
            }]
            // 'prefer-const': 'off',
            // '@typescript-eslint/no-explicit-any': 'off',
            // '@typescript-eslint/no-unused-vars': 'off',
            // '@typescript-eslint/no-empty-object-type': [
            //     'error',
            //     { allowInterfaces: 'always' },
            // ],
            // 'no-extra-boolean-cast': 'off',
            // '@typescript-eslint/no-this-alias': 'off',
            // 'vue/no-deprecated-v-bind-sync': 'off',
        },
    },
]);
