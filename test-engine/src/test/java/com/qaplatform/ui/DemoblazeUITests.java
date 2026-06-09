package com.qaplatform.ui;

import com.qaplatform.ui.pages.CheckoutPage;
import com.qaplatform.ui.pages.DashboardPage;
import com.qaplatform.ui.pages.LoginPage;
import com.qaplatform.ui.pages.ProductPage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("ui")
public class DemoblazeUITests extends UITestBase {
    private LoginPage loginPage;
    private DashboardPage dashboardPage;
    private ProductPage productPage;
    private CheckoutPage checkoutPage;

    @BeforeEach
    void initPages() {
        loginPage = new LoginPage(driver);
        dashboardPage = new DashboardPage(driver);
        productPage = new ProductPage(driver);
        checkoutPage = new CheckoutPage(driver);
        loginPage.navigate();
    }

    @Test
    void homePageLoadsAndHasProducts() {
        assertTrue(loginPage.isLoaded());
        assertTrue(dashboardPage.isLoaded());
        assertTrue(dashboardPage.hasProducts());
    }

    @Test
    void clickProductAndVerifyDetailPage() {
        dashboardPage.openProductByName("Samsung galaxy s6");
        assertTrue(productPage.isLoaded());
        assertEquals("Samsung galaxy s6", productPage.getProductTitle());
    }

    @Test
    void addProductToCartAndVerifyCart() {
        dashboardPage.openProductByName("Samsung galaxy s6");
        productPage.addToCartByName("Samsung galaxy s6");
        checkoutPage.goToCart();
        assertEquals(1, checkoutPage.getCartItemCount());
    }

    @Test
    void navigateToCartAndVerifyNotEmptyAfterAdding() {
        dashboardPage.openProductByName("Samsung galaxy s6");
        productPage.addToCartByName("Samsung galaxy s6");
        checkoutPage.goToCart();
        assertTrue(checkoutPage.isCartNotEmpty());
    }
}