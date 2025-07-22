const Modal = thisBot.Modal();
const Button = thisBot.Button();
const GlassButton = thisBot.GlassButtons();
const FloatingBanner = thisBot.FloatingBanner();
const Confetti = thisBot.Confetti();
const ButtonsCover = thisBot.ButtonsCover();
const Input = thisBot.Input();
const Loader = thisBot.Loader();
const Highlighter = thisBot.Highlighter();
const ModalStepper = thisBot.ModelStepper();
const Select = thisBot.Select();
const Tooltip = thisBot.Tooltip();
const Checkbox = thisBot.Checkbox();
const LoaderSecondary = thisBot.LoaderSecondary();
const ImageWrapper = thisBot.ImageWrapper();
const Chips = thisBot.Chips();

globalThis.ShowNotification = thisBot.ShowNotification;
globalThis.ComponentsBot = thisBot;
globalThis.ImageWrapper = ImageWrapper;

return {
    Modal,
    Button,
    FloatingBanner,
    Confetti,
    ButtonsCover,
    Input,
    GlassButton,
    Loader,
    Highlighter,
    ModalStepper,
    Select,
    Tooltip,
    Checkbox,
    LoaderSecondary,
    Chips
}