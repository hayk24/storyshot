import type { Browser, BrowserContext, Page } from 'playwright';
import type { Story } from './types';

import { chromium } from 'playwright';
import { StorybookConnection } from './storybook-connection';

export type ScreenshotResult = {
  buffer: Buffer | null;
  isSuccess: boolean;
};

export class ScreenshotBrowser {
  private connection: StorybookConnection;
  private browser!: Browser;
  public context!: BrowserContext;
  private url!: string;

  constructor(connection: StorybookConnection) {
    this.connection = connection;
  }

  async boot() {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    return this;
  }

  async createPage() {
    const page = await this.context.newPage();
    await this.navigateStoryIFrame(page);
    return page;
  }

  async createScreenshot(page: Page, story: Story): Promise<ScreenshotResult> {
    await this.setStoryOnStoryIframe(page, story);
    await page.waitForLoadState('load');
    return await this.screenshot(page);
  }

  private async navigateStoryIFrame(page: Page) {
    const { url: baseUrl } = this.connection;
    this.url = `${baseUrl}/iframe.html`;

    await page.goto(this.url, {
      timeout: 10_000,
      waitUntil: 'load',
    });
  }

  private createPostMessageData(story: Story) {
    return {
      key: 'storybook-channel',
      event: {
        type: 'setCurrentStory',
        args: [
          {
            storyId: story.id,
          },
        ],
      },
    };
  }

  private async setStoryOnStoryIframe(page: Page, story: Story) {
    if (!page.url().includes('iframe.html')) {
      throw new Error('Not in iframe');
    }

    const data = this.createPostMessageData(story);

    await page.evaluate((_data: typeof data) => {
      window.postMessage(JSON.stringify(_data), '*');
    }, data);
  }

  private async screenshot(page: Page): Promise<ScreenshotResult> {
    try {
      const rawBuffer = await page.screenshot({
        fullPage: true,
        omitBackground: false,
        animations: 'disabled',
      });

      if (!Buffer.isBuffer(rawBuffer)) {
        throw new Error('Failed to capture screenshot');
      }

      return {
        buffer: rawBuffer,
        isSuccess: true,
      };
    } catch (error) {
      console.error(error);

      return {
        buffer: null,
        isSuccess: false,
      };
    }
  }
}
