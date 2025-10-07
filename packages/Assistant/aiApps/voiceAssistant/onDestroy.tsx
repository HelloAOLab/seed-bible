let prevPainter = document.getElementById("voiceAssistant-container");

if (prevPainter) {
    if(globalThis?.AISetStart){
        AISetStart(false);
        await os.sleep(5000);
    }
    prevPainter.remove();
}