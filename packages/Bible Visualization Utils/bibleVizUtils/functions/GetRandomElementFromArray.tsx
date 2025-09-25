const {array} = that;

if (!Array.isArray(array) || array.length === 0)
{
  return null;
}
const randomIndex = Math.floor(Math.random() * array.length);
return array[randomIndex];