{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022", "dom", "dom.iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true,
    "noEmit": true,
    "types": ["vitest/globals"],
    "paths": {
      "seed-bible": ["./types/vendor/app/api.d.ts"],
      "seed-bible/components": ["./types/vendor/components/index.d.ts"],
      "seed-bible/i18n": ["./types/vendor/i18n-entry.d.ts"]
    }
  },
  "include": ["index.ts", "src", "types"]
}
