const style = tags["VoiceAvatar.css"];

const FluidAvatarCircle = ({
  className = "",
}: {
  className?: string | undefined;
  speaking?: any;
}) => {
  return (
    <>
      <style>{style}</style>
      <div class={`ai-circle ${className}`} />
    </>
  );
};

export default FluidAvatarCircle;
