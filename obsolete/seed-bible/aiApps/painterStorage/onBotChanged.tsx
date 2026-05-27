
            if(that.tags.includes('drawingData') && globalThis?.HandleStorageChange){
                HandleStorageChange({
                    newValue: masks.drawingData
                })
            }
        