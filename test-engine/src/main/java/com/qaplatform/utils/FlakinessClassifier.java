package com.qaplatform.utils;

public class FlakinessClassifier {
    private FlakinessClassifier() {
    }

    public static String classify(String failureMessage, int failCount, int passCount) {
        if (failureMessage == null || failureMessage.isEmpty()) {
            return "REAL_BUG";
        }

        String msg = failureMessage.toLowerCase();

        if (msg.contains("connection refused")
            || msg.contains("timeout")
            || msg.contains("socket")
            || msg.contains("unreachable")
            || msg.contains("connect timed out")) {
            return "INFRASTRUCTURE";
        }

        if (msg.contains("staleelementreference")
            || msg.contains("nosuchelement")
            || msg.contains("element not interactable")
            || msg.contains("element is not clickable")) {
            return "TIMING";
        }

        if (failCount > 1 && passCount > 0) {
            return "TIMING";
        }

        return "REAL_BUG";
    }
}
