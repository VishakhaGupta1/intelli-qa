package com.qaplatform.storage;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.qaplatform.config.AppConfig;
import com.qaplatform.models.DefectLog;
import com.qaplatform.models.TestResult;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.TimeUnit;

public class MongoResultWriter {
	private static final Logger LOGGER = LoggerFactory.getLogger(MongoResultWriter.class);
	private final MongoCollection<Document> resultsCollection;
	private final MongoCollection<Document> defectsCollection;
	private final boolean available;

	private MongoResultWriter(MongoCollection<Document> resultsCollection, MongoCollection<Document> defectsCollection, boolean available) {
		this.resultsCollection = resultsCollection;
		this.defectsCollection = defectsCollection;
		this.available = available;
	}

	public void writeResult(TestResult result) {
		if (!available || resultsCollection == null) {
			LOGGER.warn("MongoDB unavailable; skipping test result write for {}", result.getTestName());
			return;
		}
		try {
			Document document = new Document()
				.append("testName", result.getTestName())
				.append("endpoint", result.getEndpoint())
				.append("layer", result.getLayer())
				.append("status", result.getStatus())
				.append("duration", result.getDuration())
				.append("failureMessage", result.getFailureMessage())
				.append("failureType", result.getFailureType())
				.append("runId", result.getRunId())
				.append("runAt", result.getRunAt())
				.append("tags", result.getTags());
			resultsCollection.insertOne(document);
		} catch (Exception e) {
			LOGGER.error("Failed to write test result", e);
		}
	}

	public void writeDefect(DefectLog defect) {
		if (!available || defectsCollection == null) {
			LOGGER.warn("MongoDB unavailable; skipping defect write for {}", defect.getEndpoint());
			return;
		}
		try {
			Document document = new Document()
				.append("endpoint", defect.getEndpoint())
				.append("httpMethod", defect.getHttpMethod())
				.append("description", defect.getDescription())
				.append("severity", defect.getSeverity())
				.append("status", defect.getStatus())
				.append("expected", defect.getExpected())
				.append("actual", defect.getActual())
				.append("detectedAt", defect.getDetectedAt())
				.append("resolvedAt", defect.getResolvedAt());
			defectsCollection.insertOne(document);
		} catch (Exception e) {
			LOGGER.error("Failed to write defect", e);
		}
	}

	public static MongoResultWriter create() {
		Exception lastFailure = null;
		for (int attempt = 0; attempt < 3; attempt++) {
			MongoClient mongoClient = null;
			try {
				mongoClient = MongoClients.create(AppConfig.MONGO_URI);
				MongoDatabase database = mongoClient.getDatabase(AppConfig.MONGO_DB);
				database.listCollectionNames().first();
				return new MongoResultWriter(
					database.getCollection("test_results"),
					database.getCollection("defect_logs"),
					true);
			} catch (Exception e) {
				lastFailure = e;
				LOGGER.warn("MongoDB connection attempt {} failed for {}", attempt + 1, AppConfig.MONGO_URI, e);
				if (mongoClient != null) {
					try {
						mongoClient.close();
					} catch (Exception closeFailure) {
						LOGGER.warn("Failed to close MongoClient after connection failure", closeFailure);
					}
				}
				if (attempt < 2) {
					try {
						TimeUnit.MILLISECONDS.sleep(1000L << attempt);
					} catch (InterruptedException interruptedException) {
						Thread.currentThread().interrupt();
						break;
					}
				}
			}
		}
		LOGGER.warn("MongoDB unavailable after retries; continuing with no-op writer: {}", lastFailure == null ? "unknown error" : lastFailure.getMessage());
		return new MongoResultWriter(null, null, false);
	}
}
