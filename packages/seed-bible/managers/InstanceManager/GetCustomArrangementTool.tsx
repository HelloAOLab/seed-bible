const CustomArrangement = await thisBot.CustomArrangement();

const CustomArrangementTool = () => {

    return (
        <>
            <style>{thisBot.tags["CustomArrangementTool.css"]}</style>
            <CustomArrangement/>
        </>
    );
};

return CustomArrangementTool