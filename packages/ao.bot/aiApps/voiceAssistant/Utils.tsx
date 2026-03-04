const captureElement = async () => {
    const el = document.querySelector(".pageContainer");
    if (!el) {
        throw new Error("No element with class 'pageContainer' found");
    }

    const canvas = await html2canvas(el, {
        backgroundColor: null,
        useCORS: true
    });

    return canvas.toDataURL("image/png").split(",")[1];
}

export {captureElement}