import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Truck, RotateCcw, ShieldCheck, FileText, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const PoliciesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'shipping';
  const [activeTab, setActiveTab] = useState(currentTab);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const faqs = [
    {
      q: 'How does Cash on Delivery (COD) work at Eleven Nation?',
      a: 'We offer Cash on Delivery across all 64 districts in Bangladesh. You place your order without upfront digital payment. Our customer support will confirm your order details by phone/WhatsApp, after which your parcel is dispatched. You hand the payment directly to the courier rider upon delivery.'
    },
    {
      q: 'How long does shipping take in Bangladesh?',
      a: 'Orders inside Dhaka Metropolitan area are delivered within 24 to 48 hours. Orders outside Dhaka (Chittagong, Sylhet, Rajshahi, Khulna, etc.) take between 2 to 4 business days via Steadfast or Pathao courier.'
    },
    {
      q: 'Can I customize any football jersey with my own name and number?',
      a: 'Yes! On jerseys that support customization, you can choose any official squad star (e.g., Bellingham #5, Messi #10) or type your own custom surname and number (0-99). Custom heat-press printing adds ৳250 and uses official league font sets.'
    },
    {
      q: 'What is your size exchange policy?',
      a: 'If a size does not fit you perfectly, you can request an exchange within 7 days of receiving the package. The garment must be unworn with original tags attached. Note: Customized jerseys with personal names are not eligible for size exchange unless a printing error was made on our part.'
    },
    {
      q: 'What is the quality of Eleven Nation casual wear?',
      a: 'Our casual line features heavyweight combed compact cotton (260 GSM to 400 GSM). They are pre-shrunk and bio-washed, providing a premium architectural drape that does not shrink or fade after multiple washes.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="text-center space-y-2">
        <div className="w-10 h-1 bg-[#8A927A] rounded-full mx-auto mb-3" />
        <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8A927A]">
          Transparency & Assurance
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-black uppercase text-[#171717] tracking-tight">
          Customer Policies & FAQ
        </h1>
        <p className="text-xs sm:text-sm text-[#77746D] max-w-md mx-auto leading-relaxed">
          Everything you need to know about deliveries, exchanges, and terms across Bangladesh.
        </p>
      </div>

      {/* Tab Selectors (Pill Styled) */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 text-xs font-semibold uppercase tracking-wider">
        <button
          onClick={() => switchTab('shipping')}
          className={`py-2 px-4 rounded-full flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border ${
            activeTab === 'shipping'
              ? 'bg-[#171717] text-white border-[#171717] shadow-2xs'
              : 'bg-white text-[#77746D] border-[#D8D4CA] hover:border-[#171717] hover:text-[#171717]'
          }`}
        >
          <Truck className="w-4 h-4 text-[#8A927A]" />
          <span>Shipping Policy</span>
        </button>

        <button
          onClick={() => switchTab('returns')}
          className={`py-2 px-4 rounded-full flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border ${
            activeTab === 'returns'
              ? 'bg-[#171717] text-white border-[#171717] shadow-2xs'
              : 'bg-white text-[#77746D] border-[#D8D4CA] hover:border-[#171717] hover:text-[#171717]'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-[#8A927A]" />
          <span>Return & Exchange</span>
        </button>

        <button
          onClick={() => switchTab('faq')}
          className={`py-2 px-4 rounded-full flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border ${
            activeTab === 'faq'
              ? 'bg-[#171717] text-white border-[#171717] shadow-2xs'
              : 'bg-white text-[#77746D] border-[#D8D4CA] hover:border-[#171717] hover:text-[#171717]'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-[#8A927A]" />
          <span>Frequently Asked</span>
        </button>

        <button
          onClick={() => switchTab('privacy')}
          className={`py-2 px-4 rounded-full flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border ${
            activeTab === 'privacy'
              ? 'bg-[#171717] text-white border-[#171717] shadow-2xs'
              : 'bg-white text-[#77746D] border-[#D8D4CA] hover:border-[#171717] hover:text-[#171717]'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#8A927A]" />
          <span>Privacy Policy</span>
        </button>

        <button
          onClick={() => switchTab('terms')}
          className={`py-2 px-4 rounded-full flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border ${
            activeTab === 'terms'
              ? 'bg-[#171717] text-white border-[#171717] shadow-2xs'
              : 'bg-white text-[#77746D] border-[#D8D4CA] hover:border-[#171717] hover:text-[#171717]'
          }`}
        >
          <FileText className="w-4 h-4 text-[#8A927A]" />
          <span>Terms & Conditions</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-10 shadow-2xs">
        {/* SHIPPING */}
        {activeTab === 'shipping' && (
          <div className="space-y-6 text-sm text-[#77746D] leading-relaxed">
            <h2 className="text-xl font-display font-bold uppercase text-[#171717]">
              Nationwide Shipping Policy
            </h2>
            <p>
              ELEVEN NATION ships to every postal division across Bangladesh through authorized courier partners (Steadfast Courier and Pathao Logistics).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-[#F5F3EE] border border-[#D8D4CA] rounded-xl">
                <h3 className="font-bold text-[#171717] text-sm">Inside Dhaka Metropolitan Area</h3>
                <p className="text-xs text-[#77746D] mt-1">Delivery Fee: ৳70</p>
                <p className="text-xs text-[#77746D]">Transit Time: 24 to 48 hours</p>
              </div>
              <div className="p-4 bg-[#F5F3EE] border border-[#D8D4CA] rounded-xl">
                <h3 className="font-bold text-[#171717] text-sm">Outside Dhaka (All 63 Districts)</h3>
                <p className="text-xs text-[#77746D] mt-1">Delivery Fee: ৳130</p>
                <p className="text-xs text-[#77746D]">Transit Time: 2 to 4 business days</p>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="font-bold text-[#171717] text-sm mb-1">Free Delivery Eligibility</h3>
              <p className="text-xs">
                All domestic orders with a product subtotal equal to or exceeding <strong className="text-[#171717]">৳2,500</strong> automatically receive free shipping at checkout.
              </p>
            </div>
          </div>
        )}

        {/* RETURNS & EXCHANGES */}
        {activeTab === 'returns' && (
          <div className="space-y-6 text-sm text-[#77746D] leading-relaxed">
            <h2 className="text-xl font-display font-bold uppercase text-[#171717]">
              7-Day Return & Size Exchange Policy
            </h2>
            <p>
              Your satisfaction is paramount. If you are not satisfied with the fit or size of your casual apparel or standard football jersey, you may request an exchange within 7 days of package delivery.
            </p>

            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-[#171717] text-sm">Exchange Requirements:</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-[#77746D]">
                <li>Item must be unworn, unwashed, and free of stains, deodorant, or perfumes.</li>
                <li>All original Eleven Nation brand tags, polybagging, and inserts must remain intact.</li>
                <li>Proof of order (Order reference number or customer phone number) is required.</li>
                <li><strong className="text-[#171717]">Customized Items:</strong> Jerseys featuring personalized customer names and numbers cannot be returned or exchanged unless there is an evident manufacturing or spelling defect committed by Eleven Nation.</li>
              </ul>
            </div>
          </div>
        )}

        {/* FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold uppercase text-[#171717] mb-4">
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-[#D8D4CA] rounded-xl p-4 cursor-pointer hover:border-[#171717] transition-colors"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-bold text-[#171717]">{faq.q}</h3>
                    {openFaqIndex === index ? (
                      <ChevronUp className="w-4 h-4 text-[#8A927A] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#77746D] shrink-0" />
                    )}
                  </div>
                  {openFaqIndex === index && (
                    <p className="text-xs text-[#77746D] mt-3 pt-3 border-t border-[#D8D4CA] leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRIVACY */}
        {activeTab === 'privacy' && (
          <div className="space-y-4 text-xs text-[#77746D] leading-relaxed">
            <h2 className="text-xl font-display font-bold uppercase text-[#171717]">
              Privacy & Data Policy
            </h2>
            <p>
              ELEVEN NATION (elevennation.shop) respects customer privacy. We collect customer names, shipping addresses, phone numbers, and optional email addresses solely for the purpose of order processing, telephone verification, courier consignment dispatch, and customer service communication.
            </p>
            <p>
              We do not sell, rent, or trade your personal information to third-party marketing companies. Sensitive delivery details are transferred solely to authorized logistics partners to facilitate doorstep parcel delivery in Bangladesh.
            </p>
          </div>
        )}

        {/* TERMS */}
        {activeTab === 'terms' && (
          <div className="space-y-4 text-xs text-[#77746D] leading-relaxed">
            <h2 className="text-xl font-display font-bold uppercase text-[#171717]">
              Terms of Service
            </h2>
            <p>
              By accessing elevennation.shop and placing orders through our store, you confirm that you are at least 18 years of age or possess guardian permission.
            </p>
            <p>
              <strong className="text-[#171717]">Cash on Delivery Agreement:</strong> Placing an order via Cash on Delivery signifies an affirmative commitment to receive and settle the parcel value upon delivery. Refusing parcels without valid defect cause incurs logistics costs and may restrict future Cash on Delivery privileges.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
