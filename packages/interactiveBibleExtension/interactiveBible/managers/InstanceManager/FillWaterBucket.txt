const dimension = os.getCurrentDimension();

// const currStreamPosition = getBotPosition(links.waterStream, dimension);
// const currStreamScales = GetBotScales(links.waterStream);
// const waterStreamAnimationDuration = 0.25;
const bucketMovementDuration = 1;
const waterBucketFillDuration = 5;
const bucketTransformerPosition = getBotPosition(links.bucketTransformer, dimension);
const bucketTransformerScales = GetBotScales(links.bucketTransformer);
// const particlesPosition = new Vector3(bucketTransformerPosition.x, bucketTransformerPosition.y, bucketTransformerPosition.z + bucketTransformerScales.z - 0.375)

// VFXManager.DisplayParticlesVFX({
//     duration: (waterStreamAnimationDuration + waterBucketFillDuration) * 1000,
//     period: 60, 
//     particleReleaseDelay: 750, 
//     distance: 1.25, 
//     dimension, 
//     position: particlesPosition,
//     color: links.bucketTransformer.links.water.tags.color,
//     scaleFactor: 0.25
// });
await animateTag(links.bucketTransformer, "homeZ", {
    toValue: links.bucketTransformer.tags.initialPosition.z - 3,
    duration: bucketMovementDuration,
    easing: {type: "sinusoidal", mode: "inout"}
})

links.bucketTransformer.links.water.tags[dimension] = true;
links.bucketTransformer.links.water.tags.scaleZ = 0.7;
await os.sleep(waterBucketFillDuration * 1000)

await animateTag(links.bucketTransformer, "homeZ", {
    toValue: links.bucketTransformer.tags.initialPosition.z,
    duration: bucketMovementDuration,
    easing: {type: "sinusoidal", mode: "inout"}
})

// links.waterStream.tags[dimension] = false;
links.bucketTransformer.tags.pointable = true;

return true;