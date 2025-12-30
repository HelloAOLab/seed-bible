if(globalThis.HandleUploadFiles) {
    globalThis.ToggleCommandBox();
    globalThis.HandleUploadFiles({
        files: that.files
    });
}