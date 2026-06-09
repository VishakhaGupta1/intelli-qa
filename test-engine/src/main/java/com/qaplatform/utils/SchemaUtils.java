package com.qaplatform.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;

public final class SchemaUtils {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private SchemaUtils() {
    }

    public static Map<String, String> inferSchema(String json) {
        try {
            JsonNode node = MAPPER.readTree(json == null || json.isBlank() ? "{}" : json);
            Map<String, String> schema = new LinkedHashMap<>();
            flatten(node, "", schema);
            if (schema.isEmpty()) {
                schema.put("value", typeOf(node));
            }
            return schema;
        } catch (Exception e) {
            Map<String, String> fallback = new LinkedHashMap<>();
            fallback.put("raw", "string");
            return fallback;
        }
    }

    public static String describeDiff(Map<String, String> previous, Map<String, String> current) {
        StringBuilder builder = new StringBuilder();
        for (Map.Entry<String, String> entry : previous.entrySet()) {
            String field = entry.getKey();
            String oldType = entry.getValue();
            String newType = current.get(field);
            if (newType == null) {
                builder.append("field ").append(field).append(" was removed; ");
            } else if (!oldType.equals(newType)) {
                builder.append("field ").append(field).append(" changed from ")
                    .append(oldType).append(" to ").append(newType).append("; ");
            }
        }
        return builder.toString().trim();
    }

    private static void flatten(JsonNode node, String prefix, Map<String, String> schema) {
        if (node == null || node.isNull()) {
            schema.put(prefix.isEmpty() ? "value" : prefix, "null");
            return;
        }

        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                String childPrefix = prefix.isEmpty() ? entry.getKey() : prefix + "." + entry.getKey();
                flatten(entry.getValue(), childPrefix, schema);
            });
            return;
        }

        if (node.isArray()) {
            schema.put(prefix.isEmpty() ? "items" : prefix, "array");
            if (node.size() > 0) {
                flatten(node.get(0), prefix.isEmpty() ? "items[0]" : prefix + "[0]", schema);
            }
            return;
        }

        schema.put(prefix.isEmpty() ? "value" : prefix, typeOf(node));
    }

    private static String typeOf(JsonNode node) {
        if (node == null || node.isNull()) {
            return "null";
        }
        if (node.isTextual()) return "string";
        if (node.isInt() || node.isLong()) return "integer";
        if (node.isFloat() || node.isDouble() || node.isBigDecimal()) return "number";
        if (node.isBoolean()) return "boolean";
        if (node.isArray()) return "array";
        if (node.isObject()) return "object";
        return "unknown";
    }
}