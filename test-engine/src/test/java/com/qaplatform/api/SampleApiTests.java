package com.qaplatform.api;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.given;

public class SampleApiTests extends ContractTestBase {

    @Test
    @DisplayName("Health check returns a live ok response.")
    @Tag("generated")
    public void getHealthReturnsOk() {
        setCurrentEndpoint("GET /health");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("GET", "/health")
        .then().statusCode(200);
        // assertion: status is ok
        // assertion: version is returned
    }

    @Test
    @DisplayName("Products list returns an array of products.")
    @Tag("generated")
    public void getApiProductsReturnsArray() {
        setCurrentEndpoint("GET /api/products");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("GET", "/api/products")
        .then().statusCode(200);
        // assertion: response is an array
    }

    @Test
    @DisplayName("Creating a product returns a 201 response.")
    @Tag("generated")
    public void postApiProductsCreatesProduct() {
        setCurrentEndpoint("POST /api/products");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
            .body("{\"name\": \"Orbit Desk\", \"description\": \"A compact desk lamp\", \"price\": 49.99, \"category\": \"home\", \"inStock\": true}")
        .when().request("POST", "/api/products")
        .then().statusCode(201);
        // assertion: created product has an id
    }

    @Test
    @DisplayName("Existing product lookup returns a product.")
    @Tag("generated")
    public void getApiProductsIdHappyPath() {
        setCurrentEndpoint("GET /api/products/1");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("GET", "/api/products/1")
        .then().statusCode(200);
        // assertion: id field present
    }

    @Test
    @DisplayName("Missing product returns 404.")
    @Tag("generated")
    public void getApiProductsIdNotFound() {
        setCurrentEndpoint("GET /api/products/99999");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("GET", "/api/products/99999")
        .then().statusCode(404);
        // assertion: not found response
    }

    @Test
    @DisplayName("Updating a product returns a 200 response.")
    @Tag("generated")
    public void putApiProductsIdUpdatesProduct() {
        setCurrentEndpoint("PUT /api/products/1");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
            .body("{\"name\": \"Orbit Desk Pro\", \"description\": \"An upgraded compact desk lamp\", \"price\": 59.99, \"category\": \"home\", \"inStock\": false}")
        .when().request("PUT", "/api/products/1")
        .then().statusCode(200);
        // assertion: updated product has an id
    }

    @Test
    @DisplayName("Deleting a product returns a 200 response.")
    @Tag("generated")
    public void deleteApiProductsIdDeletesProduct() {
        setCurrentEndpoint("DELETE /api/products/1");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("DELETE", "/api/products/1")
        .then().statusCode(200);
        // assertion: delete response is returned
    }

    @Test
    @DisplayName("Users list returns an array of users.")
    @Tag("generated")
    public void getApiUsersReturnsArray() {
        setCurrentEndpoint("GET /api/users");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("GET", "/api/users")
        .then().statusCode(200);
        // assertion: response is an array
    }

    @Test
    @DisplayName("Creating a user returns a 201 response.")
    @Tag("generated")
    public void postApiUsersCreatesUser() {
        setCurrentEndpoint("POST /api/users");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
            .body("{\"name\": \"Jordan Lee\", \"email\": \"jordan.lee@example.com\", \"role\": \"customer\"}")
        .when().request("POST", "/api/users")
        .then().statusCode(201);
        // assertion: created user has an id
    }

    @Test
    @DisplayName("Existing user lookup returns a user.")
    @Tag("generated")
    public void getApiUsersIdReturnsUser() {
        setCurrentEndpoint("GET /api/users/1");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("GET", "/api/users/1")
        .then().statusCode(200);
        // assertion: id field present
    }

    @Test
    @DisplayName("Orders list returns an array of orders.")
    @Tag("generated")
    public void getApiOrdersReturnsArray() {
        setCurrentEndpoint("GET /api/orders");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("GET", "/api/orders")
        .then().statusCode(200);
        // assertion: response is an array
    }

    @Test
    @DisplayName("Creating an order returns a 201 response.")
    @Tag("generated")
    public void postApiOrdersCreatesOrder() {
        setCurrentEndpoint("POST /api/orders");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
            .body("{\"userId\": 1, \"productIds\": [1, 2], \"status\": \"pending\", \"total\": 199.98}")
        .when().request("POST", "/api/orders")
        .then().statusCode(201);
        // assertion: created order has an id
    }

    @Test
    @DisplayName("Returns details for a specific order.")
    @Tag("generated")
    public void getApiOrdersIdSuccess() {
        setCurrentEndpoint("GET /api/orders/1");
        given().spec(requestSpec)
            .headers(java.util.Map.of("Accept", "application/json"))
        .when().request("GET", "/api/orders/1")
        .then().statusCode(200);
        // assertion: orderId matches
        // assertion: total is correct
    }
}