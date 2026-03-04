let prevPainter = document.getElementById("voiceAssistant-container");

if (prevPainter) {
    if(globalThis?.AISetStart){
        await os.sleep(5000);
        AISetStart(false);
    }
    prevPainter.remove();
}