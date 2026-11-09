import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('Order & Delivery Status');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !message) return;
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-10 h-1 bg-[#8A927A] rounded-full mx-auto mb-3" />
        <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8A927A]">
          Client Support
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-black uppercase text-[#171717] tracking-tight">
          Contact Eleven Nation
        </h1>
        <p className="text-xs sm:text-sm text-[#77746D] max-w-md mx-auto leading-relaxed">
          Need assistance with jersey printing, size advice, or delivery tracking? Our Dhaka customer desk is ready to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Information Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xs">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-3">
              Direct Contact Channels
            </h2>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-[#F5F3EE] text-[#171717] border border-[#D8D4CA] rounded-full">
                  <Phone className="w-4 h-4 text-[#8A927A]" />
                </div>
                <div>
                  <strong className="block font-bold text-[#171717]">Phone & WhatsApp Desk</strong>
                  <p className="text-[#77746D]">+880 1712-345678</p>
                  <p className="text-[11px] text-[#77746D]">Available Saturday – Thursday, 10:00 AM – 8:00 PM</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-[#F5F3EE] text-[#171717] border border-[#D8D4CA] rounded-full">
                  <Mail className="w-4 h-4 text-[#8A927A]" />
                </div>
                <div>
                  <strong className="block font-bold text-[#171717]">Email Inquiries</strong>
                  <p className="text-[#77746D]">support@elevennation.shop</p>
                  <p className="text-[11px] text-[#77746D]">Official website: elevennation.shop</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-[#F5F3EE] text-[#171717] border border-[#D8D4CA] rounded-full">
                  <MapPin className="w-4 h-4 text-[#8A927A]" />
                </div>
                <div>
                  <strong className="block font-bold text-[#171717]">Studio & Dispatch Hub</strong>
                  <p className="text-[#77746D]">House 12, Road 4, Banani, Dhaka-1213, Bangladesh</p>
                  <p className="text-[11px] text-[#77746D]">Courier central fulfillment</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-[#F5F3EE] text-[#171717] border border-[#D8D4CA] rounded-full">
                  <Clock className="w-4 h-4 text-[#8A927A]" />
                </div>
                <div>
                  <strong className="block font-bold text-[#171717]">Response Velocity</strong>
                  <p className="text-[#77746D]">WhatsApp: 15–30 minutes</p>
                  <p className="text-[11px] text-[#77746D]">Email tickets: Within 2–4 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Inquiry Form (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-3">
            Send an Inquiry
          </h2>

          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 bg-[#42634B]/10 text-[#42634B] rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-bold text-[#171717]">Message Received</h3>
              <p className="text-xs text-[#77746D] max-w-sm mx-auto leading-relaxed">
                Thank you for contacting Eleven Nation. A client advisor will review your inquiry and follow up via WhatsApp/phone shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors cursor-pointer shadow-2xs"
              >
                Send Another Note
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                    Phone Number (BD) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                    Inquiry Topic
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717] font-semibold text-[#171717] cursor-pointer"
                  >
                    <option value="Order & Delivery Status">Order & Delivery Status</option>
                    <option value="Jersey Name & Number Customization">Jersey Customization</option>
                    <option value="Size Consultation">Size Consultation</option>
                    <option value="Size Exchange Request">Size Exchange Request</option>
                    <option value="Bulk / Team Orders">Bulk / Team Orders</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
                  Your Message *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we assist you with Eleven Nation products or services?"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-full bg-[#171717] text-[#F5F3EE] font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
