import type { Story } from './types';

import { ScreenshotBrowser } from './screenshot-browser';
import { createScreenshotSystem } from './screenshot-system';
import { StoryStoreBrowser } from './story-store-browser';
import { StorybookConnection } from './storybook-connection';

type Options = {
  storybookUrl: string;
};

export async function main({ storybookUrl }: Options) {
  const storybookConnection = new StorybookConnection({ storybookUrl });
  await storybookConnection.connect();
  console.debug('Created to connection.');

  const storiesBrowser = new StoryStoreBrowser(storybookConnection);
  await storiesBrowser.boot();
  const stories = await storiesBrowser.getStories();

  if (!stories) {
    throw new Error('Failed to get stories.');
  }

  console.debug(`Found ${stories.length} stories.`);
  storiesBrowser.close();

  const screenshotBrowser = new ScreenshotBrowser(storybookConnection);
  await screenshotBrowser.boot();

  const parallel = 4;
  const workers = await Promise.all(
    [...new Array(parallel).keys()].map(async () => {
      const page = await screenshotBrowser.createPage();

      return {
        createScreenshot: (story: Story) =>
          screenshotBrowser.createScreenshot(page, story),
      };
    })
  );

  const screenshotSystem = createScreenshotSystem(stories, workers);

  const capturedCount = await screenshotSystem.execute();

  return capturedCount;
}
