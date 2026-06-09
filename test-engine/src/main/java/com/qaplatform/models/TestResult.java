package com.qaplatform.models;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class TestResult {
	private String testName;
	private String endpoint;
	private String layer;
	private String status;
	private long duration;
	private String failureMessage;
	private String failureType;
	private String runId;
	private String runAt;
	private List<String> tags;

	public static TestResult of(String testName, String layer, String status, long duration) {
		TestResult result = new TestResult();
		result.testName = testName;
		result.layer = layer;
		result.status = status;
		result.duration = duration;
		result.runId = UUID.randomUUID().toString();
		result.runAt = Instant.now().toString();
		result.tags = new ArrayList<>();
		return result;
	}

	public String getEndpoint() {
		return endpoint;
	}

	public void setEndpoint(String endpoint) {
		this.endpoint = endpoint;
	}

	public String getTestName() {
		return testName;
	}

	public void setTestName(String testName) {
		this.testName = testName;
	}

	public String getLayer() {
		return layer;
	}

	public void setLayer(String layer) {
		this.layer = layer;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public long getDuration() {
		return duration;
	}

	public void setDuration(long duration) {
		this.duration = duration;
	}

	public String getFailureMessage() {
		return failureMessage;
	}

	public void setFailureMessage(String failureMessage) {
		this.failureMessage = failureMessage;
	}

	public String getFailureType() {
		return failureType;
	}

	public void setFailureType(String failureType) {
		this.failureType = failureType;
	}

	public String getRunId() {
		return runId;
	}

	public void setRunId(String runId) {
		this.runId = runId;
	}

	public String getRunAt() {
		return runAt;
	}

	public void setRunAt(String runAt) {
		this.runAt = runAt;
	}

	public List<String> getTags() {
		return tags;
	}

	public void setTags(List<String> tags) {
		this.tags = tags;
	}
}
