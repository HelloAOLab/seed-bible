if(globalThis.HandleUploadFiles) {
    globalThis.ToggleCommandBox();
    globalThis.ThruCommandBox = that.thruCommandBox;
    globalThis.HandleUploadFiles({
        files: that.files
    });
}