const { render } = os.appHooks;

const container = document.getElementById("twitchPub-container");
if (container) {
  render(null, container);
  container.remove();
}
