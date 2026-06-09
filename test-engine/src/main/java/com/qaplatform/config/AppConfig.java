package com.qaplatform.config;

public class AppConfig {
	public static final String BASE_URL = System.getenv("BASE_URL") != null ? System.getenv("BASE_URL") : "http://localhost:4000";
	public static final String UI_BASE_URL = System.getenv("UI_BASE_URL") != null ? System.getenv("UI_BASE_URL") : "https://www.demoblaze.com";
	public static final String MONGO_URI = System.getenv("MONGO_URI") != null ? System.getenv("MONGO_URI") : "mongodb://127.0.0.1:27017/qa_platform";
	public static final String MONGO_DB = System.getenv("MONGO_DB_NAME") != null ? System.getenv("MONGO_DB_NAME") : "qa_platform";
	public static final boolean HEADLESS = System.getenv("HEADLESS") == null || System.getenv("HEADLESS").isBlank() || Boolean.parseBoolean(System.getenv("HEADLESS"));
	public static final String SELENIUM_REMOTE_URL = System.getenv("SELENIUM_REMOTE_URL");

	private AppConfig() {
	}
}
