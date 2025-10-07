const { arr, currentIndex } = that;

for (let i = currentIndex - 1; i >= 0; i--) {
  if (arr[i].isActive && arr[i].piece) {
    return arr[i];
  }
}
return null;
