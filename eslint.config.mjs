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
            'css/no-empty-blocks': 'warn',
            'css/use-baseline': 'warn',
            'css/no-invalid-properties': 'warn',
        },
    },

    // Disabled rules
    {
        files: ['packages/seed-bible/**/*.{js,mjs,cjs,ts,tsx,jsx,css}'],

        // TODO: Go through and fix all errors
        rules: {
            'prefer-const': ['error', {
                destructuring: 'all'
            }],
            '@typescript-eslint/no-unused-vars': 'off',
            'no-constant-binary-expression': 'warn',
            'no-constant-condition': 'warn',
            '@typescript-eslint/no-unused-expressions': 'warn',
            'no-useless-escape': 'off',
            'no-empty': 'warn',
            'no-prototype-builtins': 'warn',
            'no-case-declarations': 'warn',
            'no-control-regex': 'warn',
            'no-empty-pattern': 'warn',


            // 'css/no-important': 'off',

            // '@typescript-eslint/no-explicit-any': 'off',
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
