import type { Story } from "./types";

import { runParallel } from "./utils/run-parallel";
import { FileSystem } from "./file-system";
import { ScreenshotResult } from "./screenshot-browser";
import { asyncTimer } from "./utils/async-timer";
import { Queue } from "./utils/queue";

type Worker = {
  createScreenshot: (story: Story) => Promise<ScreenshotResult>;
};

export function createScreenshotSystem(
  stories: Story[],
  workers: Worker[],
) {
  const fileSystem = new FileSystem();

  const queue = new Queue<Story, boolean, Worker>(
    stories,
    (story, queueController) =>
      async (worker) => {
        const [{ isSuccess, buffer }, durationTime] = await asyncTimer(
          worker.createScreenshot(story),
        );

        if (!isSuccess) {
          queueController.push(story);
          return false;
        }

        if (buffer) {
          const path = await fileSystem.saveScreenshot(story.kind, story.story, buffer);
          console.debug(`Screenshot stored: ${path} in ${durationTime} ms.`);
          return true;
        }

        return false;
      }
  );

  return {
    execute: async () => {
      const captured = await runParallel(queue.tasks.bind(queue), workers);
      return captured.filter(capture => !!capture).length;
    },
  };
}
