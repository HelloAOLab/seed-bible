const Chip = ({ label, onDelete }) => {
    return (
        <>
            <style>{thisBot.tags['chips.css']}</style>
            <div className="chip">
                <span className="chip-label">{label}</span>
                <button className="chip-close" onClick={onDelete}>
                    <span class="material-symbols-outlined">
                        close
                    </span>
                </button>
            </div>
        </>
    );
};

return Chip;