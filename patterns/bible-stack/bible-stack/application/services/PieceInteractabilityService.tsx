import type {
  InteractabilityBlockerPort,
  InteractabilityUnlockerPort,
} from "../ports/in/PieceInteractability";

export class PieceInteractabilityService
  implements InteractabilityBlockerPort, InteractabilityUnlockerPort
{
  blockAll(): void {
    // TODO: Implement this
  }

  unlockAll(): void {
    // TODO: Implement this
  }
}

// function SetBiblePiecesInteractable(value = true) {
//   thisBot.vars.stackBiblesData.forEach((bibleData: StackBibleData) => {
//     const actualValue =
//       bibleData.bibleType === BibleTypes.PlatformerGame ? false : value;
//     bibleData.childrenData.forEach((testamentData) => {
//       if (
//         testamentData.isActive &&
//         !testamentData.piece?.masks.isBeingDragged &&
//         !testamentData.isSplitIntoSections
//       )
//         SetPieceInteractable({
//           piece: testamentData.piece,
//           args: { value: actualValue },
//         });
//       if (testamentData.isSplitIntoSections)
//         testamentData.childrenData.forEach((sectionData) => {
//           if (
//             !(
//               sectionData instanceof StackSectionBookData &&
//               sectionData.isSelected
//             ) &&
//             sectionData.isActive &&
//             !sectionData.piece?.masks.isBeingDragged &&
//             !sectionData.isSplitIntoBooks
//           )
//             SetPieceInteractable({
//               piece: sectionData.piece,
//               args: { value: actualValue },
//             });
//           if (
//             sectionData instanceof StackSectionData &&
//             sectionData.isSplitIntoBooks
//           )
//             sectionData.childrenData.flat().forEach((bookData) => {
//               if (
//                 !bookData.isSelected &&
//                 bookData.isActive &&
//                 !bookData.piece?.masks.isBeingDragged
//               )
//                 SetPieceInteractable({
//                   piece: bookData.piece,
//                   args: { value: actualValue },
//                 });
//             });
//         });
//     });
//   });
//   thisBot.vars.stackTestamentsData.forEach((testamentData) => {
//     if (!testamentData.parentDataIds.stackBibleId) {
//       if (
//         testamentData.isActive &&
//         !testamentData.piece.masks.isBeingDragged &&
//         !testamentData.isSplitIntoSections
//       )
//         SetPieceInteractable({ piece: testamentData.piece, args: { value } });
//       if (testamentData.isSplitIntoSections)
//         testamentData.childrenData.forEach((sectionData: StackSectionData) => {
//           if (
//             !(
//               sectionData instanceof StackSectionBookData &&
//               sectionData.isSelected
//             ) &&
//             sectionData.isActive &&
//             !sectionData.piece?.masks.isBeingDragged &&
//             !sectionData.isSplitIntoBooks
//           )
//             SetPieceInteractable({ piece: sectionData.piece, args: { value } });
//           if (
//             sectionData instanceof StackSectionData &&
//             sectionData.isSplitIntoBooks
//           )
//             sectionData.childrenData.flat().forEach((bookData) => {
//               if (
//                 !bookData.isSelected &&
//                 bookData.isActive &&
//                 !bookData.piece?.masks.isBeingDragged
//               )
//                 SetPieceInteractable({
//                   piece: bookData.piece,
//                   args: { value },
//                 });
//             });
//         });
//     }
//   });
// }

// function SetPieceInteractable(data) {
//   const { piece, args } = data;
//   const { value } = args;

//   setTagMask(
//     piece,
//     "draggable",
//     thisBot.masks.areBiblePiecesDraggable ? value : false
//   );
//   setTagMask(piece, "pointable", value);
//   setTagMask(piece, "highlightable", value);
// }
