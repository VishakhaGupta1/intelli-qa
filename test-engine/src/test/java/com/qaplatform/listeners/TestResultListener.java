package com.qaplatform.listeners;

import com.qaplatform.models.TestResult;
import com.qaplatform.storage.MongoResultWriter;
import com.qaplatform.utils.FlakinessClassifier;
import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;
import org.junit.jupiter.api.extension.AfterTestExecutionCallback;
import org.junit.jupiter.api.extension.BeforeTestExecutionCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

public class TestResultListener implements BeforeTestExecutionCallback, AfterTestExecutionCallback, TestWatcher, ITestListener {
	private static final ExtensionContext.Namespace NAMESPACE = ExtensionContext.Namespace.create(TestResultListener.class);
	private final MongoResultWriter mongoWriter = MongoResultWriter.create();

	@Override
	public void beforeTestExecution(ExtensionContext context) {
		context.getStore(NAMESPACE).put(context.getUniqueId() + ":start", System.currentTimeMillis());
	}

	@Override
	public void afterTestExecution(ExtensionContext context) {
		// handled in watcher callbacks
	}

	@Override
	public void testSuccessful(ExtensionContext context) {
		writeResult(context, "passed", null, null);
	}

	@Override
	public void testFailed(ExtensionContext context, Throwable cause) {
		writeResult(context, "failed", cause == null ? null : cause.getMessage(), FlakinessClassifier.classify(cause == null ? null : cause.getMessage(), 1, 0));
		captureScreenshot(context);
	}

	@Override
	public void testAborted(ExtensionContext context, Throwable cause) {
		writeResult(context, "skipped", cause == null ? null : cause.getMessage(), null);
	}

	private void writeResult(ExtensionContext context, String status, String failureMessage, String failureType) {
		Long start = context.getStore(NAMESPACE).remove(context.getUniqueId() + ":start", Long.class);
		long duration = System.currentTimeMillis() - (start == null ? System.currentTimeMillis() : start);
		String layer = context.getRequiredTestClass().getSimpleName().toLowerCase().contains("ui") ? "ui" : "api";
		TestResult result = TestResult.of(context.getDisplayName(), layer, status, duration);
		result.setTags(List.of(layer));
		result.setFailureMessage(failureMessage);
		result.setFailureType(failureType);
		result.setEndpoint(resolveEndpoint(context));
		if (mongoWriter != null) {
			mongoWriter.writeResult(result);
		}
	}

	private void writeResult(String testName, String layer, String status, long duration, String failureMessage, String failureType, String endpoint) {
		TestResult result = TestResult.of(testName, layer, status, duration);
		result.setTags(List.of(layer));
		result.setFailureMessage(failureMessage);
		result.setFailureType(failureType);
		result.setEndpoint(endpoint);
		mongoWriter.writeResult(result);
	}

	private String resolveEndpoint(ExtensionContext context) {
		Optional<Object> testInstance = context.getTestInstance();
		if (testInstance.isEmpty()) {
			return null;
		}

		try {
			java.lang.reflect.Field field = findField(testInstance.get().getClass(), "currentEndpoint");
			if (field == null) {
				return null;
			}
			field.setAccessible(true);
			Object value = field.get(testInstance.get());
			return value == null ? null : value.toString();
		} catch (Exception ignored) {
			return null;
		}
	}

	private void captureScreenshot(ExtensionContext context) {
		Optional<Object> testInstance = context.getTestInstance();
		if (testInstance.isEmpty()) {
			return;
		}

		try {
			java.lang.reflect.Field field = findField(testInstance.get().getClass(), "driver");
			if (field == null) {
				return;
			}
			field.setAccessible(true);
			Object value = field.get(testInstance.get());
			if (!(value instanceof WebDriver driver) || !(driver instanceof TakesScreenshot screenshot)) {
				return;
			}

			File source = screenshot.getScreenshotAs(OutputType.FILE);
			Path targetDir = Path.of("test-output", "screenshots");
			Files.createDirectories(targetDir);
			String safeName = context.getDisplayName().replaceAll("[^a-zA-Z0-9._-]", "_");
			Path target = targetDir.resolve(context.getRequiredTestClass().getSimpleName() + "-" + safeName + ".png");
			Files.copy(source.toPath(), target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
		} catch (Exception ignored) {
		}
	}

	private java.lang.reflect.Field findField(Class<?> type, String name) {
		Class<?> current = type;
		while (current != null) {
			try {
				return current.getDeclaredField(name);
			} catch (NoSuchFieldException ignored) {
				current = current.getSuperclass();
			}
		}
		return null;
	}

	@Override
	public void onTestStart(ITestResult result) {
		result.setAttribute("start", System.currentTimeMillis());
	}

	@Override
	public void onTestSuccess(ITestResult result) {
		writeFromTestNG(result, "passed", null, null);
	}

	@Override
	public void onTestFailure(ITestResult result) {
		Throwable throwable = result.getThrowable();
		writeFromTestNG(result, "failed", throwable == null ? null : throwable.getMessage(), FlakinessClassifier.classify(throwable == null ? null : throwable.getMessage(), 1, 0));
	}

	@Override
	public void onTestSkipped(ITestResult result) {
		Throwable throwable = result.getThrowable();
		writeFromTestNG(result, "skipped", throwable == null ? null : throwable.getMessage(), null);
	}

	private void writeFromTestNG(ITestResult result, String status, String failureMessage, String failureType) {
		long start = result.getAttribute("start") instanceof Long value ? value : System.currentTimeMillis();
		long duration = System.currentTimeMillis() - start;
		String layer = result.getTestClass().getRealClass().getSimpleName().toLowerCase().contains("ui") ? "ui" : "api";
		String endpoint = null;
		Object instance = result.getInstance();
		if (instance != null) {
			try {
				java.lang.reflect.Field field = findField(instance.getClass(), "currentEndpoint");
				if (field != null) {
					field.setAccessible(true);
					Object value = field.get(instance);
					endpoint = value == null ? null : value.toString();
				}
			} catch (Exception ignored) {
			}
		}
		writeResult(result.getName(), layer, status, duration, failureMessage, failureType, endpoint);
	}

	@Override public void onStart(ITestContext context) { }
	@Override public void onFinish(ITestContext context) { }
	@Override public void onTestFailedButWithinSuccessPercentage(ITestResult result) { }
}
