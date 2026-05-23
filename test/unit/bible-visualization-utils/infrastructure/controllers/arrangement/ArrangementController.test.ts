import { ArrangementController } from "bibleVizUtils.infrastructure.controllers.arrangement.ArrangementController";

// ─── factories ────────────────────────────────────────────────────────────────

const makeService = () => ({
  setArrangementIndexByName: jest.fn(),
});

const makeController = (service = makeService()) =>
  new ArrangementController(service as any);

// ─── handleBookOrientationChanged ─────────────────────────────────────────────

describe("handleBookOrientationChanged", () => {
  it("calls setArrangementIndexByName with the provided orientation", () => {
    const service = makeService();
    makeController(service).handleBookOrientationChanged("Chronological");
    expect(service.setArrangementIndexByName).toHaveBeenCalledWith(
      "Chronological"
    );
  });

  it("calls setArrangementIndexByName exactly once", () => {
    const service = makeService();
    makeController(service).handleBookOrientationChanged("Canonical");
    expect(service.setArrangementIndexByName).toHaveBeenCalledTimes(1);
  });

  it("passes the orientation string unchanged", () => {
    const service = makeService();
    makeController(service).handleBookOrientationChanged("Thematic");
    expect(service.setArrangementIndexByName).toHaveBeenCalledWith("Thematic");
  });

  it("forwards an empty string to the service", () => {
    const service = makeService();
    makeController(service).handleBookOrientationChanged("");
    expect(service.setArrangementIndexByName).toHaveBeenCalledWith("");
  });

  it("calls setArrangementIndexByName once per invocation", () => {
    const service = makeService();
    const controller = makeController(service);
    controller.handleBookOrientationChanged("A");
    controller.handleBookOrientationChanged("B");
    expect(service.setArrangementIndexByName).toHaveBeenCalledTimes(2);
    expect(service.setArrangementIndexByName).toHaveBeenNthCalledWith(1, "A");
    expect(service.setArrangementIndexByName).toHaveBeenNthCalledWith(2, "B");
  });
});
