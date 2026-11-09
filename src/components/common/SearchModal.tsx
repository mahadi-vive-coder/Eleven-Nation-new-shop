import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, Tag } from 'lucide-react';
import { Product } from '../../types';
import { productService } from '../../services/productService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const quickPicks = [
    'Real Madrid',
    'Oversized Tee',
    'Argentina',
    'Retro Kits',
    'French Terry',
    'Barcelona',
    'Cuban Shirt',
  ];

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Handle keyboard shortcut Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Perform search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const matches = await productService.getProducts({ searchQuery: query });
      setResults(matches);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onClose();
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectQuickPick = (term: string) => {
    setQuery(term);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative mx-auto max-w-2xl bg-white shadow-2xl rounded-2xl border border-[#D8D4CA] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center border-b border-[#D8D4CA] px-4 py-3 sm:py-4">
          <Search className="w-5 h-5 text-[#77746D] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product, team, player, GSM weight (e.g. Real Madrid, 260 GSM)..."
            className="w-full pl-3 pr-10 py-1 text-sm sm:text-base text-[#171717] placeholder-[#77746D] focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[#77746D] hover:text-[#171717] rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] text-[#77746D] hover:text-[#171717] border border-[#D8D4CA] px-2 py-0.5 rounded-full font-mono cursor-pointer"
            >
              ESC
            </button>
          )}
        </form>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-3 bg-[#F5F3EE] border-b border-[#D8D4CA] flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[#77746D] font-semibold uppercase tracking-[0.18em] text-[10px] shrink-0 flex items-center gap-1">
            <Tag className="w-3 h-3 text-[#8A927A]" />
            Trending:
          </span>
          {quickPicks.map((pick) => (
            <button
              key={pick}
              type="button"
              onClick={() => handleSelectQuickPick(pick)}
              className="px-3 py-1 bg-white border border-[#D8D4CA] hover:border-[#171717] text-[#171717] rounded-full whitespace-nowrap transition-colors cursor-pointer text-xs font-medium shadow-2xs"
            >
              {pick}
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading && (
            <div className="py-10 text-center text-xs text-[#77746D]">
              Searching Eleven Nation collection...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#171717] font-brand">No products found for "{query}"</p>
              <p className="text-xs text-[#77746D] max-w-sm mx-auto">
                Try searching by club or national team (e.g. Arsenal, Argentina) or casual drop (Hoodie, Oversized Tee).
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#77746D] pb-2 border-b border-[#D8D4CA]/50">
                <span>Matching Products ({results.length})</span>
                <button
                  onClick={handleSubmit}
                  className="font-medium text-[#171717] hover:text-[#8A927A] flex items-center gap-1"
                >
                  View All in Shop <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {results.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onClose();
                    navigate(`/product/${product.slug}`);
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-[#F5F3EE] transition-colors cursor-pointer border-b border-[#D8D4CA]/30 last:border-none"
                >
                  <img
                    src={product.images[0]?.url}
                    alt={product.name}
                    className="w-12 h-14 object-cover bg-[#F5F3EE] rounded-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#171717] truncate font-display">{product.name}</p>
                    <p className="text-[11px] text-[#77746D] truncate">
                      {product.jerseyDetails
                        ? `${product.jerseyDetails.teamName} · ${product.jerseyDetails.season}`
                        : product.casualDetails?.material || product.category}
                    </p>
                    <p className="text-xs font-bold text-[#171717] mt-0.5 tabular-nums">
                      ৳{product.basePrice.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#77746D] uppercase tracking-wider shrink-0 font-mono">
                    {product.sku}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!query && (
            <div className="py-6 text-center text-xs text-[#77746D]">
              Type above to search our catalog of casual wear and football kits.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
