// const { data, customDimension } = that;
// const dimension = os.getCurrentDimension() ?? customDimension;
// const duration = 1;
// const easing = { type: "sinusoidal", mode: "inout" };
// if (!dimension) return;

// const animations = [];
// let delay = 0;

// data.forEach((info) => {
//   const { key, value } = info;
//   const bot = getBot(byTag("key", key));
//   const hitbox = getBot(
//     byTag("isTabernaclePieceHitbox", true),
//     byTag("transformer", bot.id)
//   );
//   const startTime = delay + os.localTime;
//   const fixedDuration =
//     !isNaN(bot.tags.customDuration) && bot.tags.customDuration != null
//       ? bot.tags.customDuration
//       : duration;

//   switch (value) {
//     case MeshState.Hidden:
//       {
//         if (hitbox) setTag(hitbox, dimension, null);
//         if (bot.masks.state !== MeshState.Hidden) {
//           animateTag(bot, "formOpacity", null);
//           animations.push(
//             animateTag(bot, "formOpacity", {
//               toValue: 0,
//               duration: fixedDuration,
//               easing,
//             }).then(() => {
//               setTagMask(bot, dimension, false);
//             })
//           );
//           if (bot.tags.customDuration !== 0) delay += 200;
//         }
//       }
//       break;
//     case MeshState.Shown:
//       {
//         if (hitbox) setTag(hitbox, dimension, true);
//         if (bot.masks.state !== MeshState.Shown) {
//           animateTag(bot, "formOpacity", null);
//           if (bot.masks.state === MeshState.Translucent) {
//             animations.push(
//               animateTag(bot, "formOpacity", {
//                 toValue: bot.tags.baseFormOpacity ?? 1,
//                 duration: fixedDuration,
//                 easing,
//                 startTime,
//               })
//             );
//           } else {
//             animateTag(bot, dimension + "Z", null);
//             animations.push(
//               animateTag(bot, dimension + "Z", {
//                 fromValue: bot.tags.targetPositionZ + 1,
//                 toValue: bot.tags.targetPositionZ,
//                 duration: fixedDuration,
//                 easing,
//                 startTime,
//               }),
//               animateTag(bot, "formOpacity", {
//                 fromValue: 0,
//                 toValue: bot.tags.baseFormOpacity ?? 1,
//                 duration: fixedDuration,
//                 easing,
//                 startTime,
//               })
//             );
//           }
//           setTagMask(bot, dimension, true);
//           setTagMask(bot, "pointable", bot.tags.pointableDefault);
//           if (bot.tags.customDuration !== 0) delay += 200;
//         }
//       }
//       break;
//     case MeshState.Translucent:
//       {
//         if (hitbox) setTag(hitbox, dimension, null);
//         if (bot.masks.state !== MeshState.Translucent) {
//           const targetOpacity = 0.025;
//           animateTag(bot, "formOpacity", null);
//           if (bot.masks.state === MeshState.Shown) {
//             animations.push(
//               animateTag(bot, "formOpacity", {
//                 toValue: targetOpacity,
//                 duration: fixedDuration,
//                 easing,
//                 startTime,
//               })
//             );
//           } else {
//             animateTag(bot, dimension + "Z", null);
//             animations.push(
//               animateTag(bot, dimension + "Z", {
//                 fromValue: bot.tags.targetPositionZ + 1,
//                 toValue: bot.tags.targetPositionZ,
//                 duration: fixedDuration,
//                 easing,
//                 startTime,
//               }),
//               animateTag(bot, "formOpacity", {
//                 fromValue: 0,
//                 toValue: targetOpacity,
//                 duration: fixedDuration,
//                 easing,
//                 startTime,
//               })
//             );
//           }
//           setTagMask(bot, dimension, true);
//           setTagMask(bot, "pointable", false);
//           if (bot.tags.customDuration !== 0) delay += 200;
//         }
//       }
//       break;
//     default:
//       break;
//   }
//   setTagMask(bot, "state", value);
// });

// return Promise.allSettled(animations);
