import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Package, MapPin, LogOut, Plus, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/orderService';
import { Order } from '../types';
import { InvoiceModal } from '../components/invoice/InvoiceModal';

interface AccountPageProps {
  initialTab?: 'orders' | 'profile' | 'addresses';
}

export const AccountPage: React.FC<AccountPageProps> = ({ initialTab = 'orders' }) => {
  const { customer, isLoggedIn, logout, updateProfile, addAddress, deleteAddress } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses'>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Address modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newDistrict, setNewDistrict] = useState('Dhaka');
  const [newArea, setNewArea] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    if (customer) {
      setProfileName(customer.fullName);
      setProfilePhone(customer.phone);
      setProfileEmail(customer.email);

      // Load customer orders
      const allOrders = orderService.getStoredOrders();
      setOrders(allOrders);
    }
  }, [isLoggedIn, customer, navigate]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      fullName: profileName,
      phone: profilePhone,
      email: profileEmail,
    });
    setEditingProfile(false);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArea.trim() || !newAddress.trim()) return;

    await addAddress({
      district: newDistrict,
      area: newArea.trim(),
      fullAddress: newAddress.trim(),
      isDefault: newIsDefault,
    });

    setNewArea('');
    setNewAddress('');
    setShowAddressModal(false);
  };

  if (!customer) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Top Banner / Welcome */}
      <div className="bg-[#171717] text-[#F5F3EE] p-6 sm:p-10 border border-[#D8D4CA]/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xs">
        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8A927A]">
            Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-black uppercase text-white tracking-tight mt-1">
            Welcome, {customer.fullName}
          </h1>
          <p className="text-xs text-[#B7B2A7] mt-1 font-mono">
            {customer.email} · {customer.phone}
          </p>
        </div>

        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-white/10 hover:bg-white hover:text-[#171717] text-xs font-bold uppercase tracking-widest text-white border border-white/20 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Tabs Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="bg-white border border-[#D8D4CA] rounded-2xl p-3 space-y-1 shadow-2xs">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors text-left cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#171717] text-white shadow-2xs'
                : 'text-[#77746D] hover:bg-[#F5F3EE] hover:text-[#171717]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors text-left cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#171717] text-white shadow-2xs'
                : 'text-[#77746D] hover:bg-[#F5F3EE] hover:text-[#171717]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Information</span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors text-left cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-[#171717] text-white shadow-2xs'
                : 'text-[#77746D] hover:bg-[#F5F3EE] hover:text-[#171717]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Address Book ({customer.addresses.length})</span>
          </button>
        </div>

        {/* Tab Content (3 cols) */}
        <div className="lg:col-span-3">
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="border-b border-[#D8D4CA] pb-3 flex items-center justify-between">
                <h2 className="text-base font-display font-bold uppercase tracking-wider text-[#171717]">
                  Order History & Status
                </h2>
                <span className="text-xs text-[#77746D]">
                  Cash on Delivery (COD)
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white border border-[#D8D4CA] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
                  <Package className="w-10 h-10 text-[#B7B2A7] mx-auto" />
                  <p className="text-sm font-bold text-[#171717]">No orders placed yet</p>
                  <p className="text-xs text-[#77746D]">Your order history will appear here after your first purchase.</p>
                  <Link
                    to="/shop"
                    className="inline-block mt-2 px-8 py-3 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors shadow-2xs"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-[#D8D4CA] rounded-2xl p-5 space-y-4 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8D4CA] pb-3">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#171717]">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs text-[#77746D] ml-3">
                            {new Date(order.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#F5F3EE] text-[#171717] border border-[#D8D4CA] rounded-full">
                            {order.status}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-[#171717]">
                            ৳{order.grandTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Item thumbnails and titles */}
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-10 h-12 object-cover bg-[#F5F3EE] border border-[#D8D4CA] rounded-lg"
                              />
                              <div>
                                <p className="font-bold text-[#171717]">{item.productName}</p>
                                <p className="text-[11px] text-[#77746D]">
                                  Size: {item.size} · Qty: {item.quantity}
                                  {item.customization && ` · Custom: ${item.customization.name} #${item.customization.number}`}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold tabular-nums text-[#171717]">৳{item.totalPrice.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer actions */}
                      <div className="pt-3 border-t border-[#D8D4CA] flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                        <span className="text-[11px] text-[#77746D]">
                          Delivering to: {order.deliveryAddress.district}
                        </span>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setSelectedInvoiceOrder(order)}
                            className="font-bold text-[#8A927A] hover:text-[#171717] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>VIEW INVOICE</span>
                          </button>
                          <Link
                            to={`/track-order?orderNumber=${order.orderNumber}&phone=${order.customerPhone}`}
                            className="font-bold text-[#171717] hover:text-[#8A927A] flex items-center gap-1 transition-colors"
                          >
                            <span>Track Package</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
              <div className="border-b border-[#D8D4CA] pb-3 flex items-center justify-between">
                <h2 className="text-base font-display font-bold uppercase tracking-wider text-[#171717]">
                  Personal Profile
                </h2>
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="text-xs font-bold text-[#8A927A] hover:underline cursor-pointer"
                  >
                    Edit Details
                  </button>
                )}
              </div>

              {editingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors cursor-pointer shadow-2xs"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="px-6 py-3 rounded-full border border-[#D8D4CA] text-xs font-bold uppercase tracking-widest hover:border-[#171717] text-[#171717] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-xs max-w-md">
                  <div className="flex justify-between py-2 border-b border-[#D8D4CA]">
                    <span className="text-[#77746D]">Full Name:</span>
                    <strong className="text-[#171717]">{customer.fullName}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#D8D4CA]">
                    <span className="text-[#77746D]">Phone:</span>
                    <strong className="text-[#171717]">{customer.phone}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#D8D4CA]">
                    <span className="text-[#77746D]">Email:</span>
                    <strong className="text-[#171717]">{customer.email}</strong>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[#77746D]">Account Type:</span>
                    <strong className="text-[#8A927A]">Verified Member</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADDRESS BOOK */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="border-b border-[#D8D4CA] pb-3 flex items-center justify-between">
                <h2 className="text-base font-display font-bold uppercase tracking-wider text-[#171717]">
                  Saved Delivery Addresses
                </h2>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="px-5 py-2.5 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-5 bg-white border border-[#D8D4CA] rounded-2xl space-y-3 relative shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#171717]">
                        {addr.district} ({addr.area})
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold uppercase bg-[#F5F3EE] text-[#8A927A] px-2.5 py-0.5 border border-[#D8D4CA] rounded-full">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#77746D] leading-relaxed">
                      {addr.fullAddress}
                    </p>
                    {addr.deliveryInstructions && (
                      <p className="text-[11px] text-[#77746D] italic">
                        Note: {addr.deliveryInstructions}
                      </p>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => deleteAddress(addr.id)}
                        className="text-[11px] text-[#8B2E2E] hover:underline flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#171717]/60 backdrop-blur-xs"
            onClick={() => setShowAddressModal(false)}
          />
          <div className="relative bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 max-w-md w-full z-10 space-y-4 shadow-xl">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-[#171717]">
              Add New Address
            </h3>

            <form onSubmit={handleAddAddress} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">District</label>
                <select
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                >
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chattogram">Chattogram</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Rajshahi">Rajshahi</option>
                  <option value="Khulna">Khulna</option>
                  <option value="Barishal">Barishal</option>
                  <option value="Rangpur">Rangpur</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">Area / Thana</label>
                <input
                  type="text"
                  required
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="e.g. Uttara Sector 4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">Full Street Address</label>
                <textarea
                  rows={2}
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="House, road, flat details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddr"
                  checked={newIsDefault}
                  onChange={(e) => setNewIsDefault(e.target.checked)}
                  className="accent-[#171717]"
                />
                <label htmlFor="defaultAddr" className="text-xs text-[#77746D]">
                  Set as default shipping address
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors cursor-pointer shadow-2xs"
                >
                  Save Address
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-6 py-3 rounded-full border border-[#D8D4CA] text-xs font-bold uppercase tracking-widest hover:border-[#171717] text-[#171717] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Standalone / Modal Integrated Invoice */}
      <InvoiceModal
        order={selectedInvoiceOrder}
        isOpen={!!selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
      />
    </div>
  );
};
