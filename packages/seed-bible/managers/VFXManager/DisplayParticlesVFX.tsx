const {duration, period, particleReleaseDelay, distance, dimension, position, transformer, color = "white", scaleFactor = 1} = that;
const interval = setInterval(ThrowNewParticle, period);
// let particleReleaseDelay = 0.6
// const distance = 7.5;
const transformerPosition = transformer ? getBotPosition(transformer, dimension) : null;
const transformerOffsetZ = 1;
thisBot.vars.particleVfxIntervals.push(interval)

setTimeout(() => {
    if(thisBot.vars.particleVfxIntervals.includes(interval))
    {
        const intervalIndex = thisBot.vars.particleVfxIntervals.indexOf(interval);
        clearInterval(interval);
        thisBot.vars.particleVfxIntervals.splice(intervalIndex, 1)
    }
}, duration);

function ThrowNewParticle() {
    const particle = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.VFXParticle});
    const mod = {
        throwUnitVector: GetRandomThrowUnitVector(),
        moveDistance: distance,
        color,
        scale: scaleFactor * particle.tags.scale,
        releaseDelay: particleReleaseDelay,
        [dimension]: true,
        [dimension + "X"]: position.x + (transformer ? transformerPosition.x : 0),
        [dimension + "Y"]: position.y + (transformer ? transformerPosition.y : 0),
        [dimension + "Z"]: position.z + (transformer ? (transformerPosition.z + transformerOffsetZ) : 0)
    }
    if(particle)
    {
        particle.OnSpawned({mod});
    }
    
}

function GetRandomThrowUnitVector()
{
    const verticalRange = 0.5
    const randomAngleXY = Math.random() * Math.PI * 2
    const randomAngleZ = (Math.random() * (Math.PI * verticalRange)) + (Math.PI * ((1 - verticalRange) / 2))
    return new Vector3(Math.cos(randomAngleXY), Math.sin(randomAngleXY), Math.sin(randomAngleZ))
}