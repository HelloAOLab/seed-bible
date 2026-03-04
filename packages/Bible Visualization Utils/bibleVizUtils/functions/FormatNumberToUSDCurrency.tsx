const {value = 0} = that;

const formattedString = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
}).format(value)

return formattedString;