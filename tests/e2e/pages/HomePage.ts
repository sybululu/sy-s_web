import { type Page, type Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly title: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly heroSection: Locator;
  readonly featuresSection: Locator;
  readonly navigationMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1, [class*="title"]').first();
    this.loginButton = page.getByRole('button', { name: /登录|login/i }).or(page.getByRole('link', { name: /登录|login/i })).or(page.locator('a:has-text("登录")'));
    this.registerButton = page.getByRole('button', { name: /注册|register/i }).or(page.getByRole('link', { name: /注册|register/i })).or(page.locator('a:has-text("注册")'));
    this.heroSection = page.locator('[class*="hero"], section:first-of-type');
    this.featuresSection = page.locator('[class*="feature"], section:nth-of-type(2)');
    this.navigationMenu = page.locator('nav, header');
  }

  async goto() {
    await this.page.goto('/');
  }

  async goToLogin() {
    await this.loginButton.click();
  }

  async goToRegister() {
    await this.registerButton.click();
  }
}
