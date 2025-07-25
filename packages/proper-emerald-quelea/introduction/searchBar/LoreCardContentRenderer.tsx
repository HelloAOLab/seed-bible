const LoreCardContentRenderer = ({type , content , link}) => {
    switch(type) {
        case "a":
            return <a href={"#"} > {content} </a>;
        case "img":
            return <img src={link} alt="content" />;
        case "para":
            return <p><b>"" THIS IS DEMO TEXT "</b> {content}</p>;
        case "ol":
            return <ol>
                {content.map(({type,content, link},index)=><li key={index}> <LoreCardContentRenderer content={content} type={type} link={link} /> </li>)}
            </ol>;
        case "ul":
            return <ul>
                {content.map(({type,content, link},index)=><li key={index}> <LoreCardContentRenderer content={content} type={type} link={link} /> </li>)}
            </ul>;
        default:
            return <p>{content}</p>;
    }
}

return {
    LoreCardContentRenderer
}