import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel(/用户名|username/i).or(page.locator('input[name="username"]')).or(page.locator('input[type="text"]').first());
    this.passwordInput = page.getByLabel(/密码|password/i).or(page.locator('input[name="password"]')).or(page.locator('input[type="password"]'));
    this.submitButton = page.getByRole('button', { name: /登录|sign in|submit/i }).or(page.locator('button[type="submit"]'));
    this.registerLink = page.getByRole('link', { name: /注册|register|sign up/i }).or(page.locator('a:has-text("注册")'));
    this.errorMessage = page.getByRole('alert').or(page.locator('.error, .text-red'));
    this.successToast = page.locator('.toast, [role="status"], .notification');
  }

  async goto() {
    await this.page.goto('/');
  }

  async gotoLogin() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async goToRegister() {
    await this.registerLink.click();
  }
}
