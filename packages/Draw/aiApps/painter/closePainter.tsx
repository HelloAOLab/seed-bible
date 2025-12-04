const { render } = os.appHooks;

let prevPainter = document.getElementById("painter-container");

if (prevPainter) {
  prevPainter.remove();
}
