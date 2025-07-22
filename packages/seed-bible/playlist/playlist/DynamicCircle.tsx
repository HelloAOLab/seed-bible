const CircleProgress = ({ id = "default", progress = "50" }) => {
    return (
        <>
            <style>
                {`
                    :root {
                        --progress-${id}: ${progress};
                    }
                    .progress-circle-${id} {
                        width: 2rem;
                        height: 2rem;
                        border-radius: 50%;
                        background: conic-gradient(#D36433 calc(var(--progress-${id}) * 1%), #F0F1F1 0);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .progress-circle-${id}::before {
                        content: '';
                        font-family: Arial, sans-serif;
                        font-size: 1.25rem;
                        color: #333;
                        background-color: white;
                        width: 80%;
                        height: 80%;
                        border-radius: 50%;
                    }
                `}
            </style>
            <div class={`progress-circle-${id}`} />
        </>
    );
};

return CircleProgress;