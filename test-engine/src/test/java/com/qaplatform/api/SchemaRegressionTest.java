package com.qaplatform.api;

import com.qaplatform.config.AppConfig;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SchemaRegressionTest {

    @Test
    @DisplayName("Sample API schema regression smoke check")
    void compareStoredSchemasAgainstLiveResponses() {
        List<Map<String, Object>> products = given()
            .baseUri(AppConfig.BASE_URL)
            .accept(ContentType.JSON)
            .when()
            .get("/api/products")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList("$");

        List<Map<String, Object>> users = given()
            .baseUri(AppConfig.BASE_URL)
            .accept(ContentType.JSON)
            .when()
            .get("/api/users")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList("$");

        assertObjectsContainKeys(products, List.of("id", "name", "price", "description"));
        assertObjectsContainKeys(users, List.of("id", "name", "email"));
    }

    private static void assertObjectsContainKeys(List<Map<String, Object>> objects, List<String> keys) {
        assertTrue(objects != null && !objects.isEmpty(), "Expected a non-empty response array");
        for (Map<String, Object> object : objects) {
            for (String key : keys) {
                assertTrue(object.containsKey(key), "Missing schema key: " + key);
            }
        }
    }
}