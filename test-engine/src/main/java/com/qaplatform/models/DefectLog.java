package com.qaplatform.models;

import java.time.Instant;

public class DefectLog {
	private String endpoint;
	private String httpMethod;
	private String description;
	private String severity;
	private String status;
	private String expected;
	private String actual;
	private String detectedAt;
	private String resolvedAt;

	public static DefectLog open(String endpoint, String method, String description, String severity, String expected, String actual) {
		DefectLog defectLog = new DefectLog();
		defectLog.endpoint = endpoint;
		defectLog.httpMethod = method;
		defectLog.description = description;
		defectLog.severity = severity;
		defectLog.expected = expected;
		defectLog.actual = actual;
		defectLog.status = "open";
		defectLog.detectedAt = Instant.now().toString();
		defectLog.resolvedAt = null;
		return defectLog;
	}

	public String getEndpoint() {
		return endpoint;
	}

	public void setEndpoint(String endpoint) {
		this.endpoint = endpoint;
	}

	public String getHttpMethod() {
		return httpMethod;
	}

	public void setHttpMethod(String httpMethod) {
		this.httpMethod = httpMethod;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getSeverity() {
		return severity;
	}

	public void setSeverity(String severity) {
		this.severity = severity;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getExpected() {
		return expected;
	}

	public void setExpected(String expected) {
		this.expected = expected;
	}

	public String getActual() {
		return actual;
	}

	public void setActual(String actual) {
		this.actual = actual;
	}

	public String getDetectedAt() {
		return detectedAt;
	}

	public void setDetectedAt(String detectedAt) {
		this.detectedAt = detectedAt;
	}

	public String getResolvedAt() {
		return resolvedAt;
	}

	public void setResolvedAt(String resolvedAt) {
		this.resolvedAt = resolvedAt;
	}
}
