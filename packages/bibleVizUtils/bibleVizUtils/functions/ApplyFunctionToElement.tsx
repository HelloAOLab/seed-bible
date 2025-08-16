const {element, func, args = {}} = that;

if(Array.isArray(element))
{
    return element.map((i, index) => {return func({element: i, args, isArray: true, index})}).filter((i) => {return i !== null && i !== undefined});
}
else
{
    return func({element, args, isArray: false});
}