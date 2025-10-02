const { useEffect, useRef } = os.appHooks;

/**
 * FluidAvatarCircle
 * A silky, fluid WebGL animation clipped to a perfect circle — inspired by modern "realtime avatar" ripples.
 *
 * Usage:
 *   <FluidAvatarCircle size={240} speed={1.0} />
 *
 * Props:
 *   - size: diameter in px (default 240)
 *   - speed: animation speed multiplier (default 1)
 *   - colors: optional 3-color palette [{r,g,b}, ...] with 0..1 values
 */
const FluidAvatarCircle =({
    size = 50,
    speaking = true,
    className = ""
}) => {

    const speakingAnimation = speaking
        ? { animation: "flow 2s ease-in-out infinite, pulse 1.2s ease-in-out infinite" }
        : {};

    return (
        <div
            class={`ai-circle ${className}`}
            style={{
                ...speakingAnimation,
            }}
        />
    );
}

export default FluidAvatarCircle;