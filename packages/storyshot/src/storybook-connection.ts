import ky from 'ky';

export class StorybookConnection {
  private storybookUrl: string;

  constructor({ storybookUrl }: {
    storybookUrl: string;
  }) {
    this.storybookUrl = storybookUrl;
  }

  get url() {
    return this.storybookUrl;
  }

  async connect() {
    const { storybookUrl } = this;

    if (!storybookUrl.startsWith('http')) {
      throw new Error('Invalid URL');
    }
  
    const interval = 1000;
    const maxAttempts = 10_000 / interval;
    let attempts = 0;

    const checkServer = async () => {
      try {
        await ky.get(storybookUrl);
      } catch (error) {
        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for server');
        } else {
          attempts++;
          setTimeout(checkServer, interval);
        }
      }
    };

    await checkServer();

    return this;
  }
}
