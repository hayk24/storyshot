import type { StorybookConnection } from './storybook-connection';
import type { Story } from './types';

import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { sleep } from './utils/sleep';

type API = {
  storyStore?: {
    cacheAllCSFFiles: () => Promise<void>;
    cachedCSFFiles?: Record<string, unknown>;
  };
  raw?: () => { id: string; kind: string; name: string }[];
};

type PreviewAPI = {
  storyStoreValue?: {
    cacheAllCSFFiles: () => Promise<void>;
    cachedCSFFiles?: Record<string, unknown>;
    extract: () => Record<string, { id: string; kind: string; name: string }>;
  };
} & API;

type WindowInIframe = typeof window & {
  __STORYBOOK_CLIENT_API__?: API;
  __STORYBOOK_PREVIEW__?: PreviewAPI;
};

export class StoryStoreBrowser {
  private connection: StorybookConnection;
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;

  constructor(connection: StorybookConnection) {
    this.connection = connection;
  }

  async boot() {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    return this;
  }

  async close() {
    await sleep(100);
    await this.page.close();
    await this.context.close();
    await this.browser.close();
  }

  async getStories() {
    const { url: baseUrl } = this.connection;
    const url = `${baseUrl}/iframe.html`;

    await this.page.goto(url);
    await this.page.waitForURL(url);
    await this.page.evaluate(this.cacheCsfFiles);
    const { stories } = await this.page.evaluate(this.recursiveGetStories);
    return stories;
  }

  private cacheCsfFiles() {
    const api =
      (window as WindowInIframe).__STORYBOOK_CLIENT_API__ ||
      (window as WindowInIframe).__STORYBOOK_PREVIEW__;

    function isPreviewApi(api: PreviewAPI): api is PreviewAPI {
      return api.storyStoreValue !== undefined;
    }

    if (api === undefined) {
      return;
    }

    if (isPreviewApi(api)) {
      return api.storyStoreValue && api.storyStoreValue.cacheAllCSFFiles();
    }

    return (
      api.storyStore?.cacheAllCSFFiles && api.storyStore.cacheAllCSFFiles()
    );
  }

  private recursiveGetStories(): Promise<{
    stories: Story[];
    timeout: boolean;
  }> {
    function isPreviewApi(api: API | PreviewAPI): api is PreviewAPI {
      return (api as PreviewAPI).storyStoreValue !== undefined;
    }

    return new Promise<{ stories: Story[]; timeout: boolean }>((resolve) => {
      const recursiveGetStories = (count = 0) => {
        const MAX_CONFIGURE_WAIT_COUNT = 4_000;
        const api = ((window as WindowInIframe).__STORYBOOK_CLIENT_API__ ||
          (window as WindowInIframe).__STORYBOOK_PREVIEW__)!;

        const configuringStore =
          isPreviewApi(api) &&
          api.storyStoreValue &&
          !api.storyStoreValue.cachedCSFFiles;

        if (configuringStore) {
          if (count < MAX_CONFIGURE_WAIT_COUNT) {
            setTimeout(() => recursiveGetStories(++count), 16);
          } else {
            resolve({ stories: [], timeout: true });
          }

          return;
        }

        const stories = (
          isPreviewApi(api) && api.storyStoreValue
            ? Object.values(api.storyStoreValue.extract())
            : api.raw
              ? api.raw()
              : []
        ).map<Story>(({ id, kind, name }) => ({
          id,
          kind,
          story: name,
          version: 'v5',
        }));

        resolve({ stories, timeout: false });
      };

      recursiveGetStories();
    });
  }
}
