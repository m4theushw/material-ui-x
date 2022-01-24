import { expect } from 'chai';
import * as playwright from 'playwright';

function sleep(timeoutMS: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timeoutMS);
  });
}

// A simplified version of https://github.com/testing-library/dom-testing-library/blob/main/src/wait-for.js
function waitFor(callback: () => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    let intervalId: NodeJS.Timer | null = null;
    let timeoutId: NodeJS.Timer | null = null;
    let lastError: any = null;

    function handleTimeout() {
      clearTimeout(timeoutId!);
      clearInterval(intervalId!);
      reject(lastError);
    }

    async function checkCallback() {
      try {
        await callback();
        clearTimeout(timeoutId!);
        clearInterval(intervalId!);
        resolve();
      } catch (error) {
        lastError = error;
      }
    }

    timeoutId = setTimeout(handleTimeout, 1000);
    intervalId = setTimeout(checkCallback, 50);
  });
}

/**
 * Attempts page.goto with retries
 *
 * @remarks The server and runner can be started up simultaneously
 * @param page
 * @param url
 */
async function attemptGoto(page: playwright.Page, url: string): Promise<boolean> {
  const maxAttempts = 10;
  const retryTimeoutMS = 250;

  let didNavigate = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await page.goto(url);
      didNavigate = true;
    } catch (error) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(retryTimeoutMS);
    }
  }

  return didNavigate;
}

describe('e2e', () => {
  const baseUrl = 'http://localhost:5001';
  let browser: playwright.Browser;
  let page: playwright.Page;

  async function renderFixture(fixturePath: string) {
    await page.goto(`${baseUrl}/e2e/${fixturePath}#no-dev`);
  }

  before(async function beforeHook() {
    this.timeout(20000);

    browser = await playwright.chromium.launch({
      headless: true,
    });
    page = await browser.newPage();
    const isServerRunning = await attemptGoto(page, `${baseUrl}#no-dev`);
    if (!isServerRunning) {
      throw new Error(
        `Unable to navigate to ${baseUrl} after multiple attempts. Did you forget to run \`yarn test:e2e:server\` and \`yarn test:e2e:build\`?`,
      );
    }
  });

  after(async () => {
    await browser.close();
  });

  describe('<DataGrid />', () => {
    it('should select the first column header when pressing tab key', async () => {
      await renderFixture('DataGrid/KeyboardNavigationFocus');

      expect(
        await page.evaluate(() => document.activeElement?.getAttribute('data-testid')),
      ).to.equal('initial-focus');

      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.textContent)).to.equal('brand');
    });

    it('should implement the roving tabindex pattern', async () => {
      await renderFixture('DataGrid/KeyboardNavigationFocus');

      expect(
        await page.evaluate(() => document.activeElement?.getAttribute('data-testid')),
      ).to.equal('initial-focus');
      await page.keyboard.press('Tab');
      await waitFor(async () => {
        expect(await page.evaluate(() => document.activeElement?.textContent)).to.equal('brand');
        expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).to.equal(
          'columnheader',
        );
      });
      await page.keyboard.press('ArrowDown');
      await waitFor(async () => {
        expect(await page.evaluate(() => document.activeElement?.textContent)).to.equal('Nike');
        expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).to.equal(
          'cell',
        );
      });
      await page.keyboard.press('ArrowDown');
      await waitFor(async () => {
        expect(await page.evaluate(() => document.activeElement?.textContent)).to.equal('Adidas');
        expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).to.equal(
          'cell',
        );
      });
      await page.keyboard.press('Tab');
      await waitFor(async () => {
        expect(await page.evaluate(() => document.activeElement?.textContent)).to.equal('100');
        expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).to.equal(
          'button',
        );
      });
      await page.keyboard.press('Shift+Tab');
      await waitFor(async () => {
        expect(await page.evaluate(() => document.activeElement?.textContent)).to.equal('Adidas');
        expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).to.equal(
          'cell',
        );
      });
      await page.keyboard.press('Shift+Tab');
      await waitFor(async () => {
        expect(
          await page.evaluate(() => document.activeElement?.getAttribute('data-testid')),
        ).to.equal('initial-focus');
      });
    });

    it('should display the rows', async () => {
      await renderFixture('DataGrid/ConcurrentReactUpdate');
      expect(
        await page.evaluate(() =>
          Array.from(document.querySelectorAll('[role="cell"]')).map((node) => node.textContent),
        ),
      ).to.deep.equal(['1', '2']);
    });

    it('should work with a select as the edit cell', async () => {
      await renderFixture('DataGrid/SelectEditCell');
      await page.dblclick('"Nike"');
      await page.click('"Gucci"');
      expect(
        await page.evaluate(() => {
          const selector = '[role="row"][data-rowindex="0"] [role="cell"][data-colindex="0"]';
          return document.querySelector(selector)!.textContent!;
        }),
      ).to.equal('Gucci');
    });

    it('should reorder columns by dropping into the header', async () => {
      await renderFixture('DataGrid/ColumnReorder');
      expect(
        await page.evaluate(() => document.querySelector('[role="row"]')!.textContent!),
      ).to.equal('brandyear');
      const brand = await page.$('[role="columnheader"][aria-colindex="1"] > [draggable]');
      const brandBoundingBox = await brand?.boundingBox();
      const year = await page.$('[role="columnheader"][aria-colindex="2"] > [draggable]');
      const yearBoundingBox = await year?.boundingBox();
      if (brandBoundingBox && yearBoundingBox) {
        // Based on https://stackoverflow.com/a/64746679/2801714
        await page.mouse.move(
          brandBoundingBox.x + brandBoundingBox.width / 2,
          brandBoundingBox.y + brandBoundingBox.height / 2,
          { steps: 5 },
        );
        await page.mouse.down();
        await page.mouse.move(
          yearBoundingBox.x + yearBoundingBox.width / 2,
          yearBoundingBox.y + yearBoundingBox.height / 2,
          { steps: 5 },
        );
        await page.mouse.up();
      }
      expect(
        await page.evaluate(() => document.querySelector('[role="row"]')!.textContent!),
      ).to.equal('yearbrand');
    });

    it('should reorder columns by dropping into the body', async () => {
      await renderFixture('DataGrid/ColumnReorder');
      expect(
        await page.evaluate(() => document.querySelector('[role="row"]')!.textContent!),
      ).to.equal('brandyear');
      const brand = await page.$('[role="columnheader"][aria-colindex="1"] > [draggable]');
      const brandBoundingBox = await brand?.boundingBox();
      const cell = await page.$('[role="row"][data-rowindex="0"] [role="cell"][data-colindex="1"]');
      const cellBoundingBox = await cell?.boundingBox();
      if (brandBoundingBox && cellBoundingBox) {
        // Based on https://stackoverflow.com/a/64746679/2801714
        await page.mouse.move(
          brandBoundingBox.x + brandBoundingBox.width / 2,
          brandBoundingBox.y + brandBoundingBox.height / 2,
          { steps: 5 },
        );
        await page.mouse.down();
        await page.mouse.move(
          cellBoundingBox.x + cellBoundingBox.width / 2,
          cellBoundingBox.y + cellBoundingBox.height / 2,
          { steps: 5 },
        );
        await page.mouse.up();
      }
      expect(
        await page.evaluate(() => document.querySelector('[role="row"]')!.textContent!),
      ).to.equal('yearbrand');
    });

    it('should select one row', async () => {
      await renderFixture('DataGrid/CheckboxSelection');
      await page.click('[role="row"][data-rowindex="0"] [role="cell"] input');
      expect(
        await page.evaluate(
          () => document.querySelector('[role="row"][data-rowindex="0"]')!.className!,
        ),
      ).to.contain('Mui-selected');
    });

    it('should not scroll when changing the selected row', async () => {
      await renderFixture('DataGrid/RowSelection');
      await page.click('[role="row"][data-rowindex="0"] [role="cell"]');
      await page.evaluate(() =>
        document.querySelector('[role="row"][data-rowindex="3"] [role="cell"]')!.scrollIntoView(),
      );
      const scrollTop = await page.evaluate(
        () => document.querySelector('.MuiDataGrid-virtualScroller')!.scrollTop!,
      );
      expect(scrollTop).not.to.equal(0);
      await page.click('[role="row"][data-rowindex="3"] [role="cell"]');
      expect(
        await page.evaluate(
          () => document.querySelector('.MuiDataGrid-virtualScroller')!.scrollTop!,
        ),
      ).to.equal(scrollTop);
    });

    it('should edit date cells', async () => {
      await renderFixture('DataGrid/KeyboardEditDate');

      // Edit date column
      expect(
        await page.evaluate(
          () => document.querySelector('[role="cell"][data-field="birthday"]')!.textContent!,
        ),
      ).to.equal('2/29/1984');

      // set 06/25/1986
      await page.dblclick('[role="cell"][data-field="birthday"]');
      await page.type('[role="cell"][data-field="birthday"] input', '06251986');

      await page.keyboard.press('Enter');

      expect(
        await page.evaluate(
          () => document.querySelector('[role="cell"][data-field="birthday"]')!.textContent!,
        ),
      ).to.equal('6/25/1986');

      // Edit dateTime column
      expect(
        await page.evaluate(
          () => document.querySelector('[role="cell"][data-field="lastConnection"]')!.textContent!,
        ),
      ).to.equal('2/20/2022, 6:50:00 AM');

      // start editing lastConnection
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');

      // set 01/31/2025 16:05
      await page.type('[role="cell"][data-field="lastConnection"] input', '01312025165');
      await page.keyboard.press('Enter');

      expect(
        await page.evaluate(
          () => document.querySelector('[role="cell"][data-field="lastConnection"]')!.textContent!,
        ),
      ).to.equal('1/31/2025, 4:05:00 PM');
    });

    // https://github.com/mui-org/material-ui-x/issues/3613
    it('should not lose cell focus when scrolling with arrow down', async () => {
      await renderFixture('DataGridPro/KeyboardNavigationFocus');

      async function keyDown() {
        await page.keyboard.down('ArrowDown');
        // wait between keydown events for virtualization
        await sleep(100);
      }

      await page.keyboard.down('Tab');

      await keyDown(); // 0
      await keyDown(); // 1
      await keyDown(); // 2
      await keyDown(); // 3

      expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).to.equal(
        'cell',
        'Expected cell to be focused',
      );
      expect(await page.evaluate(() => document.activeElement?.textContent)).to.equal('3');
    });
  });
});
