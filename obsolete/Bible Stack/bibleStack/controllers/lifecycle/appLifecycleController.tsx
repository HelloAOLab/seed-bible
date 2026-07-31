import { experienceService } from "bibleStack.services.index";

export async function ClearExperience() {
  experienceService.clearExperience();
}
