package com.qaplatform.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class BasePage {
	protected WebDriver driver;
	protected WebDriverWait wait;

	public BasePage(WebDriver driver) {
		this.driver = driver;
		this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
	}

	protected WebElement waitForElement(By locator) {
		return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
	}

	protected void click(By locator) {
		waitForElement(locator).click();
	}

	protected void clickJs(By locator) {
		WebElement element = wait.until(ExpectedConditions.presenceOfElementLocated(locator));
		((org.openqa.selenium.JavascriptExecutor) driver).executeScript("arguments[0].click();", element);
	}

	protected void clickJs(WebElement element) {
		((org.openqa.selenium.JavascriptExecutor) driver).executeScript("arguments[0].click();", element);
	}

	protected void type(By locator, String text) {
		WebElement element = waitForElement(locator);
		element.clear();
		element.sendKeys(text);
	}

	protected String getText(By locator) {
		return waitForElement(locator).getText();
	}

	protected boolean isDisplayed(By locator) {
		try {
			return driver.findElement(locator).isDisplayed();
		} catch (Exception e) {
			return false;
		}
	}

	protected WebElement waitForClickable(By locator) {
		return wait.until(ExpectedConditions.elementToBeClickable(locator));
	}
}
