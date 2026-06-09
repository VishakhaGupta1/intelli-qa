package com.qaplatform.ui.pages;

import com.qaplatform.config.AppConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage extends BasePage {
	private final By STORE_TITLE = By.cssSelector("#nava, .navbar-brand");
	private final By LOGIN_LINK = By.cssSelector("a.nav-link[data-target='#logInModal'], a[href='#']");
	private final By LOGIN_MODAL = By.id("logInModal");
	private final By USERNAME = By.id("loginusername");
	private final By PASSWORD = By.id("loginpassword");
	private final By LOGIN_BUTTON = By.cssSelector("button[onclick='logIn()']");

	public LoginPage(WebDriver driver) {
		super(driver);
	}

	public void navigate() {
		driver.get(AppConfig.UI_BASE_URL);
	}

	public boolean isLoaded() {
		return isDisplayed(STORE_TITLE);
	}

	public void openLoginModal() {
		clickJs(LOGIN_LINK);
		waitForElement(LOGIN_MODAL);
	}

	public void login(String username, String password) {
		openLoginModal();
		type(USERNAME, username);
		type(PASSWORD, password);
		clickJs(LOGIN_BUTTON);
	}
}
