const {piece, func, args = {}} = that;

if(Array.isArray(piece))
{
    return piece.map((i, index) => {return func({piece: i, args, isArray: true, index})}).filter((i) => {return i !== null && i !== undefined});
}
else
{
    return func({piece, args, isArray: false});
}