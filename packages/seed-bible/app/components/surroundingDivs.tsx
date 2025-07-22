
import { getStyleOf } from 'app.styles.styler'


const SurroundingDivs = ({ children, action }) => {
    return (
        <div className="wrapper">
            <div onPointerEnter={() => action()} className="surrounding top"></div>
            <div onPointerEnter={() => action()} className="surrounding bottom"></div>
            <div onPointerEnter={() => action()} className="surrounding left"></div>
            <div onPointerEnter={() => action()} className="surrounding right"></div>

            <div className="contentOfSurrounding">{children}</div>
            <style>{getStyleOf('surroundingDivs.css')}</style>
        </div>
    );
};

export default SurroundingDivs;
