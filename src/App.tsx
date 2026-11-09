import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';

import { TopAnnouncementBar } from './components/layout/TopAnnouncementBar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/common/CartDrawer';
import { SearchModal } from './components/common/SearchModal';
import { ScrollToTop } from './components/common/ScrollToTop';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { InvoicePage } from './pages/InvoicePage';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AppLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const isInvoice = location.pathname.startsWith('/invoice');

  return (
    <div className={`min-h-screen flex flex-col ${isInvoice ? 'bg-[#EDE8DE]' : 'bg-[#F5F3EE]'} text-[#171717] font-sans antialiased`}>
      {/* Top Announcement Ribbon */}
      {!isInvoice && <TopAnnouncementBar />}

      {/* Main Responsive Header */}
      {!isInvoice && <Header onOpenSearch={() => setIsSearchOpen(true)} />}

      {/* All Customer Website Page Routes */}
      <main className="flex-1">
        <Routes>
                  {/* 1. Homepage */}
                  <Route path="/" element={<HomePage />} />

                  {/* 2. Shop / All Products */}
                  <Route path="/shop" element={<ShopPage />} />

                  {/* 3. Product Details */}
                  <Route path="/product/:slug" element={<ProductDetailPage />} />

                  {/* 4. Casual Clothing */}
                  <Route
                    path="/casual-clothing"
                    element={
                      <ShopPage
                        presetCategory="casual"
                        pageTitle="CASUAL CLOTHING COLLECTION"
                      />
                    }
                  />
                  <Route
                    path="/shop/casual-clothing"
                    element={
                      <ShopPage
                        presetCategory="casual"
                        pageTitle="CASUAL CLOTHING COLLECTION"
                      />
                    }
                  />

                  {/* 5. Football Jerseys */}
                  <Route
                    path="/football-jerseys"
                    element={
                      <ShopPage
                        presetCategory="jerseys"
                        pageTitle="FOOTBALL JERSEYS & KITS"
                      />
                    }
                  />
                  <Route
                    path="/shop/football-jerseys"
                    element={
                      <ShopPage
                        presetCategory="jerseys"
                        pageTitle="FOOTBALL JERSEYS & KITS"
                      />
                    }
                  />

                  {/* 6. New Arrivals */}
                  <Route
                    path="/new-arrivals"
                    element={
                      <ShopPage
                        presetFilter="new"
                        pageTitle="NEW ARRIVALS — LATEST DROPS"
                      />
                    }
                  />

                  {/* 7. Featured Collections */}
                  <Route
                    path="/featured"
                    element={
                      <ShopPage
                        presetFilter="bestsellers"
                        pageTitle="FEATURED BEST SELLERS"
                      />
                    }
                  />

                  {/* 8. Shopping Cart */}
                  <Route path="/cart" element={<CartPage />} />

                  {/* 9. Checkout */}
                  <Route path="/checkout" element={<CheckoutPage />} />

                  {/* 10. Order Confirmation */}
                  <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />

                  {/* Official Order Invoice */}
                  <Route path="/invoice/:orderNumber" element={<InvoicePage />} />

                  {/* 11. Customer Login */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* 12. Customer Registration */}
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                  {/* 13. Customer Profile */}
                  <Route path="/profile" element={<AccountPage initialTab="profile" />} />
                  <Route path="/account" element={<AccountPage initialTab="orders" />} />

                  {/* 14. Customer Order History */}
                  <Route path="/orders" element={<AccountPage initialTab="orders" />} />

                  {/* 15. Track Order */}
                  <Route path="/track-order" element={<OrderTrackingPage />} />

                  {/* 16. About Us */}
                  <Route path="/about" element={<AboutPage />} />

                  {/* 17. Contact Us */}
                  <Route path="/contact" element={<ContactPage />} />

                  {/* 18. FAQ */}
                  <Route path="/faq" element={<PoliciesPage />} />

                  {/* 19. Shipping Policy */}
                  <Route path="/shipping-policy" element={<PoliciesPage />} />

                  {/* 20. Return and Refund Policy */}
                  <Route path="/returns-policy" element={<PoliciesPage />} />
                  <Route path="/refund-policy" element={<PoliciesPage />} />

                  {/* 21. Privacy Policy */}
                  <Route path="/privacy-policy" element={<PoliciesPage />} />

                  {/* 22. Terms and Conditions */}
                  <Route path="/terms" element={<PoliciesPage />} />

                  {/* Legacy deep-linked policies tab */}
                  <Route path="/policies" element={<PoliciesPage />} />

                  {/* 23. 404 Not Found */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>

              {/* Shopping Bag Slide-Over Drawer */}
              {!isInvoice && <CartDrawer />}

              {/* Global Search Overlay Modal */}
              {!isInvoice && <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}

              {/* Brand Footer */}
              {!isInvoice && <Footer />}
            </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <ScrollToTop />
            <AppLayout />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

