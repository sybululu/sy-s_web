import { type Page, type Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successToast: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel(/用户名|username/i).or(page.locator('input[name="username"]')).or(page.locator('input[type="text"]').first());
    this.emailInput = page.getByLabel(/邮箱|email/i).or(page.locator('input[type="email"]'));
    this.passwordInput = page.getByLabel(/密码|password/i).or(page.locator('input[name="password"]'));
    this.confirmPasswordInput = page.getByLabel(/确认密码|confirm.*password/i).or(page.locator('input[name="confirmPassword"], input[name="confirm"]'));
    this.submitButton = page.getByRole('button', { name: /注册|register|sign up|submit/i }).or(page.locator('button[type="submit"]'));
    this.errorMessage = page.getByRole('alert').or(page.locator('.error, .text-red'));
    this.successToast = page.locator('.toast, [role="status"], .notification');
    this.loginLink = page.getByRole('link', { name: /登录|login|sign in/i }).or(page.locator('a:has-text("登录")'));
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(username: string, email: string, password: string, confirmPassword?: string) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    if (confirmPassword) {
      await this.confirmPasswordInput.fill(confirmPassword);
    } else {
      await this.confirmPasswordInput.fill(password);
    }
    await this.submitButton.click();
  }

  async goToLogin() {
    await this.loginLink.click();
  }
}
