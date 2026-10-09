"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GooeySearchProps {
  className?: string;
  placeholder?: string;
  data?: string[];
  onSelect?: (item: string) => void;
  debounceMs?: number;
}

const DEFAULT_DATA: string[] = [
  "NVIDIA GeForce RTX 4090",
  "NVIDIA GeForce RTX 4070 Super",
  "AMD Ryzen 7 7800X3D",
  "AMD Ryzen 5 7600",
  "Intel Core i9-14900K",
  "Intel Core i5-14600K",
  "Crucial Pro 32GB DDR5-6000",
  "Corsair Vengeance 32GB DDR5",
  "Kingston KC3000 2TB PCIe 4.0 NVMe",
  "Samsung 990 Pro 2TB NVMe",
  "Corsair RM850x 850W Gold PSU",
  "MSI MAG B650 Tomahawk WiFi",
  "ASUS ROG Strix B650-A Gaming",
  "Lian Li O11 Dynamic EVO",
  "NZXT H5 Flow RGB",
  "Thermalright Peerless Assassin 120",
];

const buttonVariants = {
  initial: { x: 0, width: 100 },
  step1: { x: 0, width: 100 },
  step2: { x: -24, width: 220 },
};

const iconVariants = {
  hidden: { x: -44, opacity: 0, scale: 0.6 },
  visible: { x: 12, opacity: 1, scale: 1 },
};

const getResultItemVariants = (index: number, isUnsupported: boolean) => ({
  initial: {
    y: 0,
    scale: 0.3,
    filter: isUnsupported ? "none" : "blur(10px)",
  },
  animate: {
    y: (index + 1) * 46,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: {
    y: isUnsupported ? 0 : -4,
    scale: 0.8,
    color: "#000000",
  },
});

const getResultItemTransition = (index: number) => ({
  duration: 0.65,
  delay: index * 0.08,
  type: "spring" as const,
  bounce: 0.35,
  exit: { duration: index * 0.08 },
  filter: { ease: "easeInOut" },
});

export const GooeyFilter: React.FC = () => (
  <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
    <defs>
      <filter id="goo-effect">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -15"
          result="goo"
        />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  </svg>
);

export function GooeySearch({
  className,
  placeholder = "Type to search...",
  data = DEFAULT_DATA,
  onSelect,
  debounceMs = 350,
}: GooeySearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [searchText, setSearchText] = useState("");
  const [searchData, setSearchData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isUnsupported = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const isSafari =
      ua.includes("safari") &&
      !ua.includes("chrome") &&
      !ua.includes("chromium") &&
      !ua.includes("android") &&
      !ua.includes("firefox");
    const isChromeOniOS = ua.includes("crios");
    return isSafari || isChromeOniOS;
  }, []);

  const handleButtonClick = () => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // Close on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setStep(1);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step === 2) {
        setStep(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step]);

  useEffect(() => {
    if (step === 2) {
      inputRef.current?.focus();
    } else {
      setSearchText("");
      setSearchData([]);
      setIsLoading(false);
    }
  }, [step]);

  // Debounced search
  useEffect(() => {
    let isCancelled = false;
    const trimmed = searchText.trim().toLowerCase();

    if (trimmed) {
      setIsLoading(true);
      const timer = window.setTimeout(() => {
        const matches = data.filter((item) =>
          item.toLowerCase().includes(trimmed)
        );
        if (!isCancelled) {
          setSearchData(matches.slice(0, 5));
          setIsLoading(false);
        }
      }, debounceMs);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    } else {
      setSearchData([]);
      setIsLoading(false);
    }
  }, [searchText, data, debounceMs]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "gooey-search-wrapper relative inline-flex items-center justify-center select-none",
        isUnsupported && "no-goo",
        className
      )}
    >
      <GooeyFilter />

      <div className="gooey-button-content relative flex items-center justify-center">
        <motion.div
          className="gooey-button-content-inner relative flex items-center"
          style={{ filter: isUnsupported ? "none" : "url(#goo-effect)" }}
          initial="initial"
          animate={step === 1 ? "step1" : "step2"}
          transition={{ duration: 0.65, type: "spring", bounce: 0.15 }}
        >
          <AnimatePresence mode="popLayout">
            {searchData.length > 0 && (
              <motion.div
                key="gooey-search-results"
                className="gooey-search-results absolute left-0 top-0 w-full pointer-events-auto"
                style={{ zIndex: -1 }}
                role="listbox"
                aria-label="Search results"
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  delay: isUnsupported ? 0.3 : 0.8,
                  duration: 0.4,
                }}
              >
                <AnimatePresence mode="popLayout">
                  {searchData.map((item, index) => (
                    <motion.div
                      key={item}
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                      variants={getResultItemVariants(index, isUnsupported)}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={getResultItemTransition(index)}
                      className="gooey-search-result absolute bg-black text-gray-200 rounded-full px-4 py-2 cursor-pointer text-xs flex items-center gap-2 whitespace-nowrap shadow-lg hover:bg-neutral-900 transition-colors"
                      style={{ left: -24, minWidth: 220 }}
                      role="option"
                      onClick={() => {
                        onSelect?.(item);
                        setSearchText(item);
                        setSearchData([]);
                      }}
                    >
                      <svg
                        className="w-3.5 h-3.5 text-gray-400 shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.08 + 0.2 }}
                        className="truncate"
                      >
                        {item}
                      </motion.span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={buttonVariants}
            onClick={handleButtonClick}
            whileHover={{ scale: step === 2 ? 1 : 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="gooey-search-btn bg-black text-gray-200 rounded-full h-10 px-4 flex items-center justify-center cursor-pointer shadow-md select-none outline-none overflow-hidden"
            role="button"
          >
            {step === 1 ? (
              <span className="gooey-search-text text-xs font-medium tracking-wide">Search</span>
            ) : (
              <input
                ref={inputRef}
                type="text"
                className="gooey-search-input w-full bg-transparent outline-none border-none text-gray-100 text-xs placeholder:text-gray-400"
                placeholder={placeholder}
                value={searchText}
                aria-label="Search input"
                onChange={handleSearchChange}
              />
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {step === 2 && (
              <motion.div
                key="gooey-icon"
                className="gooey-separate-element absolute right-0 bg-black w-10 h-10 rounded-full flex items-center justify-center shadow-md cursor-pointer"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={iconVariants}
                transition={{
                  delay: 0.08,
                  duration: 0.65,
                  type: "spring",
                  bounce: 0.2,
                }}
                onClick={() => {
                  if (searchText) {
                    onSelect?.(searchText);
                  }
                }}
              >
                {!isLoading ? (
                  <svg
                    className="w-4 h-4 text-gray-200"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-gray-200 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default GooeySearch;

