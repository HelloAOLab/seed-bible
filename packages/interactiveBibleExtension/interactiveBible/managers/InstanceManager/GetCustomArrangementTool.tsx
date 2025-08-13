import { CustomArrangementProvider } from "interactiveBible.managers.InstanceManager.CustomArrangementContext"
const CustomArrangement = await thisBot.CustomArrangement();
const { useEffect } = os.appHooks;

const CustomArrangementTool = () => {

    useEffect(() => {
        console.log("Rendering CustomArrangementTool")
    }, [])
    
    return (
        <>
            <style>{thisBot.tags["CustomArrangementTool.css"]}</style>
            <CustomArrangementProvider>
                <CustomArrangement/>
            </CustomArrangementProvider>
        </>
    );
};

return CustomArrangementTool