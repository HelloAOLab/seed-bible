const style = tags["VoiceAvatar.css"];

const FluidAvatarCircle = ({ className = "" }) => {
  return (
    <>
      <style>{style}</style>
      <div class={`ai-circle ${className}`} />
    </>
  );
};

export default FluidAvatarCircle;
