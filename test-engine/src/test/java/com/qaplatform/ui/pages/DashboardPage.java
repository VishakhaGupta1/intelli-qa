package com.qaplatform.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.util.List;

public class DashboardPage extends BasePage {
	private final By PRODUCT_GRID = By.cssSelector("#tbodyid .card");
	private final By PRODUCT_LINKS = By.cssSelector("#tbodyid .card-title a");

	public DashboardPage(WebDriver driver) {
		super(driver);
	}

	public boolean isLoaded() {
		return isDisplayed(PRODUCT_GRID);
	}

	public String getFirstProductName() {
		return getText(PRODUCT_LINKS);
	}

	public boolean hasProducts() {
		return !driver.findElements(PRODUCT_LINKS).isEmpty();
	}

	public void openProductByName(String productName) {
		List<WebElement> products = wait.until(ExpectedConditions.visibilityOfAllElementsLocatedBy(PRODUCT_LINKS));
		for (WebElement product : products) {
			if (productName.equals(product.getText())) {
				clickJs(product);
				return;
			}
		}
		throw new IllegalArgumentException("Product not found: " + productName);
	}
}
