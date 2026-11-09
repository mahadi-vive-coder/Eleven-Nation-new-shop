import React, { useState } from 'react';
import { X, Ruler } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'casual' | 'jerseys';
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'casual',
}) => {
  const [activeTab, setActiveTab] = useState<'casual' | 'jerseys'>(defaultCategory);
  const [unit, setUnit] = useState<'inches' | 'cm'>('inches');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-10 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white shadow-2xl border border-[#D8D4CA] rounded-2xl z-10 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D8D4CA] flex items-center justify-between bg-[#171717] text-white">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#8A927A]" />
            <h3 className="text-base font-display font-bold uppercase tracking-wider">
              ELEVEN NATION Sizing Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#B7B2A7] hover:text-white transition-colors cursor-pointer rounded-full"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Unit Selector */}
        <div className="px-5 py-3 bg-[#F5F3EE] border-b border-[#D8D4CA] flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('casual')}
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] rounded-full transition-colors cursor-pointer ${
                activeTab === 'casual'
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'bg-white text-[#77746D] border border-[#D8D4CA] hover:border-[#171717]'
              }`}
            >
              Casual & Oversized
            </button>
            <button
              onClick={() => setActiveTab('jerseys')}
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] rounded-full transition-colors cursor-pointer ${
                activeTab === 'jerseys'
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'bg-white text-[#77746D] border border-[#D8D4CA] hover:border-[#171717]'
              }`}
            >
              Football Jerseys
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-[#D8D4CA] rounded-full p-1 text-xs">
            <button
              onClick={() => setUnit('inches')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                unit === 'inches' ? 'bg-[#171717] text-white' : 'text-[#77746D]'
              }`}
            >
              Inches
            </button>
            <button
              onClick={() => setUnit('cm')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                unit === 'cm' ? 'bg-[#171717] text-white' : 'text-[#77746D]'
              }`}
            >
              CM
            </button>
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-5 overflow-x-auto">
          {activeTab === 'casual' ? (
            <div>
              <p className="text-xs text-[#77746D] mb-3 leading-relaxed">
                * Our casual t-shirts and hoodies are tailored with an engineered dropped-shoulder silhouette. Choose your normal size for an intended relaxed street fit, or size down for a standard regular fit.
              </p>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#171717] text-[#171717] uppercase tracking-[0.16em] font-bold">
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Chest ({unit})</th>
                    <th className="py-2.5 px-3">Length ({unit})</th>
                    <th className="py-2.5 px-3">Shoulder ({unit})</th>
                    <th className="py-2.5 px-3">Weight Fit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D4CA] tabular-nums">
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">S</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '40"' : '101 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '27"' : '68 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '20"' : '51 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">50 – 62 kg</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">M</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '42"' : '106 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '28"' : '71 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '21"' : '53 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">63 – 72 kg</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">L</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '44"' : '112 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '29"' : '74 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '22"' : '56 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">73 – 82 kg</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">XL</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '46"' : '117 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '30"' : '76 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '23"' : '58 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">83 – 92 kg</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">XXL</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '48"' : '122 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '31"' : '79 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '24"' : '61 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">93 – 105 kg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <p className="text-xs text-[#77746D] mb-3 leading-relaxed">
                * <strong>Fan Edition:</strong> Standard comfortable stadium fit. <br />
                * <strong>Player Edition:</strong> Athletic contoured slim fit. We recommend sizing up 1 size if you prefer a looser feel.
              </p>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#171717] text-[#171717] uppercase tracking-[0.16em] font-bold">
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Chest ({unit})</th>
                    <th className="py-2.5 px-3">Length ({unit})</th>
                    <th className="py-2.5 px-3">Player Ed. Chest</th>
                    <th className="py-2.5 px-3">Height Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D4CA] tabular-nums">
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">S</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '38"' : '96 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '27"' : '68 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '36"' : '91 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">5'4" – 5'7"</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">M</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '40"' : '101 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '28"' : '71 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '38"' : '96 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">5'7" – 5'10"</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">L</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '42"' : '106 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '29"' : '74 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '40"' : '101 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">5'10" – 6'0"</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">XL</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '44"' : '112 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '30"' : '76 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '42"' : '106 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">6'0" – 6'2"</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-[#171717]">XXL</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '46"' : '117 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '31"' : '79 cm'}</td>
                    <td className="py-2 px-3">{unit === 'inches' ? '44"' : '112 cm'}</td>
                    <td className="py-2 px-3 text-[#77746D]">6'2"+</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="p-4 bg-[#F5F3EE] border-t border-[#D8D4CA] text-center text-xs text-[#77746D]">
          Still unsure about sizing? Message our customer support on WhatsApp for quick advice before ordering.
        </div>
      </div>
    </div>
  );
};
