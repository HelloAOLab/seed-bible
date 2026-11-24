## Purpose

Lets every extension, built-in or installed from a link, stand out in Seed Bible's extension lists with its own square image instead of generated initials.

## ADDED Requirements

### Requirement: Built-in extensions can declare an icon

A built-in extension's `extension.json` SHALL accept an optional `icon` field naming an image file inside the extension's package. The file SHALL be `.png`, `.svg`, `.webp`, `.jpg` or `.jpeg`, and smaller than 256 KB. The app build SHALL bundle the file and SHALL give the extension a working link to it.

#### Scenario: Icon file is bundled and shown

- **WHEN** a built-in extension's `extension.json` has `"icon": "icon.svg"` and that file exists in its package
- **THEN** the extensions list, the extension's page and the install dialog show that image in place of the extension's initials

#### Scenario: No icon declared

- **WHEN** a built-in extension's `extension.json` has no `icon` field
- **THEN** Seed Bible shows the extension's initials on a color, as it does today

### Requirement: An invalid built-in icon fails the build

The app build SHALL fail when a built-in extension's `icon` names a file that is missing, isn't a supported image type, or is 256 KB or larger. The error message SHALL name the extension, the file and the reason.

#### Scenario: Missing icon file

- **WHEN** a built-in extension's `extension.json` has `"icon": "icon.png"` and the package has no `icon.png`
- **THEN** the build stops with an error naming the extension and saying that `icon.png` doesn't exist

#### Scenario: Oversized icon file

- **WHEN** a built-in extension's `icon` names a 400 KB `.png`
- **THEN** the build stops with an error giving the file's size and the 256 KB limit

### Requirement: A broken icon falls back to initials

When an extension's icon link fails to load, Seed Bible SHALL show the extension's initials instead. This SHALL hold for both built-in and link-installed extensions.

#### Scenario: Icon link returns an error

- **WHEN** an extension's icon link responds with a 404
- **THEN** its tile shows its initials on a color, with no broken-image marker
