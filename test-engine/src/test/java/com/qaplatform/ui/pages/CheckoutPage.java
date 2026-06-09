package com.qaplatform.ui.pages;

import com.qaplatform.config.AppConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class CheckoutPage extends BasePage {
	private final By CART_ROWS = By.cssSelector("#tbodyid tr");
	private final By CART_EMPTY = By.id("tbodyid");

	public CheckoutPage(WebDriver driver) {
		super(driver);
	}

	public void goToCart() {
		driver.get(AppConfig.UI_BASE_URL + "/cart.html");
		wait.until(ExpectedConditions.visibilityOfElementLocated(CART_EMPTY));
	}

	public int getCartItemCount() {
		return driver.findElements(CART_ROWS).size();
	}

	public boolean isCartNotEmpty() {
		return getCartItemCount() > 0;
	}
}
