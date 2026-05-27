function waitFor(checkFn, interval = 500, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const timer = setInterval(async () => {
            try {
                const result = await checkFn();
                if (result) {
                    clearInterval(timer);
                    resolve(true);
                } else if (Date.now() - start >= timeout) {
                    clearInterval(timer);
                    resolve(false)
                    //  reject(new Error("Timeout waiting for condition"));
                }
            } catch (err) {
                clearInterval(timer);
                reject(err);
            }
        }, interval);
    });
}




return await waitFor(() => getBot('system', that?.mainBotTag))

