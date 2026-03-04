const style = tags["VoiceAvatar.css"]

const FluidAvatarCircle = ({
    className = ""
}) => {

    return (
        <>
            <style>{style}</style>
            <div
                style={{
                    width:"15dvh",
                    height:"15dvh",
                    top: "33.5%"
                }}
                class={`ai-circle ${className}`}
            />
        </>
    );
}

export default FluidAvatarCircle;