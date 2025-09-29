import { Section } from 'app.sn_components.bibleBookSection';


console.log("New Bible Data: ", that.data);

globalThis.GlobalSections = that.data.content.map(e => {
    return <div style={{ 'pointer-events': isDragging ? "none" : null }}>
        <Section
            {...e}
            book={data.book}
            chapter={data.chapter}
            blinker={blinker}
            setRef={refs}
            holded={holded}
            selected={selected}
            textEdit={false}
        />
    </div>
});
