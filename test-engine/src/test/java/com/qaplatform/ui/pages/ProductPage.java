package com.qaplatform.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.util.List;

public class ProductPage extends BasePage {
	private final By PRODUCT_TITLE = By.cssSelector(".name");
	private final By PRODUCT_PRICE = By.cssSelector(".price-container");
	private final By ADD_TO_CART = By.linkText("Add to cart");
	private final By PRODUCT_DETAIL = By.cssSelector("#tbodyid .name");

	public ProductPage(WebDriver driver) {
		super(driver);
	}

	public boolean isLoaded() {
		return isDisplayed(PRODUCT_DETAIL);
	}

	public String getProductTitle() {
		return getText(PRODUCT_TITLE);
	}

	public void addToCartByName(String productName) {
		if (!productName.equals(getProductTitle())) {
			throw new IllegalArgumentException("Unexpected product page: " + getProductTitle());
		}
		WebElement addButton = wait.until(ExpectedConditions.elementToBeClickable(ADD_TO_CART));
		((JavascriptExecutor) driver).executeScript("arguments[0].click();", addButton);
		wait.until(ExpectedConditions.alertIsPresent()).accept();
	}

	public void removeFromCartByName(String productName) {
		throw new UnsupportedOperationException("Demoblaze flow uses cart removal from the cart page only.");
	}
}
