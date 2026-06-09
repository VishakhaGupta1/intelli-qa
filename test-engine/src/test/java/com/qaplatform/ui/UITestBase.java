package com.qaplatform.ui;

import com.qaplatform.config.AppConfig;
import com.qaplatform.storage.MongoResultWriter;
import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.net.URL;
import java.time.Duration;

import com.qaplatform.listeners.TestResultListener;

@ExtendWith(TestResultListener.class)

public abstract class UITestBase {
	protected WebDriver driver;
	protected MongoResultWriter mongoWriter;
	protected String currentEndpoint;
	private long startTime;

	@BeforeEach
	void setUp(TestInfo testInfo) {
		ChromeOptions options = new ChromeOptions();
		if (AppConfig.HEADLESS) {
			options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
		}
		String seleniumRemoteUrl = System.getenv("SELENIUM_REMOTE_URL");
		if (seleniumRemoteUrl != null && !seleniumRemoteUrl.isBlank()) {
			try {
				driver = new RemoteWebDriver(new URL(seleniumRemoteUrl), options);
			} catch (Exception e) {
				throw new RuntimeException("Failed to create remote Selenium WebDriver", e);
			}
		} else {
			WebDriverManager.chromedriver().setup();
			driver = new ChromeDriver(options);
		}
		driver.manage().window().maximize();
		driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
		currentEndpoint = testInfo.getDisplayName();
		mongoWriter = MongoResultWriter.create();
		startTime = System.currentTimeMillis();
	}

	@AfterEach
	void tearDown(TestInfo testInfo) {
		if (driver != null) {
			driver.quit();
		}
	}
}
