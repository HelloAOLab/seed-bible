const Loader = ({ width = "42px" , height = '42px' })=>{
    return <>
        <style>{thisBot.tags["loader.css"]}</style>
        <span 
            className="loader" 
            style={{
                width,
                height
            }}/>
    </>
}

return Loader;