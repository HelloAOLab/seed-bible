/**
 * ListenerString is a function that can turn any function into a CasualOS listener tag string.
 */
function ListenerString(func) {
    if (typeof func === 'string' && func[0] === '@') {
        // Is already a listener string.
        return func;
    }

    if (typeof func !== 'function') {
        throw new Error(`ListenerString can only convert function objects to strings.`);
    }

    const funcString = func.toString();
    
    if (funcString.includes('=>')) {
        // Handle arrow functions
        const arrowIndex = funcString.indexOf('=>');
        const afterArrow = funcString.substring(arrowIndex + 2).trim();
        
        if (afterArrow.startsWith('{')) {
            // Arrow function with block body
            const match = afterArrow.match(/\{([\s\S]*)\}/);
            if (match) {
                return '@' + match[1].trim();
            }
        } else {
            // Arrow function with concise body
            return '@' + afterArrow;
        }
    } else {
        // Handle regular functions
        const match = funcString.match(/\{([\s\S]*)\}/);
        if (match) {
            return '@' + match[1].trim();
        }
    }
}

// Extend Function prototype to include a .toListenerString() function.
// Now you can call .toListenerString() on any function and have it converted to a listener string.
Object.defineProperty(Function.prototype, 'toListenerString', {
    value: function() { return ListenerString(this) },
    writable: true,
    configurable: true,
    enumerable: false,
});

globalThis.ListenerString = ListenerString;