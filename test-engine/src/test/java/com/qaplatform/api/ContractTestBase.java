package com.qaplatform.api;

import com.qaplatform.config.AppConfig;
import com.qaplatform.storage.MongoResultWriter;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.extension.ExtendWith;

import com.qaplatform.listeners.TestResultListener;

@ExtendWith(TestResultListener.class)

public abstract class ContractTestBase {
	protected RequestSpecification requestSpec;
	protected MongoResultWriter mongoWriter;
	protected String currentEndpoint;
	private long startTime;
	private String currentTestName;

	@BeforeEach
	void setUp(TestInfo testInfo) {
		requestSpec = RestAssured.given()
			.baseUri(AppConfig.BASE_URL)
			.contentType(ContentType.JSON)
			.header("Accept", "application/json");

		startTime = System.currentTimeMillis();
		currentTestName = testInfo.getDisplayName();
		currentEndpoint = testInfo.getDisplayName();
		mongoWriter = MongoResultWriter.create();
	}

	@AfterEach
	void tearDown(TestInfo testInfo) {
	}

	protected void setCurrentEndpoint(String endpoint) {
		this.currentEndpoint = endpoint;
	}
}
