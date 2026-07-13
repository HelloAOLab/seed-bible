# Mapa de configuración de labels por `BiblePiece`

> Reconstruido desde un commit antiguo del proyecto (`packages/`), donde `GetLabelForPiece` todavía existía con toda la config.
> Fuente: todas las llamadas a `BibleVizUtils.Functions.GetLabelForPiece(...)`.
> Las **notas "› Origen"** rastrean, para cada parámetro no-hardcodeado, dónde se define su valor y qué valor/default recibe.

## La función `GetLabelForPiece`

Archivo: `packages/Bible Visualization Utils/bibleVizUtils/functions/GetLabelForPiece.tsx`

Destructura de su argumento `that`:

```js
const {
  piece, // Bot dueño del label
  label, // texto del label
  date, // texto de la fecha (opcional; si falta ⇒ no se crea InfoLabelDate)
  color, // color del label + tail
  labelColor, // color del TEXTO del label
  dimension, // dimensión donde se posiciona
  labelPositioning, // LeftSided | RightSided | Top | RightSidedCorner
  isAnimatable, // si el label puede hacer la animación de "shake" mientras está activo
  targetOpacity = 1, // opacidad objetivo del transformer (default 1)
  pointableDefault = true, // si el label es pointable por default (default true)
} = that;
```

Devuelve `{ infoLabelTransformer }`. Internamente saca del pool 4 sub-bots:
`InfoLabelTransformer` (raíz), `InfoLabel` (texto/caja), `InfoLabelTail` (cola) y `InfoLabelDate` (solo si viene `date`).

---

## Notas comunes de origen (aplican a varias piezas)

- **`highlightColor`** (usado como `pieceData.highlightColor ?? ...`): la piece-data viene de `BibleStackManager.GetPieceData` (`main/GetPieceData.tsx`, solo hace lookup, no computa color) → propiedad definida en la clase base `StackPieceData` (`Bible Visualization Utils/.../classes/StackPieceData.tsm:25`), **default `null`**. Solo se asigna al resaltar: `functions/HighlightBiblePiece.tsx:11` → `data.highlightColor = BibleVizUtils.Data.tags.highlightColor` (color global del manager). Por eso **todo** consumidor usa `?? <fallback>`.
- **`labelTextColor`**: **sin default estático en los prefabs**; se calcula al spawnear cada pieza (fuentes específicas en cada sección) y se **resetea a `null`** al liberar (`prefabs/section/OnReleased.tsx:31`, `prefabs/book/OnReleased.tsx:37`).
- **`GetCurrentLabelDateFormat()`** (usado al calcular `date`): retorna `BibleVizUtils.Data.masks.labelDateFormat` (`functions/GetCurrentLabelDateFormat.tsx:1`). Valores posibles: `Absolute` | `Relative` (`data/LabelDateFormats.json`). **No hay inicializador**, así que por defecto es `undefined` ⇒ la comparación `=== Relative` es falsa ⇒ cae en la rama **Absolute** ("… years ago"). Se cambia con `functions/SetLabelDateFormat.tsx`.
- **Cadena de datos de nombres**: `infoLabel`/`sectionName`/`bookName`/`commonName` salen de `data/arrangementsInfo.json` (`testaments[].name`, `sections[].name`, `books[].commonName`), cargado en `BibleVizUtils.Data.vars.fixedArrangementsInfo`; las funciones `Create*` arman los objetos `pieceInfo` que luego se leen al spawnear.

---

## Resumen por pieza (parámetros pasados a `GetLabelForPiece`)

Leyenda: `isGround` = `piece.masks.isOnTheGround`. `pieceData` = `BibleStackManager.GetPieceData({piece})`.

### `StackTestament`

`packages/Bible Stack/bibleStack/prefabs/testament/Highlight.tsx:21`

| Parámetro          | Valor / de dónde sale                                         |
| ------------------ | ------------------------------------------------------------- |
| `piece`            | `thisBot` (el testament)                                      |
| `label`            | `thisBot.tags.infoLabel`                                      |
| `date`             | — (no se pasa ⇒ sin fecha)                                    |
| `color`            | `"white"`                                                     |
| `labelColor`       | `testamentData.highlightColor ?? thisBot.tags.labelTextColor` |
| `dimension`        | `os.getCurrentDimension()`                                    |
| `labelPositioning` | `isGround ? Top : LeftSided`                                  |
| `isAnimatable`     | `true`                                                        |
| `targetOpacity`    | (default) `1`                                                 |
| `pointableDefault` | (default) `true`                                              |

**› Origen de los valores dinámicos:**

- `label` = `thisBot.tags.infoLabel` → seteado en `main/SpawnTestament.tsx:36`: `infoLabel: testamentData.pieceInfo.name` (nombre del testamento desde `arrangementsInfo.json → testaments[].name`, p.e. `"New Testament"`/`"Old Testament"`; mapa literal en `data/TestamentNames.json`). Sin default en prefab.
- `labelColor` ← `thisBot.tags.labelTextColor` → `main/SetUpBible.tsx:147`: `GetDarkerColor({color: testamentData.pieceInfo.color ?? "#000000"})` (y al seleccionar en `main/SelectTestament.tsx:117`). Ver [Notas comunes: `labelTextColor`, `highlightColor`].

### `StackSection`

`packages/Bible Stack/bibleStack/prefabs/section/Highlight.tsx:19`

| Parámetro          | Valor / de dónde sale                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| `piece`            | `thisBot` (la section)                                                 |
| `label`            | `CapitalizeFirstLetter(thisBot.tags.sectionName.split("-").join(" "))` |
| `date`             | —                                                                      |
| `color`            | `"white"`                                                              |
| `labelColor`       | `sectionData.highlightColor ?? thisBot.tags.labelTextColor`            |
| `dimension`        | `os.getCurrentDimension()`                                             |
| `labelPositioning` | `isGround ? Top : LeftSided`                                           |
| `isAnimatable`     | `true`                                                                 |
| `targetOpacity`    | (default) `1`                                                          |
| `pointableDefault` | (default) `true`                                                       |

**› Origen de los valores dinámicos:**

- `label` ← `thisBot.tags.sectionName` → `main/SpawnSection.tsx:47`: `sectionName: name` (desde `arrangementsInfo.json → sections[].name`, p.e. `"Prophecy"`, `"Letters"`); en el label se capitaliza y se cambian `-` por espacios.
- `labelColor` ← `thisBot.tags.labelTextColor` → `main/SpawnSection.tsx:72`: `GetDarkerColor({color: sectionData.pieceInfo.color})` (también `prefabs/bibleTransformer/OpenBible.tsx:62`). Ver [Notas comunes].

### `StackBook` — al hacer **hover / Highlight**

`packages/Bible Stack/bibleStack/prefabs/book/Highlight.tsx:26`

| Parámetro          | Valor / de dónde sale                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `piece`            | `thisBot` (el book)                                                                                       |
| `label`            | `thisBot.tags.bookName`                                                                                   |
| `date`             | `BibleStackManager.masks.showBooksLabelDate ? date : null` **(único caso con fecha)** — ver cálculo abajo |
| `color`            | `"white"`                                                                                                 |
| `labelColor`       | `thisBot.tags.labelTextColor`                                                                             |
| `dimension`        | `os.getCurrentDimension()`                                                                                |
| `labelPositioning` | `isGround ? Top : LeftSided`                                                                              |
| `isAnimatable`     | `true`                                                                                                    |
| `targetOpacity`    | (default) `1`                                                                                             |
| `pointableDefault` | (default) `true`                                                                                          |

**› Origen de los valores dinámicos:**

- `label` ← `thisBot.tags.bookName` → `main/SpawnBook.tsx:91`: `bookName: bookData.pieceInfo.commonName` (desde `arrangementsInfo.json → books[].commonName`, p.e. `"Revelation"`, `"Jude"`).
- `labelColor` ← `thisBot.tags.labelTextColor` → `main/SpawnBook.tsx:119`: `levelsColors[Math.round(levelsColors.length * 0.4) - 1]`; para libros dentro de sección `main/SelectSection.tsx:314`: `bookData.pieceInfo.customLabelColor ?? levelsColors[...]`. Ver [Notas comunes].
- `date` (el flag) ← `BibleStackManager.masks.showBooksLabelDate` → **default `false`** en `main/Initialize.tsx:40` (único sitio que lo setea en `packages/`; por defecto **NO** se muestra fecha).

Cálculo de `date` (el texto de la fecha):

```js
const actualInfo =
  bookData instanceof StackBookData
    ? bookData.pieceInfo
    : bookData.pieceBookInfo;
const { relativeDateRange } =
  BibleVizUtils.Data.tags.booksStaticInfo[actualInfo.commonName];
// Si LabelDateFormat === Relative:
//   `${|min|}${min!=max ? "-"+|max| : ""} ${min < 0 ? "B.C." : "A.D."}`
// Si es Absolute (default):
//   `${currentYear - min}${min!=max ? "-"+(currentYear-max) : ""} years ago`
```

- `relativeDateRange {min,max}` ← `data/booksStaticInfo.json`, objeto **keyed por commonName** (la key ES el common name; no hay campo `commonName` dentro). `min`/`max` en años (negativo = B.C.). Ejemplo: `"Revelation": { relativeDateRange: {min: 94, max: 96}, ... }`.
- `actualInfo.commonName` ← `arrangementsInfo.json → books[].commonName`. `pieceInfo` está en la base `StackPieceData.tsm:19`; `pieceBookInfo` en `StackSectionBookData.tsm:22` (libro dentro de una sección; se pasa en `main/CreateSection.tsx:83` como `sectionInfo.books[0]`).
- Formato Relative/Absolute ← `GetCurrentLabelDateFormat()` (default efectivo = Absolute; ver [Notas comunes]).

### `StackBook` — al **seleccionar** (BookShapeType.Selected)

`packages/Bible Stack/bibleStack/prefabs/book/TrySetShape.tsx:145`

| Parámetro          | Valor / de dónde sale                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `piece`            | `thisBot` (el book)                                                                        |
| `label`            | `thisBot.tags.bookName`                                                                    |
| `date`             | —                                                                                          |
| `color`            | `bookData.highlightColor ?? thisBot.tags.labelTextColor` **(⇐ color = el color de texto)** |
| `labelColor`       | `"white"` **(invertido respecto al hover)**                                                |
| `dimension`        | `os.getCurrentDimension()`                                                                 |
| `labelPositioning` | `isGround ? Top : RightSided`                                                              |
| `isAnimatable`     | `false`                                                                                    |
| `targetOpacity`    | (default) `1`                                                                              |
| `pointableDefault` | (default) `true`                                                                           |

**› Origen de los valores dinámicos:**

- `label` ← `thisBot.tags.bookName` (igual que en hover: `main/SpawnBook.tsx:91`).
- `color` ← `bookData.highlightColor ?? thisBot.tags.labelTextColor` — `labelTextColor` del book (`main/SpawnBook.tsx:119`); `highlightColor` ver [Notas comunes].

> ⚠️ Nota: entre **hover** y **selected** se **invierten** `color`/`labelColor`. Hover: `color=white`, `labelColor=textColor`. Selected: `color=textColor`, `labelColor=white`. También cambia el lado (`LeftSided` → `RightSided`) y `isAnimatable` (`true` → `false`).

### `StackSectionShadow` (la sombra de la sección)

`packages/Bible Stack/bibleStack/main/HandleSectionDataInStack.tsx:97, 133, 181, 207`
(4 llamadas — mismos parámetros en todas; varían solo por instantáneo vs animado y crear vs re-mostrar)

| Parámetro          | Valor / de dónde sale                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `piece`            | `sectionData.shadow` / `sectionShadow` (la pieza sombra, **no** la section)                             |
| `label`            | `CapitalizeFirstLetter(sectionData.piece.tags.sectionName.split("-").join(" "))`                        |
| `date`             | —                                                                                                       |
| `color`            | `sectionData.highlightColor ?? sectionData.piece.tags.labelTextColor`                                   |
| `labelColor`       | `"white"`                                                                                               |
| `dimension`        | `os.getCurrentDimension()`                                                                              |
| `labelPositioning` | `sectionData.piece.masks.isOnTheGround ? Top : RightSidedCorner` **(único que usa `RightSidedCorner`)** |
| `isAnimatable`     | `false`                                                                                                 |
| `targetOpacity`    | `0.5` **(único que baja la opacidad)**                                                                  |
| `pointableDefault` | (default) `true`                                                                                        |

**› Origen de los valores dinámicos:**

- `label` ← `sectionData.piece.tags.sectionName` (el mismo tag de la sección: `main/SpawnSection.tsx:47`).
- `color` ← `sectionData.highlightColor ?? sectionData.piece.tags.labelTextColor` — `labelTextColor` de la sección (`main/SpawnSection.tsx:72`); `highlightColor` ver [Notas comunes].

### `StackChapter`

`packages/Bible Stack/bibleStack/prefabs/chapter/Highlight.tsx:28`

| Parámetro          | Valor / de dónde sale                                                |
| ------------------ | -------------------------------------------------------------------- |
| `piece`            | `thisBot` (el chapter)                                               |
| `label`            | `` `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber}` `` |
| `date`             | —                                                                    |
| `color`            | `"white"`                                                            |
| `labelColor`       | `"black"` **(único con negro fijo)**                                 |
| `dimension`        | `os.getCurrentDimension()`                                           |
| `labelPositioning` | `isGround ? Top : LeftSided`                                         |
| `isAnimatable`     | `false`                                                              |
| `targetOpacity`    | (default) `1`                                                        |
| `pointableDefault` | `false` **(único que lo pone en `false`)**                           |

**› Origen de los valores dinámicos:**

- `label` ← `parentBookName` + `chapterNumber` → `main/SpawnChapter.tsx:63` `parentBookName: bookName` (nombre del libro padre, p.e. `"Genesis"`, tomado de los args del spawn) y `main/SpawnChapter.tsx:60` `chapterNumber` (número, de los args del spawn). Aplicados vía `chapter.OnSpawned({mod: chapterMod})` (línea 76).
- ⚠️ El label **visible** del chapter es OTRO tag `label` = `chapterNumber + (bookInfo.startingIndex ?? 0)` (`main/SpawnChapter.tsx:73`), distinto del texto que se pasa a `GetLabelForPiece`.

> Nota: solo se llama si el chapter aún **no** tiene transformer:
> `GetCurrentInfoLabelTransformer(thisBot) ?? GetLabelForPiece({...})`.

---

## Fuera del pattern bible-stack (mismo motor, otro proyecto)

### `Chapter` en **Scripture Map 3D**

`packages/Scripture Map 3D/scriptureMap3D/prefabs/chapter/Highlight.tsx:26`

| Parámetro          | Valor / de dónde sale                                                |
| ------------------ | -------------------------------------------------------------------- |
| `piece`            | `thisBot` (chapter)                                                  |
| `label`            | `` `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber}` `` |
| `color`            | `"white"`                                                            |
| `labelColor`       | `"black"`                                                            |
| `dimension`        | `os.getCurrentDimension()`                                           |
| `labelPositioning` | `Top` **(siempre, sin chequeo de `isOnTheGround`)**                  |
| `isAnimatable`     | `false`                                                              |
| `pointableDefault` | (default) `true`                                                     |

> `highlightColor` aquí sale de `ScriptureMap3DManager` (mismo patrón: `HighlightMapElement` usa `InstanceManager.tags.highlightColor`, default `null`).

---

## Piezas que **no** usan `GetLabelForPiece`

Sin label vía esta función: `Verse`, `VersesBundle`, `StackCover`, `StackCrossLine`, `StackTransformer`, `StackShadow`.
Y los sub-bots del propio label (`InfoLabelTransformer`, `InfoLabelText`, `InfoLabelTail`, `InfoLabelDate`, `ActivityIndicator`, `ActivityNotification`) son la **salida** de la función, no la llaman.

---

## Cómo se distribuyen los parámetros en los sub-bots (los "mods")

Esto documenta a qué tag de cada sub-bot llega cada parámetro (útil para replicar la lógica sin la función original).

**Escalas/forma comunes** (calculado dentro de la función):

```js
const { scaleY } = GetDialogBotScaleY({
  scaleXLimit: 5,
  line: label,
  paddingX: 0.4,
  paddingY: 0.4,
});
const infoLabelScales = { x: 5, y: scaleY, z: 1 };
// formAddress del label = dialogBoxFormAddress cuyo aspectRatio ≈ (5 / scaleY)
const infoLabelTransformerDesiredScales = { x: 1, y: 1, z: 1 };
```

- **`dialogBoxFormAddresses`** ← `data/dialogBoxFormAddresses.json` (13 entradas `{aspectRatio, formAddress}`, aspectRatios de `4.396` a `0.5`; se elige la de aspect ratio más cercano al del label). Base de URLs: `https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/` (formas `roundedCircle` para ratios ≥ ~1 y `roundedSquare` para < ~0.9).
- **`ObjectPoolTags`** ← `data/ObjectPoolTags.json`, strings identidad: `InfoLabel`→`"InfoLabel"`, `InfoLabelTail`→`"InfoLabelTail"`, `InfoLabelDate`→`"InfoLabelDate"`, `InfoLabelTransformer`→`"InfoLabelTransformer"`.

### `InfoLabelTransformer` (raíz, dueña de posición)

| tag                 | valor                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| `[dimension]`       | `true`                                                                       |
| `[dimension+X/Y/Z]` | `infoLabelTransformerDesiredPosition` (según `labelPositioning`, ver switch) |
| `scaleX/Y/Z`        | `infoLabelTransformerDesiredScales` = `{1,1,1}`                              |
| `ownerBotId`        | `getID(piece)`                                                               |
| `ownerBot`          | `` `🔗${getID(piece)}` ``                                                    |
| `isAnimatable`      | ← `isAnimatable`                                                             |
| `labelPositioning`  | ← `labelPositioning`                                                         |
| `targetOpacity`     | ← `targetOpacity`                                                            |
| `pointableDefault`  | ← `pointableDefault`                                                         |

> Defaults del prefab `infoLabelTransformer`: `color=clear`, `orientationMode=billboard`, `isBaseInfoLabelTransformer=true`, `pointable=false`, `draggable=false`. No trae `form` ni escalas (se posiciona/escala al spawnear).

### `InfoLabel` (caja de texto)

| tag                                     | valor                                                                 |
| --------------------------------------- | --------------------------------------------------------------------- |
| `[dimension]`                           | `true`                                                                |
| `[dimension+X/Y/Z]` / `initialPosition` | `infoLabelOffset` (según `labelPositioning`)                          |
| `label`                                 | ← `label`                                                             |
| `transformer`                           | `getID(infoLabelTransformer)`                                         |
| `scaleX/Y/Z`                            | `infoLabelScales / infoLabelTransformerDesiredScales`                 |
| `formAddress`                           | `infoLabelFormAddress` (por aspectRatio, de `dialogBoxFormAddresses`) |
| `pointable`                             | `false`                                                               |
| `formOpacity`                           | `0` (se anima luego)                                                  |
| `labelOpacity`                          | `0`                                                                   |
| `color`                                 | ← `color`                                                             |
| `labelColor`                            | ← `labelColor`                                                        |
| `labelPositioning`                      | ← `labelPositioning`                                                  |
| `ownerBotId`                            | `getID(piece)`                                                        |

> Defaults del prefab `infoLabel`: `form=sprite`, `formOpacity=1`, `formRenderOrder=0`, `isBaseInfoLabel=true`, `labelPaddingX=0.4`, `labelPaddingY=0.4`, `scale=1`, `cursor=pointer`, `draggable=false`.

### `InfoLabelTail` (cola/puntero)

| tag                                     | valor                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `[dimension]`                           | `true`                                                                            |
| `[dimension+X/Y/Z]` / `initialPosition` | `infoLabelTailOffset`                                                             |
| `[dimension+RotationZ]`                 | `infoLabelTailDesiredRotationZ` (90°, -90°, 0 o -26.56° según `labelPositioning`) |
| `transformer`                           | `getID(infoLabelTransformer)`                                                     |
| `scaleX/Y/Z`                            | `infoLabelTailDesiredScales` (0.3, salvo `RightSidedCorner` ⇒ 0.7)                |
| `color`                                 | ← `color`                                                                         |
| `formOpacity`                           | `0`                                                                               |
| `labelPositioning`                      | ← `labelPositioning`                                                              |
| `ownerBotId`                            | `getID(piece)`                                                                    |

> Defaults del prefab `infoLabelTail`: `form=sprite`, `formAddress=.../ab-1/cac0489b…445d83.png`, `formRenderOrder=1`, `isBaseInfoLabelTail=true`, `color=white`, `pointable=true`, `cursor=pointer`.

### `InfoLabelDate` (solo si viene `date`)

| tag                                     | valor                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `[dimension]`                           | `true`                                                                           |
| `[dimension+X/Y/Z]` / `initialPosition` | `infoLabelDateOffset`                                                            |
| `transformer`                           | `getID(infoLabelTransformer)`                                                    |
| `label`                                 | ← `date`                                                                         |
| `color`                                 | ← `color`                                                                        |
| `labelColor`                            | ← `labelColor`                                                                   |
| `formAddress`                           | `LabelDateFormat===Relative ? relativeDateFormAddress : absoluteDateFormAddress` |
| `scaleX`                                | `LabelDateFormat===Relative ? relativeDateScales.x : absoluteDateScales.x`       |
| `scaleY`                                | `0.375 / transformerScaleY`                                                      |
| `scaleZ`                                | `infoLabelScales.z / transformerScaleZ`                                          |
| `formOpacity`                           | `0`                                                                              |
| `labelPositioning`                      | ← `labelPositioning`                                                             |
| `ownerBotId`                            | `getID(piece)`                                                                   |

> Valores del prefab `infoLabelDate` (`Bible Visualization Utils/.../prefabs/infoLabelDate/`):
>
> - `relativeDateScales` = `{x: 1.6125, y: 0.375}`, `absoluteDateScales` = `{x: 2.2, y: 0.375}` (guardados como JSON sidecar del tag).
> - `relativeDateFormAddress` = `.../Canvas/5893ca13…d030ce9c2b.png`, `absoluteDateFormAddress` = `.../Canvas/69c95c26…af5d34ce2.png`.
> - Otros defaults: `form=sprite`, `formAddress`=(igual que absolute), `color=white`, `labelFontSize=0.6`, `scaleX=1.6125`, `scaleY=0.375`, `scaleZ=0`, `pointable=draggable=false`.

### Posicionamiento según `labelPositioning` (resumen del `switch`)

- **LeftSided** (default): label a la izquierda; tail rotado `+90°`.
- **RightSided**: label a la derecha; tail rotado `-90°`.
- **Top**: label arriba (offset Y = `1.5 + infoLabelScales.y/2`); tail sin rotar (`0`).
- **RightSidedCorner**: label a la derecha-esquina, `+1.5` en Z; tail más grande (`0.7`) rotado `-26.56°`.

---

## Observaciones para la migración al pattern

1. **Solo 5 tipos de pieza** generan labels: `StackTestament`, `StackSection`, `StackBook` (2 estados), `StackSectionShadow`, `StackChapter`.
2. **Solo `StackBook` (hover)** usa `date` — y por defecto está apagado (`showBooksLabelDate = false`). La fecha sale de `booksStaticInfo[commonName].relativeDateRange`, formateada según `LabelDateFormat` (default efectivo = Absolute, ya que el mask nunca se inicializa).
3. Patrón de color por estado:
   - **Hover** (testament/section/book-hover): `color="white"`, `labelColor = highlightColor ?? labelTextColor`.
   - **Selected/shadow** (book-selected/sectionShadow): `color = highlightColor ?? labelTextColor`, `labelColor="white"` (invertido).
   - **Chapter**: fijo `color="white"`, `labelColor="black"`.
4. **Ningún `labelTextColor` ni `highlightColor` tiene default estático**: `labelTextColor` se computa al spawnear (`GetDarkerColor(pieceInfo.color)` para testament/section; `levelsColors[...]` para book) y `highlightColor` es `null` salvo cuando el manager resalta (usa su tag global `Data.tags.highlightColor`). De ahí el `?? fallback` universal.
5. Diferencias exclusivas: `StackChapter` → `pointableDefault=false`; `StackSectionShadow` → `targetOpacity=0.5` + `RightSidedCorner`; `StackBook selected` → `RightSided`.
6. `labelPositioning` casi siempre depende de `isOnTheGround` (`Top` si en el suelo). Scripture Map fuerza siempre `Top`.
7. Los nombres (`infoLabel`, `sectionName`, `bookName`, `parentBookName`, `commonName`) provienen todos de `data/arrangementsInfo.json` vía los `pieceInfo` que arman las funciones `Create*`.
