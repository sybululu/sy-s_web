import { type Page, type Locator } from '@playwright/test';

export class AnalysisPage {
  readonly page: Page;
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly dragDropZone: Locator;
  readonly analyzeButton: Locator;
  readonly progressIndicator: Locator;
  readonly resultsSection: Locator;
  readonly violationsList: Locator;
  readonly exportButton: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileInput = page.locator('input[type="file"]');
    this.uploadButton = page.getByRole('button', { name: /上传|upload/i }).or(page.locator('button:has-text("上传")'));
    this.dragDropZone = page.locator('.dropzone, .upload-zone, [class*="upload"]');
    this.analyzeButton = page.getByRole('button', { name: /分析|analyze/i }).or(page.locator('button:has-text("分析")'));
    this.progressIndicator = page.locator('.progress, [class*="progress"]');
    this.resultsSection = page.locator('.results, [class*="result"]');
    this.violationsList = page.locator('.violations, [class*="violation"]');
    this.exportButton = page.getByRole('button', { name: /导出|export/i }).or(page.locator('button:has-text("导出")'));
    this.loadingSpinner = page.locator('.spinner, .loading, [class*="loading"]');
    this.errorMessage = page.getByRole('alert').or(page.locator('.error, .text-red'));
  }

  async goto() {
    await this.page.goto('/analysis');
  }

  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  async analyzeFile(filePath: string) {
    await this.uploadFile(filePath);
    await this.analyzeButton.click();
  }

  async waitForResults() {
    await this.resultsSection.waitFor({ state: 'visible', timeout: 30000 });
  }

  async waitForLoading() {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 });
  }

  async exportResults(format: 'pdf' | 'docx' | 'json' = 'pdf') {
    await this.exportButton.click();
    // Wait for download to start
    await this.page.waitForTimeout(500);
  }
}
